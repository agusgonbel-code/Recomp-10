import assert from 'node:assert/strict';
await import('../date-engine.js');
const { localDayKey, localTimestamp, shiftLocalDay } = globalThis.RecompDate;

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
assert.equal(shiftLocalDay('2026-08-14', -1), '2026-08-13');
assert.equal(shiftLocalDay('2026-03-01', -1), '2026-02-28');
assert.equal(shiftLocalDay('2024-02-28', 1), '2024-02-29');
assert.throws(() => shiftLocalDay('2026-02-30', 1), /Fecha no válida/);
assert.throws(() => shiftLocalDay('2026-08-14', 1.5), /Desplazamiento/);
console.log('Local date engine tests passed');
