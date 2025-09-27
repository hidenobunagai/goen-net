// Generate a database auth token for Turso and save it to turso-db-token.json
// Requires: TURSO_API_TOKEN env var and existing turso-db.json

const TOKEN = process.env.TURSO_API_TOKEN;
if (!TOKEN) {
  console.error('TURSO_API_TOKEN is not set. In PowerShell:');
  console.error('$env:TURSO_API_TOKEN = "<your-api-token>"; node scripts/turso-create-db-token.mjs');
  process.exit(1);
}

const BASE = 'https://api.turso.tech/v1';
const headers = {
  'Authorization': `Bearer ${TOKEN}`,
  'Content-Type': 'application/json'
};

async function req(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, { headers, ...options });
  let data = null;
  try { data = await res.json(); } catch (_) {}
  return { status: res.status, ok: res.ok, data };
}

async function loadDbInfo() {
  const fs = await import('node:fs/promises');
  const path = await import('node:path');
  const file = path.resolve(process.cwd(), 'turso-db.json');
  const raw = await fs.readFile(file, 'utf8');
  const json = JSON.parse(raw);
  const name = json.name || json.raw?.database?.Name;
  const hostname = json.hostname || json.raw?.database?.Hostname;
  const username = json.raw?.username || (hostname?.split('-').pop()?.split('.')?.[0]);
  if (!name || !hostname) throw new Error('turso-db.json is missing required fields. Re-run turso-create-db first.');
  return { name, hostname, username };
}

async function tryCreateToken(org, db) {
  const attempts = [
    { path: `/organizations/${org}/databases/${db}/auth/tokens`, body: {} },
    { path: `/organizations/${org}/databases/${db}/tokens`, body: { type: 'token', name: 'rw' } },
    { path: `/databases/${db}/auth/tokens`, body: {} }
  ];
  for (const a of attempts) {
    const res = await req(a.path, { method: 'POST', body: JSON.stringify(a.body) });
    const data = res.data || {};
    const token = data?.token || data?.auth_token || data?.jwt || data?.result?.token || data?.result?.jwt;
    if (res.ok && token) return { token, provider: a.path };
  }
  throw new Error('Failed to create database auth token: no known endpoint succeeded');
}

async function main() {
  try {
    const { name, hostname, username } = await loadDbInfo();
    const org = process.env.TURSO_ORG || process.env.TURSO_ORG_SLUG || username;
    if (!org) throw new Error('Cannot infer organization slug. Set TURSO_ORG to your account/organization slug.');
    const { token, provider } = await tryCreateToken(org, name);

    const payload = { name, hostname, org, token, provider };
    const fs = await import('node:fs/promises');
    await fs.writeFile('turso-db-token.json', JSON.stringify(payload, null, 2), 'utf8');
    console.log('Created DB auth token. Saved to turso-db-token.json');
    console.log(JSON.stringify(payload, null, 2));
  } catch (err) {
    console.error(err?.message || err);
    process.exit(1);
  }
}

main();
