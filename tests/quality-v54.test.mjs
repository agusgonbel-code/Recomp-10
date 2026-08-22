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
  const plan={days:[{items:[{k:528},{k:816},{k:336},{k:720}],energyDistribution:{shares:[.22,.34,.14,.30]}}],preferences:{meals:4,kcal:2400}};
  assert.equal(quality.validatePlan(plan,{days:1,meals:4,kcal:2400}),plan);
});

test('rejects a plan with fewer requested days',()=>{
  const day={items:[{k:500},{k:500},{k:500},{k:500}]};
  assert.throws(()=>quality.validatePlan({days:[day],preferences:{meals:4}},{days:2,meals:4}),/se solicitaron 2 días/);
});

test('rejects malformed energy shares even when meal count matches',()=>{
  const base={items:[{k:500},{k:500},{k:500},{k:500}]};
  assert.throws(()=>quality.validatePlan({days:[{...base,energyDistribution:{shares:[.4,.4,.4,-.2]}}],preferences:{meals:4}},{days:1,meals:4}),/reparto energético inconsistente/);
  assert.throws(()=>quality.validatePlan({days:[{...base,energyDistribution:{shares:[.2,.2,.2,.2]}}],preferences:{meals:4}},{days:1,meals:4}),/reparto energético inconsistente/);
  assert.equal(quality.validShares([.22,.34,.14,.30],4),true);
});

test('rejects a fake declared distribution when actual calories are concentrated',()=>{
  const day={items:[{k:1776},{k:240},{k:192},{k:192}],energyDistribution:{shares:[.22,.34,.14,.30]}};
  assert.throws(()=>quality.validatePlan({days:[day],preferences:{meals:4,kcal:2400}},{days:1,meals:4,kcal:2400}),/concentra demasiada energía/);
});

test('rejects declared shares that do not match actual meal calories',()=>{
  const day={items:[{k:600},{k:600},{k:600},{k:600}],energyDistribution:{shares:[.22,.34,.14,.30]}};
  assert.throws(()=>quality.validatePlan({days:[day],preferences:{meals:4,kcal:2400}},{days:1,meals:4,kcal:2400}),/reparto energético inconsistente/);
  assert.deepEqual(quality.actualShares(day.items).map(v=>Number(v.toFixed(2))),[.25,.25,.25,.25]);
});
