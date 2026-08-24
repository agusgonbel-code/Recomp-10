import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('el bundle inicial no contiene identidad ni antropometría personal precargada', () => {
  const forbidden = [
    /Hola,\s*Agust[ií]n/i,
    /id=['"]profileName['"][^>]*value=['"]Agust[ií]n['"]/i,
    /id=['"]dWeight['"]>\s*81\s*kg/i,
    /id=['"]age['"][^>]*value=['"]46['"]/i,
    /id=['"]weight['"][^>]*value=['"]81['"]/i,
    /id=['"]height['"][^>]*value=['"]181['"]/i
  ];
  const leaks = forbidden.filter(pattern => pattern.test(html)).map(pattern => pattern.toString());
  assert.deepEqual(leaks, [], `El HTML distribuido expone datos personales antes de inicializar el estado:\n${leaks.join('\n')}`);
});

test('un usuario sin objetivos guardados no hereda los macros personales de desarrollo', () => {
  const personalTargets = /S\.g\(['"]targets['"],\s*\{\s*kcal\s*:\s*3014\s*,\s*protein\s*:\s*156\s*,\s*carbs\s*:\s*422\s*,\s*fat\s*:\s*78\s*\}\)/;
  assert.equal(personalTargets.test(html), false, 'El bundle aún contiene objetivos personales como fallback de producción');
});
