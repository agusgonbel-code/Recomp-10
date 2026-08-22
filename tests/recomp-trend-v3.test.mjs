import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);const e=require('../recomp-trend-v3.js');

test('favorable recomp keeps calories stable',()=>{const r=e.evaluate({goal:'recomp',adherence:.9,weights:[80,80.1,79.9,80,79.8,79.9],waists:[90,89.8,89.5,89,88.8,88.5],performance:[100,101,102,102,103,103]});assert.equal(r.action,'maintain');assert.equal(r.kcalDelta,0);});

test('low adherence blocks calorie changes',()=>{const r=e.evaluate({goal:'recomp',adherence:.5,weights:[80,81,82,83],waists:[90,91,92,93],performance:[100,98,95,92]});assert.equal(r.kcalDelta,0);assert.equal(r.confidence,'low');});

test('weight and waist rising together reduce energy modestly',()=>{const r=e.evaluate({goal:'recomp',adherence:.95,weights:[80,80.4,81,81.4,82,82.2],waists:[90,90.5,91,91.5,92,92.3],performance:[100,101,101,102,102,103]});assert.equal(r.action,'reduce');assert.equal(r.kcalDelta,-125);});
