import assert from 'node:assert/strict';
await import('../training-engine.js');

const {
  parseRepRange, normalizeSet, lastExercise, bestLoad, sessionVolume, progressionAdvice
} = globalThis.RecompTraining;

assert.deepEqual(parseRepRange('6-10'), { low: 6, high: 10 });
assert.deepEqual(parseRepRange('30-45 s'), { low: 30, high: 45 });
assert.deepEqual(normalizeSet({ kg: -5, reps: 8.7, rir: '' }), { kg: 0, reps: 9, rir: null });
assert.deepEqual(normalizeSet({ kg: 5000, reps: 2000, rir: 20 }), { kg: 2000, reps: 1000, rir: 10 });

const workouts = [
  { exercises: [{ name: 'Press', sets: [{ kg: 70, reps: 8, rir: 2 }] }] },
  { exercises: [{ name: 'Press', sets: [{ kg: 72.5, reps: 10, rir: 2 }, { kg: 72.5, reps: 10, rir: 2 }] }] }
];
assert.equal(lastExercise(workouts, 'Press'), workouts[1].exercises[0]);
assert.equal(lastExercise(workouts, 'Remo'), null);
assert.equal(bestLoad(workouts, 'Press'), 72.5);
assert.equal(sessionVolume(workouts[1].exercises), 1450);

assert.match(progressionAdvice([], 'Press', '6-10'), /Primera sesión/);
assert.match(progressionAdvice(workouts, 'Press', '6-10'), /sube la carga un 2,5-5%/);
assert.match(progressionAdvice([
  { exercises: [{ name: 'Press', sets: [{ kg: 80, reps: 5, rir: 0 }] }] }
], 'Press', '6-10'), /Reduce la carga/);
assert.match(progressionAdvice([
  { exercises: [{ name: 'Press', sets: [{ kg: 70, reps: 8, rir: 2 }] }] }
], 'Press', '6-10'), /sumar 1 repetición total/);
assert.match(progressionAdvice([
  { exercises: [{ name: 'Press', sets: [{ kg: 70, reps: 8, rir: null }] }] }
], 'Press', '6-10'), /registra el RIR/);

console.log('Training engine tests passed');
