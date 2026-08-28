import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);const e=require('../recomp-trend-v3.js');

test('favorable recomp keeps calories stable',()=>{const r=e.evaluate({goal:'recomp',adherence:.9,weights:[80,80.1,79.9,80,79.8,79.9],waists:[90,89.8,89.5,89,88.8,88.5],performance:[100,101,102,102,103,103]});assert.equal(r.action,'maintain');assert.equal(r.kcalDelta,0);});

test('low adherence blocks calorie changes',()=>{const r=e.evaluate({goal:'recomp',adherence:.5,weights:[80,81,82,83],waists:[90,91,92,93],performance:[100,98,95,92]});assert.equal(r.kcalDelta,0);assert.equal(r.confidence,'low');});

test('weight and waist rising together reduce energy modestly',()=>{const r=e.evaluate({goal:'recomp',adherence:.95,weights:[80,80.4,81,81.4,82,82.2],waists:[90,90.5,91,91.5,92,92.3],performance:[100,101,101,102,102,103]});assert.equal(r.action,'reduce');assert.equal(r.kcalDelta,-125);});

const rising = { goal: 'recomp', weights: [80,81,82,83], waists: [90,91,92,93] };
test('missing or invalid adherence cannot justify calorie changes', () => {
  for (const adherence of [undefined, null, '', 'invalid', NaN, Infinity, -1, 2, true, [1], {}]) {
    const result = e.evaluate({ ...rising, adherence });
    assert.equal(result.kcalDelta, 0, `adherence=${adherence}`);
    assert.equal(result.confidence, 'low');
    assert.equal(result.signals.adherence, 0);
  }
});

test('meal coverage counts distinct recent local calendar days, not meals', () => {
  const now = new Date(2026, 7, 28, 12);
  const logs = [{date:'2026-08-22'}, {date:'2026-08-22'}, {date:'2026-08-28'},
    {date:'2026-08-21'}, {date:'2026-08-29'}, {date:'2026-07-01'}];
  assert.deepEqual(e.mealLogCoverage(logs, now), { days: 2, windowDays: 7, ratio: 2/7 });
  assert.equal(e.mealLogCoverage(Array.from({length:7}, (_, i) => ({date:`2026-08-${22+i}`})), now).ratio, 1);
});

test('empty, malformed, future and impossible meal dates give no coverage', () => {
  const now = new Date(2026, 2, 2, 12);
  for (const logs of [null, {}, [], [null, {}, {date:123}, {date:'2026-02-30'},
    {date:'2026-02-30T12:00:00Z'}, {date:'bad'}, {date:'2026-03-03'}, {date:'2026-03-02T23:59:00'}]]) {
    assert.equal(e.mealLogCoverage(logs, now).ratio, 0);
  }
  assert.equal(e.mealLogCoverage([{date:'2026-03-02'}], new Date('invalid')).ratio, 0);
});

test('timestamp coverage uses the device local day around midnight', () => {
  const now = new Date(2026, 7, 28, 0, 15);
  const start = new Date(2026, 7, 22);
  const logs = [{date:start.toISOString()}, {date:new Date(+start-1).toISOString()},
    {date:now.toISOString()}, {date:new Date(+now+1).toISOString()}];
  assert.equal(e.mealLogCoverage(logs, now).days, 2);
});

test('coverage window follows calendar dates across daylight-saving changes', () => {
  for (const [month, day, dates] of [[2,31,[25,26,27,28,29,30,31]], [9,27,[21,22,23,24,25,26,27]]]) {
    const now = new Date(2026, month, day, 0, 15);
    const logs = dates.map(d => ({date:new Date(2026,month,d).toISOString()}));
    assert.equal(e.mealLogCoverage(logs,now).days,7);
  }
});

test('trend UI blocks changes for no logs or stale logs and refreshes on data changes', async () => {
  const source = await readFile(new URL('../recomp-trend-ui-v3.js', import.meta.url), 'utf8');
  const now = new Date(2026, 7, 28, 12);
  const card = { innerHTML: '' };
  const listeners = {};
  const records = {
    metrics: rising.weights.map((weight,i) => ({weight,waist:rising.waists[i]})),
    workouts: [], recomp_unified_profile_v2: {goal:'recomp'}, meals: []
  };
  const calls = [];
  const context = {
    RecompTrend: { ...e, mealLogCoverage: logs => e.mealLogCoverage(logs, now),
      evaluate: input => { calls.push(input); return e.evaluate(input); } },
    document: { readyState:'complete', getElementById:id => id==='recompTrendCard'?card:null,
      querySelector:()=>({}), addEventListener:(name,fn)=>{listeners[name]=fn;} },
    window: { addEventListener:(name,fn)=>{listeners[name]=fn;} },
    localStorage: { getItem:key=>JSON.stringify(records[key]) }
  };
  vm.runInNewContext(source, context);
  assert.equal(calls.at(-1).adherence,0);
  assert.match(card.innerHTML,/0\/7/);
  assert.doesNotMatch(card.innerHTML,/-125 kcal/);
  records.meals = Array.from({length:7},(_,i)=>({date:`2026-07-${10+i}`}));
  listeners['recomp:data-changed']();
  assert.equal(calls.at(-1).adherence,0);
  records.meals = Array.from({length:7},(_,i)=>({date:`2026-08-${22+i}`}));
  listeners.storage();
  assert.equal(calls.at(-1).adherence,1);
  assert.match(card.innerHTML,/7\/7/);
  // A mixed cached engine/UI version must remain usable and fail closed.
  delete context.RecompTrend.mealLogCoverage;
  listeners.storage();
  assert.equal(calls.at(-1).adherence,0);
  assert.match(card.innerHTML,/0\/7/);
});
