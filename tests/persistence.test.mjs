import assert from 'node:assert/strict';
await import('../persistence.js');

const { cleanBackup, storeBackup, esc, imageData } = globalThis.RecompPersistence;

assert.equal(esc('<img src=x onerror=alert(1)>'), '&lt;img src=x onerror=alert(1)&gt;');
assert.equal(imageData('javascript:alert(1)'), '');
assert.equal(imageData('data:image/svg+xml;base64,PHN2Zz4='), '');
assert.match(imageData('data:image/png;base64,aGVsbG8='), /^data:image\/png/);

const cleaned = cleanBackup({
  profile: { name: '  Usuario seguro  ' },
  targets: { kcal: 999999, protein: -1 },
  workouts: Array.from({ length: 1005 }, (_, index) => ({
    date: '2026-08-11', day: 'Lunes', notes: 'x'.repeat(800),
    exercises: [{ name: 'Press', sets: [{ kg: 100, reps: 8, rir: null }] }],
    volume: index
  })),
  photos: [{ data: 'javascript:alert(1)' }]
});
assert.equal(cleaned.profile.name, 'Usuario seguro');
assert.equal(cleaned.targets.kcal, 10000);
assert.equal(cleaned.targets.protein, 0);
assert.equal(cleaned.workouts.length, 1000);
assert.equal(cleaned.workouts[0].notes.length, 500);
assert.equal(cleaned.workouts[0].exercises[0].sets[0].rir, null);
assert.equal(cleaned.photos.length, 0);

const values = new Map([['profile', '{"name":"Anterior"}']]);
let writes = 0;
const storage = {
  getItem: key => values.has(key) ? values.get(key) : null,
  setItem: (key, value) => {
    writes++;
    if (writes === 2) throw new Error('QuotaExceededError');
    values.set(key, value);
  },
  removeItem: key => values.delete(key)
};
assert.throws(() => storeBackup({ profile: { name: 'Nuevo' }, targets: { kcal: 2000 } }, storage));
assert.equal(values.get('profile'), '{"name":"Anterior"}');
assert.equal(values.has('targets'), false);

console.log('Persistence tests passed');
