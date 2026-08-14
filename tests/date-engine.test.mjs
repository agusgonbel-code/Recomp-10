import assert from 'node:assert/strict';
await import('../date-engine.js');
const { localDayKey, localTimestamp } = globalThis.RecompDate;

process.env.TZ = 'Europe/Madrid';
let instant = new Date('2026-08-13T22:30:00.125Z');
assert.equal(localDayKey(instant), '2026-08-14');
assert.equal(localTimestamp(instant), '2026-08-14T00:30:00.125+02:00');

process.env.TZ = 'America/Los_Angeles';
assert.equal(localDayKey(instant), '2026-08-13');
assert.equal(localTimestamp(instant), '2026-08-13T15:30:00.125-07:00');

process.env.TZ = 'Pacific/Kiritimati';
instant = new Date('2026-01-01T10:30:00.000Z');
assert.equal(localDayKey(instant), '2026-01-02');
assert.equal(localTimestamp(instant), '2026-01-02T00:30:00.000+14:00');

assert.throws(() => localDayKey('not-a-date'), /Fecha no válida/);
console.log('Local date engine tests passed');
