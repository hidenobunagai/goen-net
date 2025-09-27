import { createClient } from '@libsql/client';

async function loadJson(path) {
  const fs = await import('node:fs/promises');
  const raw = await fs.readFile(path, 'utf8');
  return JSON.parse(raw);
}

async function main() {
  try {
    const db = await loadJson('turso-db.json');
    const token = await loadJson('turso-db-token.json');

    const url = db.url || (db.raw?.database?.Hostname ? `libsql://${db.raw.database.Hostname}` : null);
    if (!url) throw new Error('No database URL. Ensure turso-db.json has a hostname.');

    const client = createClient({ url, authToken: token.token });
    const res = await client.execute('select 1 as ok');
    console.log('Query result:', res.rows);
  } catch (err) {
    console.error(err?.message || err);
    process.exit(1);
  }
}

main();
