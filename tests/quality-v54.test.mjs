import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const quality=require('../quality-v54.js');

test('whole-unit rounding does not reject a small valid ingredient portion',()=>{
 // The source-ledger regression in usda-catalog.test.mjs reproduces this meal.
 assert.equal(quality.validMeal({k:52,p:7,c:4,f:2}),true);
 assert.equal(quality.macroCalories({p:7,c:4,f:2}),62);
 assert.equal(quality.validMeal({k:52,p:10,c:10,f:2}),false);
});
test('rounding allowance is bounded and does not change the daily energy limit',()=>{
 assert.equal(quality.validMeal({k:52,p:7,c:4,f:3}),false);
 assert.equal(quality.validMeal({k:52,p:7.1,c:4,f:2}),false);
 const items=Array.from({length:4},()=>({k:52,p:7,c:4,f:2}));
 const plan={days:[{items,energyDistribution:{shares:[.25,.25,.25,.25]}}],preferences:{meals:4,kcal:180}};
 assert.throws(()=>quality.validatePlan(plan),/objetivo energético/);
});

test('rejects days outside the supported 3-7 intake range',()=>{assert.throws(()=>quality.validatePlan({days:[{items:[{k:100},{k:100}]}],preferences:{}},{days:1}),/entre 3 y 7/);});
test('rejects a day with fewer meals than requested',()=>{assert.throws(()=>quality.validatePlan({days:[{items:[{k:500},{k:500},{k:500}]}],preferences:{meals:4}},{days:1,meals:4}),/esperabas 4 tomas/);});
test('accepts a complete four-meal day with matching distribution',()=>{const plan={days:[{items:[{k:528,p:35,c:60,f:16},{k:816,p:45,c:95,f:28},{k:336,p:25,c:35,f:10},{k:720,p:45,c:80,f:24}],energyDistribution:{shares:[.22,.34,.14,.30]}}],preferences:{meals:4,kcal:2400}};assert.equal(quality.validatePlan(plan,{days:1,meals:4,kcal:2400}),plan);});
test('rejects a plan with fewer requested days',()=>{const day={items:[{k:500,p:30,c:50,f:15},{k:500,p:30,c:50,f:15},{k:500,p:30,c:50,f:15},{k:500,p:30,c:50,f:15}],energyDistribution:{shares:[.25,.25,.25,.25]}};assert.throws(()=>quality.validatePlan({days:[day],preferences:{meals:4}},{days:2,meals:4}),/se solicitaron 2 días/);});
test('rejects malformed energy shares even when meal count matches',()=>{const base={items:Array.from({length:4},()=>({k:500,p:30,c:50,f:15}))};assert.throws(()=>quality.validatePlan({days:[{...base,energyDistribution:{shares:[.4,.4,.4,-.2]}}],preferences:{meals:4}},{days:1,meals:4}),/reparto energético inconsistente/);assert.throws(()=>quality.validatePlan({days:[{...base,energyDistribution:{shares:[.2,.2,.2,.2]}}],preferences:{meals:4}},{days:1,meals:4}),/reparto energético inconsistente/);assert.equal(quality.validShares([.22,.34,.14,.30],4),true);});
test('rejects a fake declared distribution when actual calories are concentrated',()=>{const day={items:[{k:1776,p:100,c:180,f:60},{k:240,p:20,c:20,f:8},{k:192,p:15,c:20,f:6},{k:192,p:15,c:20,f:6}],energyDistribution:{shares:[.22,.34,.14,.30]}};assert.throws(()=>quality.validatePlan({days:[day],preferences:{meals:4,kcal:2400}},{days:1,meals:4,kcal:2400}),/concentra demasiada energía/);});
test('rejects declared shares that do not match actual meal calories',()=>{const day={items:Array.from({length:4},()=>({k:600,p:35,c:60,f:18})),energyDistribution:{shares:[.22,.34,.14,.30]}};assert.throws(()=>quality.validatePlan({days:[day],preferences:{meals:4,kcal:2400}},{days:1,meals:4,kcal:2400}),/reparto energético inconsistente/);assert.deepEqual(quality.actualShares(day.items).map(v=>Number(v.toFixed(2))),[.25,.25,.25,.25]);});
test('rejects non-finite negative or calorie-incoherent meal macros',()=>{const valid=[{k:528,p:35,c:60,f:16},{k:816,p:45,c:95,f:28},{k:336,p:25,c:35,f:10},{k:720,p:45,c:80,f:24}];const broken=valid.map(x=>({...x}));broken[2].p=NaN;assert.throws(()=>quality.validatePlan({days:[{items:broken,energyDistribution:{shares:[.22,.34,.14,.30]}}],preferences:{meals:4,kcal:2400}},{days:1,meals:4,kcal:2400}),/macros de comida no válidos/);assert.equal(quality.validMeal({k:500,p:30,c:50,f:15}),true);assert.equal(quality.validMeal({k:500,p:-1,c:50,f:15}),false);assert.equal(quality.validMeal({k:700,p:10,c:10,f:5}),false);});
test('requires an explicit energy distribution after balancing',()=>{const items=Array.from({length:4},()=>({k:600,p:35,c:60,f:18}));assert.throws(()=>quality.validatePlan({days:[{items}],preferences:{meals:4,kcal:2400}},{days:1,meals:4,kcal:2400}),/reparto energético inconsistente/);});

