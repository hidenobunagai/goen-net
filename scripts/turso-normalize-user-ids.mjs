import { createClient } from '@libsql/client';
import fs from 'node:fs/promises';

async function loadJson(path) {
  try {
    return JSON.parse(await fs.readFile(path, 'utf8'));
  } catch {
    return null;
  }
}

async function getClient() {
  const db = await loadJson('turso-db.json');
  const token = await loadJson('turso-db-token.json');
  const url = db?.url || (db?.raw?.database?.Hostname ? `libsql://${db.raw.database.Hostname}` : null);
  if (!url || !token?.token) {
    throw new Error('Missing DB url or token. Run turso:create and turso:token.');
  }
  return createClient({ url, authToken: token.token });
}

function normalizeEmail(email) {
  if (!email) return '';
  const lower = String(email).trim().toLowerCase();
  const match = lower.match(/^([^@]+)@(gmail\.com|googlemail\.com)$/);
  if (!match) return lower;
  let local = match[1];
  local = local.replace(/\./g, '');
  local = local.replace(/\+.*/, '');
  return `${local}@gmail.com`;
}

const dryRun = process.argv.includes('--dry-run');

async function migrateUser(client, row, targetId) {
  const currentId = String(row.id ?? '').trim();
  const email = String(row.email ?? '').trim();
  const firstName = row.first_name ?? row.firstName ?? null;
  const lastName = row.last_name ?? row.lastName ?? null;
  const createdAt = row.created_at ?? row.createdAt ?? null;
  const updatedAt = row.updated_at ?? row.updatedAt ?? null;

  console.log(`➡️  ${currentId || '<no-id>'} → ${targetId}`);

  if (dryRun) {
    return;
  }

  await client.execute('BEGIN');
  try {
    const existingTarget = await client.execute({
      sql: 'SELECT id, first_name, last_name, email FROM users WHERE id = ?1',
      args: [targetId]
    });
    const hasTarget = existingTarget.rows?.length > 0;

    if (!hasTarget) {
      await client.execute({ sql: 'UPDATE users SET email = NULL WHERE id = ?1', args: [currentId] });
      await client.execute({
        sql: `INSERT INTO users (id, email, first_name, last_name, created_at, updated_at)
              VALUES (?1, ?2, ?3, ?4, COALESCE(?5, datetime('now')), COALESCE(?6, datetime('now')))` ,
        args: [targetId, email.toLowerCase(), firstName, lastName, createdAt, updatedAt]
      });
    } else {
      const targetRow = existingTarget.rows[0];
      await client.execute({
        sql: `UPDATE users
              SET first_name = CASE WHEN (first_name IS NULL OR length(first_name) = 0) AND length(?2) > 0 THEN ?2 ELSE first_name END,
                  last_name = CASE WHEN (last_name IS NULL OR length(last_name) = 0) AND length(?3) > 0 THEN ?3 ELSE last_name END,
                  email = CASE WHEN length(?4) > 0 THEN lower(?4) ELSE email END,
                  updated_at = datetime('now')
              WHERE id = ?1`,
        args: [targetId, firstName || '', lastName || '', email]
      });
    }

    await client.execute({ sql: 'UPDATE updates SET uid = ?1 WHERE uid = ?2', args: [targetId, currentId] });
    await client.execute({ sql: 'UPDATE update_votes SET uid = ?1 WHERE uid = ?2', args: [targetId, currentId] });

    await client.execute({ sql: 'DELETE FROM users WHERE id = ?1', args: [currentId] });

    await client.execute('COMMIT');
  } catch (error) {
    try {
      await client.execute('ROLLBACK');
    } catch (rollbackError) {
      console.error('⚠️ rollback failed:', rollbackError?.message || rollbackError);
    }
    throw error;
  }
}

async function main() {
  const client = await getClient();
  const result = await client.execute('SELECT id, email, first_name, last_name, created_at, updated_at FROM users');
  const rows = result.rows || [];
  let changed = 0;

  for (const row of rows) {
    const currentId = String(row.id ?? '').trim();
    const email = String(row.email ?? '').trim();
    if (!email) {
      console.warn(`⚠️  Skipping ${currentId || '<no-id>'}: missing email`);
      continue;
    }
    const targetId = normalizeEmail(email);
    if (!targetId) {
      console.warn(`⚠️  Skipping ${currentId || '<no-id>'}: could not normalize email ${email}`);
      continue;
    }
    if (targetId === currentId) {
      continue;
    }
    await migrateUser(client, row, targetId);
    if (!dryRun) changed += 1;
  }

  console.log(`✅ Processed ${rows.length} users (${changed} normalized)${dryRun ? ' [dry-run]' : ''}`);
}

main().catch((err) => {
  console.error('❌ Normalization failed:', err?.message || err);
  process.exit(1);
});
