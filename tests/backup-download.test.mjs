import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');

assert.match(html, /recomp-10m-backup-/);
assert.doesNotMatch(html, /fitcoach-backup-/);
assert.match(html, /document\.body\.appendChild\(a\)/);
assert.match(html, /a\.remove\(\)/);
assert.match(html, /URL\.revokeObjectURL\(u\)/);
assert.match(html, /try\{a\.click\(\)\}finally/);

console.log('Backup download safety tests passed');
