import { createClient } from '@libsql/client';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import { OAuth2Client } from 'google-auth-library';
import helmet from 'helmet';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { Resend } from 'resend';
import { csrf } from 'lusca';

// --- Turso (libSQL) client --------------------------------------------------
let tursoUrlSource = null;
let tursoAuthSource = null;
let tursoUrlRaw = null;
if (process.env.TURSO_DATABASE_URL) { tursoUrlRaw = process.env.TURSO_DATABASE_URL; tursoUrlSource = 'TURSO_DATABASE_URL'; }
else if (process.env.DATABASE_URL) { tursoUrlRaw = process.env.DATABASE_URL; tursoUrlSource = 'DATABASE_URL'; }
let tursoAuth = null;
if (process.env.TURSO_DB_AUTH_TOKEN) { tursoAuth = process.env.TURSO_DB_AUTH_TOKEN; tursoAuthSource = 'TURSO_DB_AUTH_TOKEN'; }
else if (process.env.TURSO_AUTH_TOKEN) { tursoAuth = process.env.TURSO_AUTH_TOKEN; tursoAuthSource = 'TURSO_AUTH_TOKEN'; }
else if (process.env.LIBSQL_AUTH_TOKEN) { tursoAuth = process.env.LIBSQL_AUTH_TOKEN; tursoAuthSource = 'LIBSQL_AUTH_TOKEN'; }
let tursoUrl = tursoUrlRaw;
// Be tolerant: if https://<host>.turso.io is provided, switch to libsql://<host>
try {
  if (tursoUrl && tursoUrl.startsWith('https://')) {
    const u = new URL(tursoUrl);
    if (u.hostname && u.hostname.endsWith('.turso.io')) {
      const coerced = `libsql://${u.hostname}`;
      console.warn(`[turso] Coercing TURSO_DATABASE_URL scheme to libsql:// -> ${coerced}`);
      tursoUrl = coerced;
    }
  }
} catch {}
let db = null;
let lastDbError = null;
const skipSchemaInit = process.env.SKIP_SCHEMA_INIT === '1';
const degradeToMemory = process.env.DEGRADE_TO_MEMORY === '1';
const resendApiKey = (process.env.RESEND_API_KEY || '').trim();
const resendFromEmail = (process.env.RESEND_FROM_EMAIL || process.env.RESEND_FROM || '').trim();
const resendReplyTo = (process.env.RESEND_REPLY_TO || '').trim();
const sessionReminderSecret = (process.env.CRON_REMINDER_SECRET || '').trim();
const sessionReminderTimeZone = (process.env.SESSION_REMINDER_TIMEZONE || 'Asia/Tokyo').trim();
const reminderLeadHoursRaw = (process.env.SESSION_REMINDER_LEAD_HOURS || '').trim();
const sessionReminderOverrideTo = (process.env.SESSION_REMINDER_OVERRIDE_TO || '').split(',').map(v => v.trim()).filter(Boolean);
const sessionReminderSiteUrl = (process.env.SESSION_REMINDER_SITE_URL || '').trim();
let sessionReminderLeadHours = 24;
if (reminderLeadHoursRaw) {
  const parsed = Number.parseInt(reminderLeadHoursRaw, 10);
  if (Number.isFinite(parsed) && parsed > 0) {
    sessionReminderLeadHours = parsed;
  }
}
let resendClient = null;
let resendInitError = null;
let cronSecretWarningLogged = false;
if (resendApiKey) {
  try {
    resendClient = new Resend(resendApiKey);
  } catch (e) {
    resendInitError = e?.message || String(e);
    console.error('Resend initialization failed', resendInitError);
  }
}
// Temporary safety net (opt-in): updates API only
const memUpdates = degradeToMemory ? [] : null;
const memUpdateVotes = degradeToMemory ? new Map() : null;
if (tursoUrl && tursoAuth) {
  db = createClient({ url: tursoUrl, authToken: tursoAuth });
}
let dbDisabledLogged = false; // suppress repetitive fallback logs

// One-time schema initializer wrapper
async function initDbOnce() {
  if (!db && tursoUrl && tursoAuth) {
    db = createClient({ url: tursoUrl, authToken: tursoAuth });
  }
  if (!db || global.__SCHEMA_DONE__ || skipSchemaInit) return;
  await ensureSchema();
}

async function ensureSchema() {
  if (!db) return; // no-op
  if (global.__SCHEMA_DONE__) return;
  try {
    await db.execute(`CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE,
      first_name TEXT,
      last_name TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );`);
    await db.execute(`CREATE TABLE IF NOT EXISTS updates (
      id TEXT PRIMARY KEY,
      by_name TEXT NOT NULL,
      category INTEGER NOT NULL,
      priority INTEGER NOT NULL,
      uid TEXT NOT NULL,
      title TEXT,
      body TEXT NOT NULL,
      when_value INTEGER NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (uid) REFERENCES users(id)
    );`);
    await db.execute(`CREATE TABLE IF NOT EXISTS update_votes (
      id TEXT PRIMARY KEY,
      update_id TEXT NOT NULL,
      uid TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE (update_id, uid),
      FOREIGN KEY (update_id) REFERENCES updates(id) ON DELETE CASCADE,
      FOREIGN KEY (uid) REFERENCES users(id)
    );`);
    await db.execute('CREATE INDEX IF NOT EXISTS idx_update_votes_update ON update_votes(update_id);');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_update_votes_uid ON update_votes(uid);');
    await db.execute(`CREATE TABLE IF NOT EXISTS next_session (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      start_at TEXT,
      end_at TEXT,
      location TEXT,
      updated_at TEXT DEFAULT (datetime('now')),
      reminder_sent_at TEXT
    );`);
    try {
      const info = await db.execute('PRAGMA table_info(next_session)');
      const hasReminderColumn = info.rows?.some?.(row => (row.name || row.column_name || '').toLowerCase?.() === 'reminder_sent_at');
      if (!hasReminderColumn) {
        await db.execute('ALTER TABLE next_session ADD COLUMN reminder_sent_at TEXT');
      }
    } catch (e) {
      const message = e?.message || '';
      if (!message.includes('duplicate column name')) {
        console.error('next_session reminder_sent_at migration failed', message);
      }
    }
    global.__SCHEMA_DONE__ = true;
  } catch (e) {
    const msg = e?.message || '';
    lastDbError = msg;
    // Known libSQL migration polling issue: "Unexpected status code while fetching migration jobs: 400"
    // In this specific case, avoid fully disabling DB. Log once and allow subsequent queries to proceed,
    // because the error may occur only during initial implicit migration check on remote endpoints.
    if (msg.includes('Unexpected status code while fetching migration jobs: 400')) {
      if (!dbDisabledLogged) {
        console.error('ensureSchema warning (migration jobs 400) – continuing with DB enabled');
        dbDisabledLogged = true;
      }
      return; // keep db reference
    }
    if (!dbDisabledLogged) {
      console.error('ensureSchema failed; disabling db', { message: e?.message, stack: e?.stack });
      dbDisabledLogged = true;
    }
    clearDbReference();
  }
}

// Memory fallback was removed to simplify behavior. All data operations require DB.

// --- Turso schema compatibility helpers ------------------------------------
const USER_TABLE_CANDIDATES = [
  { table: 'users', first: 'first_name', last: 'last_name', updated: 'updated_at' },
  { table: 'users', first: 'firstName', last: 'lastName', updated: 'updatedAt' },
];

let userTableConfig = undefined; // undefined => not resolved yet, null => no compatible table found
let userTableConfigPromise = null;

function resetUserTableConfig() {
  userTableConfig = undefined;
  userTableConfigPromise = null;
}

async function resolveUserTableConfig() {
  if (!db) return null;
  if (userTableConfig !== undefined) return userTableConfig;
  if (userTableConfigPromise) return userTableConfigPromise;

  userTableConfigPromise = (async () => {
    await initDbOnce();
    if (!db) return null;
    let fallbackCandidate = null;
    for (const candidate of USER_TABLE_CANDIDATES) {
      try {
        const result = await db.execute({ sql: `SELECT ${candidate.first}, ${candidate.last} FROM ${candidate.table} LIMIT 1` });
        if (result?.rows?.length) {
          userTableConfig = candidate;
          return candidate;
        }
        if (!fallbackCandidate) fallbackCandidate = candidate;
      } catch (e) {
        const message = `${e?.message || ''}`.toLowerCase();
        if (message.includes('no such table') || message.includes('no such column')) {
          continue;
        }
        console.error('resolveUserTableConfig unexpected error', e?.message || e);
      }
    }
    if (fallbackCandidate) {
      userTableConfig = fallbackCandidate;
      return fallbackCandidate;
    }
    userTableConfig = null;
    return null;
  })()
    .finally(() => {
      userTableConfigPromise = null;
    });

  return userTableConfigPromise;
}

function getUserColumn(schema, key, fallback) {
  if (!schema) return fallback;
  return schema[key] || fallback;
}

function clearDbReference() {
  db = null;
  resetUserTableConfig();
}

async function syncUpdateBadgesWithFirstName(uid, firstName, emailCandidates = []) {
  if (!db || !uid || !firstName) return;
  try {
    await initDbOnce();
    if (!db) return;
    await db.execute({ sql: 'UPDATE updates SET by_name = ?1 WHERE uid = ?2', args: [firstName, uid] });
    const lowerEmails = Array.from(new Set((emailCandidates || []).map(v => (typeof v === 'string' ? v.toLowerCase() : '')).filter(Boolean)));
    for (const emailLower of lowerEmails) {
      await db.execute({ sql: 'UPDATE updates SET by_name = ?1 WHERE lower(by_name) = ?2', args: [firstName, emailLower] });
    }
  } catch (e) {
    if (!dbDisabledLogged) console.error('syncUpdateBadgesWithFirstName failed', e?.message || e);
    clearDbReference();
  }
}

// --- Google ID token verifier ----------------------------------------------
const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClient = googleClientId ? new OAuth2Client(googleClientId) : null;

// Normalize Gmail addresses: remove dots and +suffix in local part; unify domain to gmail.com
function normalizeGmail(email) {
  if (!email) return email;
  const lower = String(email).toLowerCase();
  const m = lower.match(/^([^@]+)@(gmail\.com|googlemail\.com)$/);
  if (!m) return lower;
  let local = m[1];
  local = local.replace(/\./g, ''); // remove dots
  local = local.replace(/\+.*/, ''); // drop +suffix
  return `${local}@gmail.com`;
}

function sanitizeName(value) {
  if (!value) return '';
  return String(value).trim().replace(/\s+/g, ' ').slice(0, 40);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDateTimeForDisplay(value, timeZone, locale = 'ja-JP') {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  try {
    return new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeStyle: 'short', timeZone }).format(date);
  } catch (e) {
    return date.toISOString();
  }
}

function formatDateTimeForSubject(value, timeZone) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  try {
    return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone, timeZoneName: 'short' }).format(date);
  } catch (e) {
    return date.toISOString();
  }
}

function buildSessionReminderPayload({ startAt, endAt, location, timeZone, siteUrl }) {
  const startLabel = formatDateTimeForDisplay(startAt, timeZone) || startAt || '未定';
  const endLabel = endAt ? (formatDateTimeForDisplay(endAt, timeZone) || endAt) : null;
  const locationLabel = location || '未定';
  const subjectDate = formatDateTimeForSubject(startAt, timeZone) || startLabel;
  const subject = subjectDate ? `次回セッションのリマインダー (${subjectDate})` : '次回セッションのリマインダー';

  const textLines = [
    'こんにちは。',
    '',
    '次のセッションのリマインダーです。',
    `開始: ${startLabel}`,
  ];
  if (endLabel) textLines.push(`終了: ${endLabel}`);
  textLines.push(`場所: ${locationLabel}`);
  if (siteUrl) {
    textLines.push('');
    textLines.push(`詳細・変更: ${siteUrl}`);
  }
  textLines.push('');
  textLines.push('スケジュールが変わった場合はダッシュボードを更新してください。');
  textLines.push('');
  textLines.push('このメールに心当たりが無い場合は管理者までご連絡ください。');
  const text = textLines.join('\n');

  const htmlParts = [
    '<p>こんにちは。</p>',
    '<p>次のセッションのリマインダーです。</p>',
    '<ul>',
    `<li><strong>開始:</strong> ${escapeHtml(startLabel)}</li>`,
  ];
  if (endLabel) htmlParts.push(`<li><strong>終了:</strong> ${escapeHtml(endLabel)}</li>`);
  htmlParts.push(`<li><strong>場所:</strong> ${escapeHtml(locationLabel)}</li>`);
  htmlParts.push('</ul>');
  if (siteUrl) {
    const safeUrl = escapeHtml(siteUrl);
    htmlParts.push(`<p>詳細・変更はこちら: <a href="${safeUrl}">${safeUrl}</a></p>`);
  }
  htmlParts.push('<p>スケジュールが変わった場合はダッシュボードを更新してください。</p>');
  htmlParts.push('<p>このメールに心当たりが無い場合は管理者までご連絡ください。</p>');
  const html = htmlParts.join('\n');

  return { subject, text, html, startLabel, endLabel, locationLabel };
}

const app = express();
// Behind Vercel/Proxies: trust X-Forwarded-* headers to let express-rate-limit work correctly
// See: https://express-rate-limit.github.io/ERR_ERL_UNEXPECTED_X_FORWARDED_FOR/
app.set('trust proxy', 1);
// Rate limiter for creating updates (spam / abuse protection)
const updatesCreateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  limit: 60, // at most 60 updates / 10min per IP (tune as necessary)
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: { code: 'RATE_LIMIT', message: 'Too many updates created, slow down.' } }
});
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'same-origin' },
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      "default-src": ["'self'"],
      "script-src": ["'self'"],
      "style-src": ["'self'"],
      "img-src": ["'self'", 'data:'],
      "connect-src": ["'self'"],
      "frame-ancestors": ["'self'"]
    }
  }
}));
// Global rate limiter (generic)
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false
}));
app.use(express.json({ limit: '64kb' })); // limit payload size (DoS mitigation)
app.use(cookieParser());
app.use(csrf());

// Allow same-origin requests; if CORS_ORIGIN defined allow credentials
const corsOrigin = process.env.CORS_ORIGIN;
if (corsOrigin) {
  app.use(cors({
    origin: corsOrigin,
    credentials: true,
    methods: ['GET','POST','PATCH','DELETE'],
    allowedHeaders: ['Content-Type','Authorization'],
    maxAge: 600
  }));
}

// Environment / security flags
const isProd = (process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production');

// SESSION_SECRET handling:
// - In production, do NOT set a fallback. If missing, log and let routes return structured CONFIG errors.
// - In dev, set an explicit fallback for convenience.
let SESSION_SECRET = process.env.SESSION_SECRET;
if (!SESSION_SECRET) {
  if (isProd) {
    console.error('CONFIG: SESSION_SECRET is missing. Auth endpoints will return CONFIG errors.');
  } else {
    SESSION_SECRET = 'dev-secret-change-me'; // explicit dev-only fallback
  }
}

// Note: Do not throw at import-time for missing GOOGLE_CLIENT_ID in serverless environments,
// as this causes FUNCTION_INVOCATION_FAILED without a clear JSON body. We log here and
// return a structured CONFIG error from the sign-in route instead.
if (!googleClientId) {
  if (isProd) {
    console.error('CONFIG: GOOGLE_CLIENT_ID is missing. /api/auth/google/signin will return CONFIG error.');
  } else {
    console.warn('[dev] GOOGLE_CLIENT_ID not set – Google sign-in will return CONFIG error');
  }
}

// Minimal CSRF mitigation: enforce Origin for state-changing requests when CORS_ORIGIN defined.
app.use((req, res, next) => {
  if (['POST','PATCH','DELETE','PUT'].includes(req.method)) {
    const origin = req.get('Origin');
    if (corsOrigin && origin && origin !== corsOrigin) {
      return res.status(403).json({ error: 'CSRF origin mismatch' });
    }
  }
  next();
});

function issueSession(res, payload) {
  if (!SESSION_SECRET) {
    res.status(500).json({ ok: false, error: { code: 'CONFIG_SESSION_SECRET_MISSING', message: 'Server missing SESSION_SECRET' } });
    return false;
  }
  const token = jwt.sign({
    ...payload,
    iss: 'goen-net',
    aud: 'goen-net-web'
  }, SESSION_SECRET, { algorithm: 'HS256', expiresIn: '7d' });

  // Encrypt the token before setting in cookie
  const encryptedToken = encrypt(token);

  res.cookie('session', encryptedToken, {
    httpOnly: true,
    sameSite: 'strict', // stronger CSRF protection
    secure: isProd,

    path: '/',
    maxAge: 7 * 24 * 3600 * 1000,
  });
  return true;
}

function decodeSession(req) {
  const raw = req.cookies?.session;
  if (!raw) return null;
  try {
    // Decrypt the token from the cookie, then verify JWT
    const decryptedToken = decrypt(raw);
    return jwt.verify(decryptedToken, SESSION_SECRET);
  } catch {
    return null;
  }
}

// ---------------- Standardized response helpers ---------------------------
function ok(res, data = {}) { return res.json({ ok: true, ...data }); }
function err(res, status, code, message) { return res.status(status).json({ ok: false, error: { code, message } }); }

// Google Sign-In (front sends ID token). VERIFY the token + diagnostics when DEBUG_AUTH=1.
// Stricter limiter for auth endpoint
const signinLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 30,
  message: { error: 'Too many sign-in attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});

app.post('/api/auth/google/signin', signinLimiter, async (req, res) => {
  try {
    const { idToken } = req.body || {};
    if (!idToken) return err(res, 400, 'MISSING_ID_TOKEN', 'Missing idToken');
    if (!googleClient) {
      console.error('auth/google/signin: GOOGLE_CLIENT_ID missing or invalid');
      return err(res, 500, 'CONFIG_GOOGLE_CLIENT_ID_MISSING', 'Server missing GOOGLE_CLIENT_ID');
    }
    // In production環境では強制的に debug をオフ
    const prod = (process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production');
    const debug = !prod && process.env.DEBUG_AUTH === '1';

    let norm;
    let rawEmail = '';
    let rawEmailLower = '';
    let googleFirstName = '';
    let googleLastName = '';
    let role = 'user';
    // Phase 1: verify token
    try {
      const ticket = await googleClient.verifyIdToken({ idToken, audience: [googleClientId] });
      const payload = ticket.getPayload() || {};
      if (debug) console.log('Google payload', JSON.stringify(payload));
      const { email, iss, aud, exp, email_verified } = payload;
      if (!email) return err(res, 400, 'NO_EMAIL', 'No email in Google token');
      rawEmail = String(email);
      rawEmailLower = rawEmail.toLowerCase();
      if (aud !== googleClientId) return err(res, 401, 'BAD_AUD', 'Invalid Google token (audience)');
      if (!(iss === 'https://accounts.google.com' || iss === 'accounts.google.com')) return err(res, 401, 'BAD_ISS', 'Invalid Google token (issuer)');
      if (exp && Date.now() / 1000 > Number(exp)) return err(res, 401, 'EXPIRED', 'Invalid Google token (expired)');
      if (email_verified !== true) return err(res, 401, 'UNVERIFIED', 'Email not verified');
      norm = normalizeGmail(rawEmailLower);
      const allowed = (process.env.ALLOWED_EMAILS || '').split(',').map(s => normalizeGmail(s.trim().toLowerCase())).filter(Boolean);
      if (allowed.length > 0 && !allowed.includes(norm)) return err(res, 403, 'FORBIDDEN', 'Not on allow list');
      const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(s => normalizeGmail(s.trim().toLowerCase())).filter(Boolean);
      role = adminEmails.includes(norm) ? 'admin' : 'user';

      const rawGiven = typeof payload.given_name === 'string' ? payload.given_name : '';
      const rawFamily = typeof payload.family_name === 'string' ? payload.family_name : '';
      const rawName = typeof payload.name === 'string' ? payload.name : '';
      googleFirstName = sanitizeName(rawGiven);
      googleLastName = sanitizeName(rawFamily);
      if (!googleFirstName && rawName) {
        const parts = rawName.trim().split(/\s+/).filter(Boolean);
        if (parts.length) {
          googleFirstName = sanitizeName(parts[0]);
          if (!googleLastName && parts.length > 1) {
            googleLastName = sanitizeName(parts.slice(1).join(' '));
          }
        }
      }
    } catch (e) {
      console.error('verifyIdToken failed', e?.message || e, e?.stack);
      return err(res, 401, 'INVALID_TOKEN', 'Invalid Google token');
    }

    // Phase 2: persist user (best-effort)
    let sessionUserId = norm;
    let persistedFirstName = googleFirstName;
    let persistedLastName = googleLastName;
    const badgeEmailLowerCandidates = new Set();
    const memAliases = new Set();
    const emailLookupOrder = [];

    if (norm) {
      badgeEmailLowerCandidates.add(norm);
      memAliases.add(norm);
      emailLookupOrder.push(norm);
    }
    if (rawEmailLower && rawEmailLower !== norm) {
      badgeEmailLowerCandidates.add(rawEmailLower);
      emailLookupOrder.unshift(rawEmailLower);
    }
    if (rawEmailLower) {
      memAliases.add(rawEmailLower);
    }
    if (rawEmail && rawEmail.toLowerCase() !== norm) {
      memAliases.add(rawEmail);
    }

    try {
      if (db) {
        const schema = await resolveUserTableConfig();
        if (db) {
          const schema = await resolveUserTableConfig();
          if (db) {
            const tableName = schema?.table || 'users';
            const firstCol = getUserColumn(schema, 'first', 'first_name');
            const lastCol = getUserColumn(schema, 'last', 'last_name');
            const updatedCol = getUserColumn(schema, 'updated', 'updated_at');
            let existingRow = null;
            const lookupIterable = emailLookupOrder.length ? emailLookupOrder : Array.from(badgeEmailLowerCandidates);

            for (const emailLower of lookupIterable) {
              if (!emailLower) continue;
              const lookup = await db.execute({
                sql: `SELECT id, email, ${firstCol} AS first_name, ${lastCol} AS last_name FROM ${tableName} WHERE lower(email) = ?1 LIMIT 1`,
                args: [emailLower]
              });
              if (lookup.rows?.length) {
                existingRow = lookup.rows[0];
                break;
              }
            }

            if (!existingRow && norm) {
              const byId = await db.execute({
                sql: `SELECT id, email, ${firstCol} AS first_name, ${lastCol} AS last_name FROM ${tableName} WHERE id = ?1 LIMIT 1`,
                args: [norm]
              });
              if (byId.rows?.length) existingRow = byId.rows[0];
            }

            if (existingRow?.id) sessionUserId = existingRow.id;

            const updateSql = `
              UPDATE ${tableName}
              SET
                ${firstCol} = CASE WHEN length(?2) > 0 THEN ?2 ELSE ${firstCol} END,
                ${lastCol} = CASE WHEN length(?3) > 0 THEN ?3 ELSE ${lastCol} END,
                email = CASE WHEN length(?4) > 0 THEN ?4 ELSE email END
                ${updatedCol ? `, ${updatedCol} = datetime('now')` : ''}
              WHERE id = ?1
            `;
            const updateArgs = [sessionUserId, googleFirstName, googleLastName, norm];

            if (existingRow) {
              await db.execute({ sql: updateSql, args: updateArgs });
            } else {
              try {
                const insertSql = `INSERT INTO ${tableName} (id, email, ${firstCol}, ${lastCol}) VALUES (?1, ?2, ?3, ?4)`;
                await db.execute({ sql: insertSql, args: [sessionUserId, norm, googleFirstName, googleLastName] });
              } catch (insertErr) {
                const message = `${insertErr?.message || ''}`.toLowerCase();
                if (message.includes('unique') && message.includes('email')) {
                  const conflict = await db.execute({
                    sql: `SELECT id, email, ${firstCol} AS first_name, ${lastCol} AS last_name FROM ${tableName} WHERE lower(email) = ?1 LIMIT 1`,
                    args: [norm]
                  });
                  if (conflict.rows?.length) {
                    const row = conflict.rows[0];
                    sessionUserId = row.id;
                    await db.execute({ sql: updateSql, args: [sessionUserId, googleFirstName, googleLastName, norm] });
                  } else {
                    throw insertErr;
                  }
                } else {
                  throw insertErr;
                }
              }
            }

            const finalResult = await db.execute({
              sql: `SELECT id, email, ${firstCol} AS first_name, ${lastCol} AS last_name FROM ${tableName} WHERE id = ?1 LIMIT 1`,
              args: [sessionUserId]
            });
            if (finalResult.rows?.length) {
              const finalRow = finalResult.rows[0];
              if (finalRow.id) sessionUserId = finalRow.id;
              if (finalRow.email) {
                const emailStr = String(finalRow.email);
                memAliases.add(emailStr);
                badgeEmailLowerCandidates.add(emailStr.toLowerCase());
              }
              if (finalRow.first_name) persistedFirstName = finalRow.first_name;
              if (finalRow.last_name) persistedLastName = finalRow.last_name;
            }

            // Ensure standard 'users' table also has the row for FK consistency
            try {
              await db.execute({ sql: `INSERT OR IGNORE INTO users (id, email, first_name, last_name) VALUES (?1, ?2, ?3, ?4)`, args: [sessionUserId, norm, persistedFirstName || googleFirstName || '', persistedLastName || googleLastName || ''] });
            } catch {}

            if (sessionUserId) {
              const uidReassignCandidates = new Set();
              if (norm && sessionUserId !== norm) uidReassignCandidates.add(norm);
              if (rawEmailLower && sessionUserId !== rawEmailLower) uidReassignCandidates.add(rawEmailLower);
              for (const candidate of uidReassignCandidates) {
                if (!candidate) continue;
                await db.execute({ sql: 'UPDATE updates SET uid = ?1 WHERE lower(uid) = ?2', args: [sessionUserId, String(candidate).toLowerCase()] });
              }
            }

            if (persistedFirstName) {
              await syncUpdateBadgesWithFirstName(sessionUserId, persistedFirstName, Array.from(badgeEmailLowerCandidates));
            }
          }
        }
      }
    } catch (e) {
      console.error('User upsert failed; continuing with memory fallback', e?.message || e);
    }

    // Memory fallback behavior removed; no-op here.

  const okCookie = issueSession(res, { id: sessionUserId, email: norm, role });
  if (!okCookie) return; // response sent with CONFIG error already
  return ok(res, {});
  } catch (e) {
    console.error('auth/google/signin unexpected error', e?.message || e, e?.stack);
    return err(res, 500, 'UNEXPECTED', 'Unexpected server error');
  }
});

app.get('/api/auth/me', async (req, res) => {
  const session = decodeSession(req);
  if (!session) return err(res, 401, 'UNAUTHENTICATED', 'Not authenticated');
  let user = { id: session.id, email: session.email, role: session.role };
  try {
    if (db) {
      await initDbOnce();
      if (db) {
        const schema = await resolveUserTableConfig();
        const tableName = schema?.table || 'users';
        const firstCol = getUserColumn(schema, 'first', 'first_name');
        const lastCol = getUserColumn(schema, 'last', 'last_name');
        const r = await db.execute({
          sql: `SELECT id, email, ${firstCol} AS first_name, ${lastCol} AS last_name FROM ${tableName} WHERE id = ?1`,
          args: [session.id]
        });
        if (r.rows?.length) {
          const row = r.rows[0];
          user = { id: row.id, email: row.email, firstName: row.first_name, lastName: row.last_name, displayName: row.first_name || row.email };
        }
      }
    }
  } catch (e) {
    console.error('auth/me db lookup failed', e?.message || e);
  }
  if (!db) return err(res, 503, 'DB_UNAVAILABLE', 'Database is not available');
  return ok(res, { authenticated: true, user });
});

app.post('/api/auth/signout', (req, res) => {
  // Ensure cookie removal works consistently across browsers/environments
  res.clearCookie('session', { path: '/', httpOnly: true, sameSite: 'strict', secure: isProd });
  return ok(res, {});
});

// Updates CRUD (persistent if DB available)
app.get('/api/updates', requireAuth, async (req, res) => {
  const limit = Math.min(Math.max(parseInt(req.query.limit)?.valueOf() || 50, 1), 100);
  const offset = Math.max(parseInt(req.query.offset)?.valueOf() || 0, 0);
  const session = req.session;
  const viewerId = session?.id || '';
  try {
    if (db) {
      await initDbOnce();
      if (db) {
        const schema = await resolveUserTableConfig();
        const userTable = schema?.table || 'users';
        const firstCol = getUserColumn(schema, 'first', 'first_name');
        const r = await db.execute({
          sql: `SELECT upd.id, upd.by_name, upd.category, upd.priority, upd.uid, upd.title, upd.body, upd.when_value, upd.created_at,
                      u.${firstCol} AS user_first_name,
                      (SELECT COUNT(*) FROM update_votes v WHERE v.update_id = upd.id) AS vote_count,
                      EXISTS(SELECT 1 FROM update_votes uv WHERE uv.update_id = upd.id AND lower(uv.uid) = lower(?1)) AS viewer_voted
                FROM updates AS upd
                LEFT JOIN ${userTable} AS u ON lower(u.id) = lower(upd.uid)
                ORDER BY upd.created_at DESC
                LIMIT ?2 OFFSET ?3`,
          args: [viewerId, limit, offset]
        });
        const rows = r.rows.map(row => ({
          id: row.id,
          by: row.user_first_name || row.by_name,
          category: Number(row.category),
          priority: !!row.priority,
          uid: row.uid,
          title: row.title,
          update: row.body,
          when: Number(row.when_value),
          createdAt: row.created_at,
          votes: Number(row.vote_count ?? 0) || 0,
          viewerHasVoted: row.viewer_voted === true || Number(row.viewer_voted ?? 0) === 1,
        }));
        return ok(res, { rows, pagination: { limit, offset, count: rows.length } });
      }
    }
  } catch (e) {
    lastDbError = e?.message || String(e);
    if (!dbDisabledLogged) console.error('updates list db failed; disabling db', { message: e?.message });
    clearDbReference();
  }
  if (degradeToMemory && memUpdates) {
    const rows = memUpdates.slice(offset, offset + limit).map((row) => {
      const votesSet = memUpdateVotes?.get(row.id);
      const voteCount = votesSet ? votesSet.size : 0;
      const viewerHasVoted = viewerId ? !!votesSet?.has(viewerId) : false;
      return {
        ...row,
        votes: voteCount,
        viewerHasVoted,
      };
    });
    return ok(res, { rows, pagination: { limit, offset, count: rows.length }, degraded: true });
  }
  return err(res, 503, 'DB_UNAVAILABLE', 'Database is not available');
});

// (legacy insecure /api/updates POST removed – see secure implementation near RBAC helpers)

app.delete('/api/updates/:id', async (req, res) => {
  const session = decodeSession(req);
  if (!session) return err(res, 401, 'UNAUTHORIZED', 'Unauthorized');
  const { id } = req.params;
  try {
    if (db) {
      await initDbOnce();
      if (db) await db.execute({ sql: 'DELETE FROM updates WHERE id = ?1 AND uid = ?2', args: [id, session.id] });
    }
  } catch (e) {
    lastDbError = e?.message || String(e);
    console.error('updates delete failed', e?.message || e);
  }
  if (!db) {
    if (degradeToMemory && memUpdates) {
      const idx = memUpdates.findIndex(u => u.id === id && u.uid === session.id);
      if (idx !== -1) {
        const [removed] = memUpdates.splice(idx, 1);
        if (memUpdateVotes && removed?.id) memUpdateVotes.delete(removed.id);
      }
      return ok(res, { degraded: true });
    }
    return err(res, 503, 'DB_UNAVAILABLE', 'Database is not available');
  }
  return ok(res, {});
});

app.delete('/api/updates', async (req, res) => {
  const session = decodeSession(req);
  if (!session) return err(res, 401, 'UNAUTHORIZED', 'Unauthorized');
  try {
    if (db) {
      await initDbOnce();
      if (db) await db.execute('DELETE FROM updates');
    }
  } catch (e) {
    lastDbError = e?.message || String(e);
    console.error('updates delete all failed', e?.message || e);
  }
  if (!db) {
    if (degradeToMemory && memUpdates) {
      memUpdates.splice(0, memUpdates.length);
      if (memUpdateVotes) memUpdateVotes.clear();
      return ok(res, { degraded: true });
    }
    return err(res, 503, 'DB_UNAVAILABLE', 'Database is not available');
  }
  return ok(res, {});
});

app.post('/api/updates/:id/vote', requireAuth, async (req, res) => {
  const session = req.session;
  const { id } = req.params;
  if (!id) return err(res, 400, 'INVALID_ID', 'Invalid update id');
  try {
    if (db) {
      await initDbOnce();
      if (db) {
        const exists = await db.execute({ sql: 'SELECT 1 FROM updates WHERE id = ?1', args: [id] });
        if (!exists.rows?.length) return err(res, 404, 'NOT_FOUND', 'Update not found');
        const voteId = (global.crypto || require('node:crypto')).randomUUID();
        await db.execute({
          sql: 'INSERT OR IGNORE INTO update_votes (id, update_id, uid) VALUES (?1, ?2, ?3)',
          args: [voteId, id, session.id]
        });
        const countRes = await db.execute({ sql: 'SELECT COUNT(*) AS count FROM update_votes WHERE update_id = ?1', args: [id] });
        const votes = Number(countRes.rows?.[0]?.count ?? 0);
        return ok(res, { id, votes, viewerHasVoted: true });
      }
    }
  } catch (e) {
    lastDbError = e?.message || String(e);
    if (!dbDisabledLogged) console.error('update vote insert failed', e?.message || e);
    clearDbReference();
  }
  if (degradeToMemory && memUpdates && memUpdateVotes) {
    const updateExists = memUpdates.some((u) => u.id === id);
    if (!updateExists) return err(res, 404, 'NOT_FOUND', 'Update not found');
    let votesSet = memUpdateVotes.get(id);
    if (!votesSet) {
      votesSet = new Set();
      memUpdateVotes.set(id, votesSet);
    }
    votesSet.add(session.id);
    const voteCount = votesSet.size;
    const updater = (item) => ({ ...item, votes: voteCount, viewerHasVoted: true });
    const idx = memUpdates.findIndex((u) => u.id === id);
    if (idx !== -1) memUpdates[idx] = updater(memUpdates[idx]);
    return ok(res, { id, votes: voteCount, viewerHasVoted: true, degraded: true });
  }
  return err(res, 503, 'DB_UNAVAILABLE', 'Database is not available');
});

app.delete('/api/updates/:id/vote', requireAuth, async (req, res) => {
  const session = req.session;
  const { id } = req.params;
  if (!id) return err(res, 400, 'INVALID_ID', 'Invalid update id');
  try {
    if (db) {
      await initDbOnce();
      if (db) {
        const exists = await db.execute({ sql: 'SELECT 1 FROM updates WHERE id = ?1', args: [id] });
        if (!exists.rows?.length) return err(res, 404, 'NOT_FOUND', 'Update not found');
        await db.execute({ sql: 'DELETE FROM update_votes WHERE update_id = ?1 AND uid = ?2', args: [id, session.id] });
        const countRes = await db.execute({ sql: 'SELECT COUNT(*) AS count FROM update_votes WHERE update_id = ?1', args: [id] });
        const votes = Number(countRes.rows?.[0]?.count ?? 0);
        return ok(res, { id, votes, viewerHasVoted: false });
      }
    }
  } catch (e) {
    lastDbError = e?.message || String(e);
    if (!dbDisabledLogged) console.error('update vote delete failed', e?.message || e);
    clearDbReference();
  }
  if (degradeToMemory && memUpdates && memUpdateVotes) {
    const updateExists = memUpdates.some((u) => u.id === id);
    if (!updateExists) return err(res, 404, 'NOT_FOUND', 'Update not found');
    const votesSet = memUpdateVotes.get(id) || new Set();
    votesSet.delete(session.id);
    if (votesSet.size === 0) memUpdateVotes.delete(id); else memUpdateVotes.set(id, votesSet);
    const voteCount = votesSet.size;
    const updater = (item) => ({ ...item, votes: voteCount, viewerHasVoted: false });
    const idx = memUpdates.findIndex((u) => u.id === id);
    if (idx !== -1) memUpdates[idx] = updater(memUpdates[idx]);
    return ok(res, { id, votes: voteCount, viewerHasVoted: false, degraded: true });
  }
  return err(res, 503, 'DB_UNAVAILABLE', 'Database is not available');
});

app.get('/api/health', (_req, res) => ok(res));

// Lightweight diagnostics (no secrets): report current storage mode and DB URL scheme/host
// NOTE: Keep this minimal and non-sensitive. Useful to verify if deployment uses DB or memory.
app.get('/api/__diag/storage', (_req, res) => {
  const dbAvailable = !!db;
  let scheme = null;
  let host = null;
  try {
    if (tursoUrl) {
      // Expected format: libsql://hostname
      const u = new URL(tursoUrl);
      scheme = u.protocol.replace(':', '');
      host = u.hostname;
    }
  } catch {}
  return ok(res, {
    dbAvailable,
    dbUrlScheme: scheme,
    dbHost: host,
    hasAuthToken: !!tursoAuth,
    urlEnvSource: tursoUrlSource,
    tokenEnvSource: tursoAuthSource,
    schemaInitialized: !!global.__SCHEMA_DONE__,
    skipSchemaInit,
    lastDbError: lastDbError || null
  });
});

// Simple DB ping to validate connectivity and basic query execution
app.get('/api/__diag/db-ping', async (_req, res) => {
  if (!db) return err(res, 503, 'DB_UNAVAILABLE', 'Database is not available');
  try {
    await initDbOnce();
    if (!db) return err(res, 503, 'DB_UNAVAILABLE', 'Database is not available');
    const r = await db.execute("SELECT datetime('now') AS now, sqlite_version() AS sqlite_version");
    const row = r.rows?.[0] || null;
    let tables = { users: false, updates: false, next_session: false };
    try {
      const t = await db.execute("SELECT name FROM sqlite_master WHERE type='table'");
      const names = (t.rows || []).map(x => x.name?.toLowerCase?.() || x.name);
      tables = {
        users: names.includes('users'),
        updates: names.includes('updates'),
        next_session: names.includes('next_session'),
      };
    } catch {}
    return ok(res, { ok: true, now: row?.now || null, sqliteVersion: row?.sqlite_version || null, tables });
  } catch (e) {
    lastDbError = e?.message || String(e);
    return err(res, 503, 'DB_PING_FAILED', lastDbError || 'Ping failed');
  }
});

// Next session (single row) -------------------------------------------------
app.get('/api/next-session', async (_req, res) => {
  try {
    if (db) {
      await initDbOnce();
      if (db) {
        const r = await db.execute('SELECT start_at, end_at, location, reminder_sent_at FROM next_session WHERE id = 1');
        if (r.rows?.length) {
          const row = r.rows[0];
          return ok(res, { startAt: row.start_at, endAt: row.end_at, location: row.location, reminderSentAt: row.reminder_sent_at });
        }
        return ok(res, { startAt: null, endAt: null, location: null, reminderSentAt: null });
      }
    }
  } catch (e) {
    console.error('next-session get failed, using memory', e?.message || e);
    clearDbReference();
  }
  return err(res, 503, 'DB_UNAVAILABLE', 'Database is not available');
});

app.post('/api/next-session', async (req, res) => {
  const session = decodeSession(req);
  if (!session) return err(res, 401, 'UNAUTHORIZED', 'Unauthorized');
  const { startAt, endAt, location } = req.body || {};
  // Validation ISO8601 (basic) & chronological
  // Accept both with and without 'Z', seconds and milliseconds optional (e.g. 2025-09-24T10:00 or 2025-09-24T10:00:00Z)
  const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(\.\d+)?(Z)?$/;
  if (startAt && !isoRegex.test(startAt)) return err(res, 422, 'BAD_FORMAT', 'startAt must be ISO8601 UTC (e.g. 2025-01-01T09:00:00Z)');
  if (endAt && !isoRegex.test(endAt)) return err(res, 422, 'BAD_FORMAT', 'endAt must be ISO8601 UTC');
  if (startAt && endAt && Date.parse(startAt) >= Date.parse(endAt)) return err(res, 422, 'RANGE', 'endAt must be after startAt');
  // Normalize to full ISO8601 UTC (append :00 and Z when missing)
  const toIsoUtc = (s) => {
    if (!s) return null;
    let v = String(s).trim();
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v)) v = v + ':00Z';
    else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(v)) v = v + 'Z';
    else if (!v.endsWith('Z') && /T\d{2}:\d{2}/.test(v)) v = v + 'Z';
    return v;
  };
  const startAtIso = toIsoUtc(startAt);
  const endAtIso = endAt ? toIsoUtc(endAt) : null;
  try {
    if (db) {
      await initDbOnce();
      if (db) {
        await db.execute({
          sql: `INSERT INTO next_session (id, start_at, end_at, location, reminder_sent_at, updated_at) VALUES (1, ?1, ?2, ?3, NULL, datetime('now'))
                ON CONFLICT(id) DO UPDATE SET start_at=excluded.start_at, end_at=excluded.end_at, location=excluded.location, reminder_sent_at=NULL, updated_at=datetime('now')`,
          args: [startAtIso, endAtIso, location || null]
        });
        return ok(res, {});
      }
    }
  } catch (e) {
    console.error('next-session post failed, memory fallback', e?.message || e);
    clearDbReference();
  }
  return err(res, 503, 'DB_UNAVAILABLE', 'Database is not available');
});

app.post('/api/cron/send-session-reminders', async (req, res) => {
  if (sessionReminderSecret) {
    const header = String(req.get('authorization') || '');
    let provided = null;
    if (header.toLowerCase().startsWith('bearer ')) {
      provided = header.slice(7).trim();
    }
    if (!provided) provided = req.get('x-cron-secret') || null;
    if (!provided && req.query?.secret) provided = String(req.query.secret);
    if (!provided && req.body && typeof req.body.secret === 'string') provided = req.body.secret;
    if (provided !== sessionReminderSecret) {
      return err(res, 401, 'CRON_UNAUTHORIZED', 'Invalid cron secret');
    }
  } else if (!cronSecretWarningLogged) {
    console.warn('Cron reminder invoked without CRON_REMINDER_SECRET configured');
    cronSecretWarningLogged = true;
  }

  if (!db) return err(res, 503, 'DB_UNAVAILABLE', 'Database is not available');
  if (!resendClient || !resendFromEmail) {
    return err(res, 503, 'EMAIL_NOT_CONFIGURED', 'Resend is not configured');
  }
  if (resendInitError) {
    return err(res, 500, 'EMAIL_INIT_FAILED', resendInitError);
  }

  try {
    await initDbOnce();
    if (!db) return err(res, 503, 'DB_UNAVAILABLE', 'Database is not available');
    const result = await db.execute('SELECT start_at, end_at, location, reminder_sent_at FROM next_session WHERE id = 1');
    if (!result.rows?.length) {
      return ok(res, { sent: false, reason: 'NO_SESSION' });
    }
    const row = result.rows[0];
    const startAt = row.start_at;
    if (!startAt) {
      return ok(res, { sent: false, reason: 'NO_START_TIME' });
    }
    if (row.reminder_sent_at) {
      return ok(res, { sent: false, reason: 'ALREADY_SENT', reminderSentAt: row.reminder_sent_at });
    }
    const startDate = new Date(startAt);
    if (Number.isNaN(startDate.getTime())) {
      return err(res, 422, 'INVALID_START_AT', 'Stored startAt is invalid');
    }

    const now = new Date();
    const msUntil = startDate.getTime() - now.getTime();
    const leadMs = sessionReminderLeadHours * 60 * 60 * 1000;
    if (msUntil > leadMs) {
      const hoursUntil = Math.round((msUntil / (1000 * 60 * 60)) * 10) / 10;
      return ok(res, { sent: false, reason: 'TOO_EARLY', hoursUntil });
    }
    if (msUntil < -1 * 60 * 60 * 1000) {
      return ok(res, { sent: false, reason: 'PAST_START' });
    }

    const dryRun = req.query?.dryRun === '1' || req.body?.dryRun === true;
    const overrideList = sessionReminderOverrideTo.length ? sessionReminderOverrideTo : null;
    const allowedRaw = (process.env.ALLOWED_EMAILS || '').split(',').map(s => normalizeGmail(s.trim().toLowerCase())).filter(Boolean);
    const allowedSet = new Set(allowedRaw);
    const restrictToAllowList = allowedSet.size > 0;
    const recipients = new Set();

    if (overrideList) {
      for (const email of overrideList) {
        if (!email) continue;
        const trimmed = email.trim();
        if (!trimmed) continue;
        if (restrictToAllowList) {
          const norm = normalizeGmail(trimmed);
          if (!allowedSet.has(norm)) continue;
        }
        recipients.add(trimmed);
      }
    } else {
      try {
        const schema = await resolveUserTableConfig();
        const tableName = schema?.table || 'users';
        const emails = await db.execute({ sql: `SELECT email FROM ${tableName} WHERE email IS NOT NULL AND trim(email) != ''`, args: [] });
        for (const item of emails.rows || []) {
          const raw = typeof item.email === 'string' ? item.email.trim() : '';
          if (!raw) continue;
          if (restrictToAllowList) {
            const norm = normalizeGmail(raw);
            if (!allowedSet.has(norm)) continue;
          }
          recipients.add(raw);
        }
      } catch (e) {
        console.error('Failed to load reminder recipients', e?.message || e);
        return err(res, 500, 'RECIPIENT_LOAD_FAILED', 'Failed to load recipients');
      }
    }

    if (!recipients.size) {
      return ok(res, { sent: false, reason: 'NO_RECIPIENTS' });
    }

    const payload = buildSessionReminderPayload({ startAt, endAt: row.end_at, location: row.location, timeZone: sessionReminderTimeZone, siteUrl: sessionReminderSiteUrl });

    if (dryRun) {
      return ok(res, {
        sent: false,
        reason: 'DRY_RUN',
        preview: {
          subject: payload.subject,
          text: payload.text,
          html: payload.html,
          recipients: Array.from(recipients)
        }
      });
    }

    try {
      const sendResult = await resendClient.emails.send({
        from: resendFromEmail,
        to: Array.from(recipients),
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
        reply_to: resendReplyTo || undefined
      });
      await db.execute("UPDATE next_session SET reminder_sent_at = datetime('now') WHERE id = 1");
      return ok(res, {
        sent: true,
        recipients: recipients.size,
        reminderSentAt: new Date().toISOString(),
        resendId: sendResult?.id || null
      });
    } catch (e) {
      console.error('Session reminder email send failed', e?.message || e);
      return err(res, 502, 'EMAIL_SEND_FAILED', e?.message || 'Failed to send email');
    }
  } catch (e) {
    console.error('Cron reminder handler failed', e?.message || e);
    return err(res, 500, 'CRON_HANDLER_FAILED', e?.message || 'Unexpected error');
  }
});

// ---------------- Users (read-only list) -----------------------------------
app.get('/api/users', async (req, res) => {
  const session = decodeSession(req);
  if (!session) return err(res, 401, 'UNAUTHORIZED', 'Unauthorized');
  const limit = Math.min(Math.max(parseInt(req.query.limit)?.valueOf() || 50, 1), 100);
  const offset = Math.max(parseInt(req.query.offset)?.valueOf() || 0, 0);
  try {
    if (db) {
      await initDbOnce();
      if (db) {
        const schema = await resolveUserTableConfig();
        const tableName = schema?.table || 'users';
        const firstCol = getUserColumn(schema, 'first', 'first_name');
        const lastCol = getUserColumn(schema, 'last', 'last_name');
        const updatedCol = getUserColumn(schema, 'updated', 'updated_at');
        const orderCol = updatedCol || 'updated_at';
        const r = await db.execute({
          sql: `SELECT id, email, ${firstCol} AS first_name, ${lastCol} AS last_name, ${orderCol} AS updated_at FROM ${tableName} ORDER BY ${orderCol} DESC LIMIT ?1 OFFSET ?2`,
          args: [limit, offset]
        });
        return ok(res, { rows: r.rows.map(row => ({
          id: row.id,
          email: row.id === session.id ? row.email : undefined, // hide others' emails
          firstName: row.first_name || '',
          lastName: row.last_name || '',
          displayName: row.first_name || row.email
        })), pagination: { limit, offset, count: r.rows.length } });
      }
    }
  } catch (e) {
    console.error('users list failed', e?.message || e);
    clearDbReference();
  }
  return err(res, 503, 'DB_UNAVAILABLE', 'Database is not available');
});

app.get('/api/users/:id', async (req, res) => {
  const session = decodeSession(req);
  if (!session) return err(res, 401, 'UNAUTHORIZED', 'Unauthorized');
  const { id } = req.params;
  try {
    if (db) {
      await initDbOnce();
      if (db) {
        const schema = await resolveUserTableConfig();
        const tableName = schema?.table || 'users';
        const firstCol = getUserColumn(schema, 'first', 'first_name');
        const lastCol = getUserColumn(schema, 'last', 'last_name');
        const r = await db.execute({
          sql: `SELECT id, email, ${firstCol} AS first_name, ${lastCol} AS last_name FROM ${tableName} WHERE id = ?1`,
          args: [id]
        });
        if (r.rows?.length) {
          const row = r.rows[0];
          return ok(res, { id: row.id, email: row.id === session.id ? row.email : undefined, firstName: row.first_name || '', lastName: row.last_name || '', displayName: row.first_name || row.email });
        }
        return err(res, 404, 'NOT_FOUND', 'Not found');
      }
    }
  } catch (e) {
    console.error('user get failed', e?.message || e);
    clearDbReference();
  }
  return err(res, 503, 'DB_UNAVAILABLE', 'Database is not available');
});

// Update nickname (first_name / last_name). Only self-update allowed.
app.patch('/api/users/:id', (req, res) => {
  return err(res, 410, 'NICKNAME_DISABLED', 'Manual profile editing has been removed. Names now sync from Google.');
});

// (legacy insecure /api/updates POST removed; secure version added earlier)

// ---------------------------------------------------------------------------
// Authorization helper functions (not yet wired to routes beyond existing
// inline checks; kept for incremental RBAC rollout)
// --- Secure replacement for /api/updates POST (removes client-controlled uid/by) ---
app.post('/api/updates', updatesCreateLimiter, async (req, res) => {
  const session = decodeSession(req);
  if (!session) return err(res, 401, 'UNAUTHORIZED', 'Unauthorized');
  const { category = 0, priority = false, title = '', update = '', when = 0 } = req.body || {};
  if (typeof update !== 'string' || !update.trim()) return err(res, 422, 'REQUIRED', 'update text required');
  if (![0,1,2].includes(Number(category))) return err(res, 422, 'BAD_CATEGORY', 'invalid category');
  if (!(when === -1 || when === 1 || when === 0)) return err(res, 422, 'BAD_WHEN', 'invalid when (expected -1,0,1)');
  const id = (global.crypto || require('node:crypto')).randomUUID();
  let createdAt = new Date().toISOString();
  let displayName = session.email; // fallback
  try {
    if (db) {
      await initDbOnce();
      if (db) {
        // Ensure user row exists to satisfy FK(uid -> users.id)
        const schema = await resolveUserTableConfig();
        const tableName = schema?.table || 'users';
        const normalizedTableName = String(tableName || '').replace(/"/g, '').toLowerCase();
        const ensureUsersTableRow = async () => {
          if (normalizedTableName !== 'users') {
            try {
              await db.execute({
                sql: 'INSERT OR IGNORE INTO users (id, email) VALUES (?1, ?2)',
                args: [session.id, session.email || null]
              });
            } catch (err) {
              const message = err?.message || '';
              if (!message.includes('no such table')) {
                console.warn('users table sync failed', message);
              }
            }
          }
        };

        try {
          await db.execute({ sql: `INSERT OR IGNORE INTO ${tableName} (id, email) VALUES (?1, ?2)`, args: [session.id, session.email || null] });
        } catch {}

        await ensureUsersTableRow();

        // Fetch display name if available
        try {
          const firstCol = getUserColumn(schema, 'first', 'first_name');
          const rUser = await db.execute({ sql: `SELECT ${firstCol} AS first_name FROM ${tableName} WHERE id = ?1`, args: [session.id] });
          if (rUser.rows?.length && rUser.rows[0].first_name) displayName = rUser.rows[0].first_name;
        } catch {}

        // Insert update, retry once on FK constraint by creating user row
        const doInsert = async () => {
          await db.execute({
            sql: `INSERT INTO updates (id, by_name, category, priority, uid, title, body, when_value) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`,
            args: [id, displayName, Number(category), priority ? 1 : 0, session.id, title || update.slice(0,80), update, Number(when)]
          });
        };
        try {
          await doInsert();
        } catch (e) {
          const msg = e?.message || '';
          // Retry once if FK/constraint error
          if (msg.includes('FOREIGN KEY constraint failed') || msg.includes('SQLITE_CONSTRAINT')) {
            try {
              await db.execute({ sql: `INSERT OR IGNORE INTO ${tableName} (id, email) VALUES (?1, ?2)`, args: [session.id, session.email || null] });
            } catch {}
            await ensureUsersTableRow();
            await doInsert();
          } else {
            throw e;
          }
        }

        const r = await db.execute({ sql: 'SELECT created_at FROM updates WHERE id = ?1', args: [id] });
        if (r.rows?.length) createdAt = r.rows[0].created_at;
      }
    } else {
      throw new Error('db disabled');
    }
  } catch (e) {
    lastDbError = e?.message || String(e);
    const isConstraint = lastDbError.includes('SQLITE_CONSTRAINT') || lastDbError.includes('FOREIGN KEY constraint failed');
    if (!isConstraint) {
      if (!dbDisabledLogged) console.error('updates insert db failed; disabling db', { message: e?.message });
      clearDbReference();
    }
    if (degradeToMemory && memUpdates) {
      const item = { id, by: displayName, category: Number(category), priority: !!priority, uid: session.id, title: title || update.slice(0,80), update, when: Number(when), createdAt, votes: 0, viewerHasVoted: false };
      memUpdates.unshift(item);
      if (memUpdateVotes && !memUpdateVotes.has(id)) memUpdateVotes.set(id, new Set());
      return res.status(201).json({ ok: true, item, degraded: true });
    }
    if (isConstraint) return err(res, 409, 'FK_CONSTRAINT', 'User record missing for uid; please sign-in again');
    return err(res, 503, 'DB_UNAVAILABLE', 'Database is not available');
  }
  return res.status(201).json({ ok: true, item: { id, by: displayName, category: Number(category), priority: !!priority, uid: session.id, title: title || update.slice(0,80), update, when: Number(when), createdAt } });
});

// TODO(sec-hardening backlog)
// 1. Add total count (SELECT COUNT(*)) to pagination metadata for /api/updates and /api/users
// 2. Introduce structured logging (pino) with PII masking & request correlation id
// 3. Implement short-lived access JWT + refresh token rotation & revoke logic
// 4. Strengthen CSRF: token-based (double-submit) and phase out reliance on SameSite alone
// 5. Improve CSP: add nonce for scripts, remove 'unsafe-inline', consider strict-dynamic
// 6. Apply RBAC middleware (requireRole) to future admin endpoints
// 7. Centralize input validation (zod) + unified error code mapping
// 8. Add rate limiting to any future mutation endpoints (PATCH user profile, etc.)
// 9. Add health/detail endpoint with degraded mode flags (db fallback indicator)
// 10. Add indexing / constraints review (e.g., updates.created_at index) & potential pruning strategy

export function requireAuth(req, res, next) {
  const session = decodeSession(req);
  if (!session) return res.status(401).json({ error: 'Unauthorized' });
  req.session = session;
  next();
}

export function requireRole(role) {
  return (req, res, next) => {
    const session = req.session || decodeSession(req);
    if (!session) return res.status(401).json({ error: 'Unauthorized' });
    if (session.role !== role) return res.status(403).json({ error: 'Forbidden' });
    req.session = session;
    next();
  };
}

export default app;
