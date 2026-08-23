import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

function loadInlineRecipes(){
  const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
  const match=html.match(/const recipes=(\[[\s\S]*?\]);\s*const S=/);
  assert.ok(match,'No se pudo localizar la biblioteca activa de recetas en index.html');
  return JSON.parse(match[1]);
}

const amount=/^\s*\d+(?:[.,]\d+)?\s*(?:g|ml)\b/i;
const ambiguousDry=/\b(?:arroz|pasta|quinoa|cusc[uú]s|avena|noodles)\b/i;
const state=/\b(?:crudo|cruda|seco|seca|cocido|cocida|preparado|preparada)\b/i;

test('cada ingrediente de cada receta activa declara una cantidad medible en g o ml',()=>{
  const recipes=loadInlineRecipes();
  const invalid=[];
  for(const recipe of recipes){
    for(const ingredient of recipe.i||[]){
      if(!amount.test(String(ingredient))) invalid.push(`${recipe.n}: ${ingredient}`);
    }
  }
  assert.deepEqual(invalid,[],`Ingredientes sin gramos/ml explícitos:\n${invalid.slice(0,40).join('\n')}${invalid.length>40?`\n… +${invalid.length-40} más`:''}`);
});

test('cereales y féculas de peso variable declaran si el peso es crudo/seco o cocido',()=>{
  const recipes=loadInlineRecipes();
  const ambiguous=[];
  for(const recipe of recipes){
    for(const ingredient of recipe.i||[]){
      const text=String(ingredient);
      if(ambiguousDry.test(text)&&!state.test(text)) ambiguous.push(`${recipe.n}: ${text}`);
    }
  }
  assert.deepEqual(ambiguous,[],`Pesos ambiguos crudo/cocido:\n${ambiguous.slice(0,40).join('\n')}${ambiguous.length>40?`\n… +${ambiguous.length-40} más`:''}`);
});

test('kcal declaradas son coherentes con los macros declarados',()=>{
  const recipes=loadInlineRecipes();
  const inconsistent=[];
  for(const recipe of recipes){
    const macroKcal=Number(recipe.p)*4+Number(recipe.c)*4+Number(recipe.f)*9;
    const declared=Number(recipe.k);
    const relative=Math.abs(macroKcal-declared)/Math.max(1,declared);
    if(!Number.isFinite(relative)||relative>0.08) inconsistent.push(`${recipe.n}: ${declared} kcal vs ${Math.round(macroKcal)} kcal por macros`);
  }
  assert.deepEqual(inconsistent,[],`Recetas con energía/macros incoherentes (>8%):\n${inconsistent.join('\n')}`);
});
