#!/usr/bin/env node
import { execSync } from 'node:child_process';

try {
  const out = execSync('git diff --cached --name-only', { encoding: 'utf8' });
  const files = out.split(/\r?\n/).filter(Boolean);
  const banned = files.filter(f => /^\.env(\.|$)/.test(f));
  if (banned.length) {
    console.error('\nERROR: The following environment files are staged and must NOT be committed:\n');
    for (const b of banned) console.error('  - ' + b);
    console.error('\nPlease remove them from the commit (git restore --staged <file>).');
    process.exit(1);
  }
  process.exit(0);
} catch (e) {
  console.error('precommit check failed:', e.message || e);
  process.exit(1);
}
