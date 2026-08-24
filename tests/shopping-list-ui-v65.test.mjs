import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const ui=readFileSync(new URL('../meal-planner-ui.js',import.meta.url),'utf8');

test('la lista de compra muestra la cantidad total agregada cuando está disponible',()=>{
  assert.match(ui,/x\.amount!=null&&x\.unit/);
  assert.match(ui,/x\.amount\+' '\+x\.unit/);
});

test('la lista de compra conserva un fallback explícito para ingredientes no cuantificables',()=>{
  assert.match(ui,/×'\+x\.count/);
});
