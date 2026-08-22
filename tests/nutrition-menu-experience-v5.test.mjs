import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const api=require('../nutrition-menu-experience-v5.js');

test('daily totals and remaining macros are deterministic',()=>{
  const meals=[{date:'2026-08-22',kcal:500,p:40,c:60,f:12},{date:'2026-08-22',kcal:700,p:55,c:80,f:18},{date:'2026-08-21',kcal:999,p:99,c:99,f:99}];
  const used=api.totalsForDate(meals,'2026-08-22');
  assert.deepEqual(used,{kcal:1200,protein:95,carbs:140,fat:30});
  assert.deepEqual(api.remaining({kcal:2200,protein:160,carbs:250,fat:70},used),{kcal:1000,protein:65,carbs:110,fat:40});
});

test('day status prioritizes protein when energy is already advanced',()=>{
  const status=api.dayStatus({kcal:2000,protein:160},{kcal:1250,protein:70});
  assert.equal(status.tone,'warn');
  assert.match(status.label,/Proteína/);
});

test('meal distribution exposes actual calorie split',()=>{
  const rows=api.mealDistribution({items:[{slot:'Desayuno',k:500,p:35,recipe:{n:'A'}},{slot:'Comida',k:750,p:50,recipe:{n:'B'}},{slot:'Cena',k:750,p:55,recipe:{n:'C'}}]});
  assert.equal(rows.length,3);
  assert.equal(rows.reduce((s,x)=>s+x.share,0),100);
  assert.equal(rows[1].kcal,750);
});
