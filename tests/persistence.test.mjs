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


const { createJsonStore } = globalThis.RecompPersistence;
function memoryStorage(entries = []) {
  const data = new Map(entries);
  return {
    data,
    getItem: key => data.has(key) ? data.get(key) : null,
    setItem: (key, value) => data.set(key, value),
    removeItem: key => data.delete(key)
  };
}

const corruptStorage = memoryStorage([
  ['workouts', '{broken'],
  ['recomp:last-good:workouts', JSON.stringify([{ date: '2026-08-11', volume: 1200 }])]
]);
const recoveredStore = createJsonStore({ storage: corruptStorage, prefix: 'recomp' });
assert.deepEqual(recoveredStore.g('workouts', []), [{ date: '2026-08-11', volume: 1200 }]);
assert.equal(recoveredStore.recoveredKeys.has('workouts'), true);
assert.deepEqual(recoveredStore.g('targets', { kcal: 2800, protein: 170 }), { kcal: 2800, protein: 170 });

const shapeStorage = memoryStorage([['targets', JSON.stringify([])]]);
const shapeStore = createJsonStore({ storage: shapeStorage, prefix: 'recomp' });
assert.deepEqual(shapeStore.g('targets', { kcal: 2800 }), { kcal: 2800 });

const rollbackStorage = memoryStorage([['workouts', JSON.stringify([{ volume: 1000 }])]]);
const originalSet = rollbackStorage.setItem;
let primaryWrites = 0;
rollbackStorage.setItem = (key, value) => {
  if (key === 'workouts' && ++primaryWrites === 1) throw new Error('QuotaExceededError');
  originalSet(key, value);
};
let reported = '';
const rollbackStore = createJsonStore({
  storage: rollbackStorage,
  prefix: 'recomp',
  onError: error => { reported = error.message; }
});
assert.throws(() => rollbackStore.s('workouts', [{ volume: 2000 }]), /QuotaExceeded/);
assert.deepEqual(JSON.parse(rollbackStorage.getItem('workouts')), [{ volume: 1000 }]);
assert.equal(rollbackStorage.getItem('recomp:last-good:workouts'), null);
assert.equal(reported, 'QuotaExceededError');


const resetStorage = memoryStorage([
  ['workouts', JSON.stringify([{ volume: 900 }])],
  ['recomp:last-good:workouts', JSON.stringify([{ volume: 800 }])],
  ['profile', JSON.stringify({ name: 'Usuario' })],
  ['fitcoach:user-data', JSON.stringify({ sessions: 42 })]
]);
const resetStore = createJsonStore({ storage: resetStorage, prefix: 'recomp' });
resetStore.recoveredKeys.add('workouts');
resetStore.clear(['workouts', 'profile', 'workouts']);
assert.equal(resetStorage.getItem('workouts'), null);
assert.equal(resetStorage.getItem('recomp:last-good:workouts'), null);
assert.equal(resetStorage.getItem('profile'), null);
assert.equal(resetStorage.getItem('fitcoach:user-data'), JSON.stringify({ sessions: 42 }));
assert.equal(resetStore.recoveredKeys.has('workouts'), false);
assert.throws(() => resetStore.clear('workouts'), /lista de claves/);

console.log('Persistence tests passed');
