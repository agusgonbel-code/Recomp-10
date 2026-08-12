import assert from 'node:assert/strict';
await import('../coach-engine.js');
const { recentWorkouts, averageRir, weightTrend, buildCoachInsights } = globalThis.RecompCoach;

const now = '2026-08-12T18:00:00Z';
const workouts = [
  { date: '2026-08-11T12:00:00Z', exercises: [{ sets: [{ rir: 0 }, { rir: 1 }] }] },
  { date: '2026-08-07T12:00:00Z', exercises: [{ sets: [{ rir: '' }, { rir: null }] }] },
  { date: '2026-08-01T12:00:00Z', exercises: [] }
];
assert.equal(recentWorkouts(workouts, now).length, 2);
assert.equal(averageRir(workouts), 0.5);

const morning = buildCoachInsights({ now, hour: 9, workouts: [], totals: { p: 0 }, targets: { protein: 160 } });
assert.equal(morning.insights.some(item => item.title === 'Proteína pendiente'), false);
assert.equal(morning.insights[0].title, 'Empieza por registrar');

const hard = buildCoachInsights({ now, hour: 18, workouts, targetSessions: 4, totals: { p: 60 }, targets: { protein: 160 } });
assert.equal(hard.insights.some(item => item.title === 'Esfuerzo muy alto'), true);
assert.equal(hard.insights.some(item => item.title === 'Proteína pendiente'), true);
assert.equal(hard.evidence.averageRir, 0.5);

const metrics = [
  { date: '2026-07-25', weight: 80 }, { date: '2026-07-28', weight: 80.1 },
  { date: '2026-08-05', weight: 81.2 }, { date: '2026-08-12', weight: 81.3 }
];
const trend = weightTrend(metrics);
assert.equal(trend.samples, 4);
assert.equal(trend.percent > 1, true);
const result = buildCoachInsights({ now, workouts: Array(4).fill(workouts[0]), metrics, targetSessions: 4 });
assert.equal(result.insights.some(item => item.title === 'Revisa la tendencia de peso'), true);

assert.equal(weightTrend(metrics.slice(0, 3)), null);
console.log('Coach engine tests passed');
