import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('los scripts usan red primero para no mezclar versiones en iPhone',()=>{
  const sw=readFileSync(new URL('../sw.js',import.meta.url),'utf8');
  assert.match(sw,/destination === 'script'/);
  const scriptBranch=sw.slice(sw.indexOf("destination === 'script'"),sw.indexOf("event.respondWith(",sw.indexOf("destination === 'script'")+80));
  assert.ok(scriptBranch.includes(''));
  const block=sw.slice(sw.indexOf("if (event.request.destination === 'script'"),sw.indexOf("\n  event.respondWith(",sw.indexOf("if (event.request.destination === 'script'")+1));
  assert.ok(block.indexOf('fetch(event.request)')<block.indexOf('caches.match(event.request)'));
});

test('el formulario usa objetivos editables persistentes y soporta planes de 1 a 30 días',()=>{
  const ui=readFileSync(new URL('../meal-planner-ui.js',import.meta.url),'utf8');
  assert.match(ui,/manualKey='recomp10\.manualTargets'/);
  assert.match(ui,/savedManualTargets/);
  assert.match(ui,/persistManualTargets/);
  assert.match(ui,/Usar y guardar estos objetivos/);
  assert.match(ui,/Recuperar calculadora/);
  assert.match(ui,/id="mpDays"[^>]*min="1"[^>]*max="30"/);
  assert.match(ui,/generateDays\(catalog,formValues\(\)\)/);
  assert.match(ui,/Calculando menú/);
  assert.match(ui,/savedManualTargets\(\)\|\|savedTargets\(\)/);
  assert.match(ui,/ingredientDetailsFor\(meal\)/);
  assert.match(ui,/cantidades visibles son exactamente las usadas/);
});
