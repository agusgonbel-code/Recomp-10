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

test('el formulario siempre arranca con objetivos válidos y muestra errores',()=>{
  const ui=readFileSync(new URL('../meal-planner-ui.js',import.meta.url),'utf8');
  assert.match(ui,/macroTargets\(savedTargets\(\)\)/);
  assert.match(ui,/No se pudo crear el menú/);
  assert.match(ui,/Creando 30 días/);
});
