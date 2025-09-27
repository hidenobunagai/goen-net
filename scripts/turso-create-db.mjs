// Turso DB creation script using the Platform API.
// Requires: TURSO_API_TOKEN and TURSO_ORG (organization slug or account name)
// Optionally set TURSO_DB_NAME (default: goen-net-db) and TURSO_GROUP_NAME (default: goen-net-group)

const TOKEN = process.env.TURSO_API_TOKEN;
const ORG = process.env.TURSO_ORG || process.env.TURSO_ORG_SLUG;
const DB_NAME = process.env.TURSO_DB_NAME || 'goen-net-db';
const GROUP_NAME = process.env.TURSO_GROUP || process.env.TURSO_GROUP_NAME || 'goen-net-group';

if (!TOKEN) {
  console.error('TURSO_API_TOKEN is not set. In PowerShell:');
  console.error('$env:TURSO_API_TOKEN = "<your-api-token>"; $env:TURSO_ORG = "<org-slug>"; node scripts/turso-create-db.mjs');
  process.exit(1);
}
if (!ORG) {
  console.error('TURSO_ORG (organization/account slug) is not set. In PowerShell:');
  console.error('$env:TURSO_ORG = "<org-slug>"; node scripts/turso-create-db.mjs');
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
  try {
    data = await res.json();
  } catch (_) {
    // ignore JSON parse errors
  }
  return { status: res.status, ok: res.ok, data };
}

async function ensureGroup() {
  // Try to find an existing group in this organization
  let resp = await req(`/organizations/${encodeURIComponent(ORG)}/groups`);
  if (resp.ok) {
    const groups = resp.data?.groups || resp.data?.result || [];
    if (Array.isArray(groups) && groups.length) {
      const wanted = groups.find(g => (g.name || g.Name)?.toLowerCase() === GROUP_NAME.toLowerCase());
      if (wanted?.name) return wanted.name;
      if (wanted?.Name) return wanted.Name;
    }
  }

  // Create the requested group
  const loc = await pickLocation();
  const created = await req(`/organizations/${encodeURIComponent(ORG)}/groups`, {
    method: 'POST',
    body: JSON.stringify({ name: GROUP_NAME, location: loc })
  });
  if (!created.ok) {
    const msg = JSON.stringify(created.data || {});
    if (created.status === 409 || msg.toLowerCase().includes('exists')) return GROUP_NAME;
    throw new Error(`Failed to create group: ${msg}`);
  }
  return created.data?.group?.name || created.data?.result?.name || GROUP_NAME;
}

async function pickLocation() {
  const resp = await req('/locations');
  const map = resp.data?.locations || {};
  const codes = Object.keys(map);
  const preferred = ['nrt', 'lhr', 'ams', 'sjc'];
  const found = preferred.find(p => codes.includes(p));
  return found || codes[0] || 'lhr';
}

async function findDbByName(name) {
  const { ok, data } = await req(`/organizations/${encodeURIComponent(ORG)}/databases`);
  if (!ok) return null;
  const list = data?.databases || data?.result || [];
  return Array.isArray(list) ? (list.find(db => (db.name || db.Name) === name) || null) : null;
}

async function createDb(name) {
  const group = await ensureGroup();
  const resp = await req(`/organizations/${encodeURIComponent(ORG)}/databases`, {
    method: 'POST',
    body: JSON.stringify({ name, group })
  });
  if (resp.ok) return resp.data;
  const msg = JSON.stringify(resp.data || {});
  if (resp.status === 409 || msg.toLowerCase().includes('exists')) {
    const existing = await findDbByName(name);
    return existing ? { result: existing, alreadyExists: true } : resp.data;
  }
  throw new Error(`Failed to create database: ${msg}`);
}

async function main() {
  try {
    const created = await createDb(DB_NAME);
    const result = created?.result || created; // normalize

    const out = {
      name: result?.name || result?.Name || DB_NAME,
      id: result?.id || result?.uuid || result?.DbId || undefined,
      hostname: result?.hostname || result?.Hostname || result?.host || undefined,
      url: (result?.hostname || result?.Hostname) ? `libsql://${result.hostname || result.Hostname}` : undefined,
      raw: created
    };

    // Write to turso-db.json at repo root
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    const outPath = path.resolve(process.cwd(), 'turso-db.json');
    await fs.writeFile(outPath, JSON.stringify(out, null, 2), 'utf8');

    console.log('Turso DB created or found successfully. Summary saved to turso-db.json');
    console.log(JSON.stringify(out, null, 2));
  } catch (err) {
    console.error(err?.message || err);
    process.exit(1);
  }
}

main();
