import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('la UI avisa cuando una cantidad de ingrediente ha sido inferida y no procede de la receta',()=>{
  const ui=readFileSync(new URL('../meal-planner-ui.js',import.meta.url),'utf8');
  assert.match(ui,/quantityEstimated/,'La UI de receta debe consultar quantityEstimated antes de presentar cantidades inferidas como si fueran exactas.');
  assert.match(ui,/cantidad(?:es)?\s+(?:estimada|inferida)|estimad[ao]\/inferid[ao]|cantidad no verificada/i,'La receta debe mostrar un aviso visible cuando alguna cantidad ha sido inferida.');
});
