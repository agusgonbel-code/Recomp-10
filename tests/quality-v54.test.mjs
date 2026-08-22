import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const quality=require('../quality-v54.js');

test('rejects days outside the supported 3-6 meal range',()=>{
  assert.throws(()=>quality.validatePlan({days:[{items:[{k:100},{k:100}]}],preferences:{}},{days:1}),/entre 3 y 6/);
});

test('rejects a day with fewer meals than requested',()=>{
  assert.throws(()=>quality.validatePlan({days:[{items:[{k:500},{k:500},{k:500}]}],preferences:{meals:4}},{days:1,meals:4}),/esperabas 4 comidas/);
});

test('accepts a complete four-meal day with matching distribution',()=>{
  const plan={days:[{items:[{k:528},{k:816},{k:336},{k:720}],energyDistribution:{shares:[.22,.34,.14,.30]}}],preferences:{meals:4}};
  assert.equal(quality.validatePlan(plan,{days:1,meals:4}),plan);
});

test('rejects a plan with fewer requested days',()=>{
  const day={items:[{k:500},{k:500},{k:500},{k:500}]};
  assert.throws(()=>quality.validatePlan({days:[day],preferences:{meals:4}},{days:2,meals:4}),/se solicitaron 2 días/);
});
