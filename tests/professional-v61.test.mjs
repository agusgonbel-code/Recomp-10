import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const loader=await readFile(new URL('../date-engine.js',import.meta.url),'utf8');
const pro=await readFile(new URL('../professional-v61.css',import.meta.url),'utf8');
test('Recomp loads its professional layer from the early bootstrap',()=>{assert.match(loader,/professional-v61\.css/);assert.match(loader,/data-r10-professional|r10Professional/);});
test('Recomp professional identity cannot show FitCoach F mark',()=>{assert.match(pro,/content:'R'!important/);});
test('Recomp polish preserves touch, focus and reduced motion',()=>{assert.match(pro,/min-height:44px/);assert.match(pro,/focus-visible/);assert.match(pro,/prefers-reduced-motion/);});
