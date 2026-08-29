const { test, expect } = require('@playwright/test');
test('turkey and lean beef recipes preserve exact raw and cooked states after reload',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:4173/',{waitUntil:'load'});
 const plan=await page.evaluate(()=>{
  const api=globalThis.RecompMealPlanner,ids=['recipe-003','recipe-022','recipe-024','recipe-029','recipe-032','recipe-046'];
  const catalog=api.normalizeRecipeCatalog(recipes);
  const items=ids.map((id,i)=>api.portionFromComposition(catalog.find(r=>r.id===id),['Desayuno','Media mañana','Comida','Merienda','Cena','Snack nocturno'][i],.73));
  const result={createdAt:new Date().toISOString(),preferences:{kcal:2200,protein:160,carbs:250,fat:62,meals:6,days:1},days:[{day:1,items,totals:api.totals(items)}]};
  localStorage.setItem('recomp10.mealPlan30',JSON.stringify(result));return result;
 });
 await page.reload({waitUntil:'load'});
 await page.locator('nav button').filter({hasText:'Menús'}).click();
 await expect(page.locator('.mp-day')).toHaveCount(1);
 for(const [i,meal] of plan.days[0].items.entries()){
  await page.locator('[data-recipe="0,'+i+'"]').click();
  const detail=page.locator('#mpRecipeDetail');
  await expect(detail.locator('h2')).toHaveText(meal.recipe.n);
  await expect(detail.locator('ol li')).toHaveCount(6);
  await expect(detail).toContainText('Macros calculados por ingredientes');
  for(const row of meal.ingredientAmounts){
   await expect(detail).toContainText(row.text);
   expect(Number(row.text.match(/^\d+(?:\.\d+)?/)[0])).toBe(row.qty);
   expect(row.text).toContain(row.state);
   expect(row.source.name).toContain('USDA');
   for(const k of ['k','p','c','f']){const z=k==='k'?1:10;expect(row.nutrients[k]).toBe(Math.round(row.per100[k]*row.qty/100*z+1e-9)/z)}
  }
 }
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('recomp10.mealPlan30')))).toEqual(plan);
 expect(errors).toEqual([]);
});
test('ten additional USDA recipes preserve source states, quantities and steps on reload',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:4173/',{waitUntil:'load'});
 const plan=await page.evaluate(()=>{
  const api=globalThis.RecompMealPlanner,ids=['recipe-001','recipe-010','recipe-020','recipe-028','recipe-030','recipe-033','recipe-035','recipe-037','recipe-044','recipe-048'];
  const catalog=api.normalizeRecipeCatalog(recipes);
  // Explicit persistence fixture: not a menu claiming to meet personal targets.
  const days=[0,1].map(d=>{
   const items=ids.slice(d*5,d*5+5).map((id,i)=>api.portionFromComposition(catalog.find(r=>r.id===id),['Desayuno','Media mañana','Comida','Merienda','Cena'][i],.73));
   return {day:d+1,items,totals:api.totals(items)};
  });
  const result={createdAt:new Date().toISOString(),preferences:{kcal:2200,protein:160,carbs:250,fat:62,meals:5,days:2},days};
  localStorage.setItem('recomp10.mealPlan30',JSON.stringify(result));return result;
 });
 await page.reload({waitUntil:'load'});
 await page.locator('nav button').filter({hasText:'Menús'}).click();
 await expect(page.locator('.mp-day')).toHaveCount(2);
 for(const [d,day] of plan.days.entries()){
  const panel=page.locator('.mp-day').nth(d);
  if(await panel.getAttribute('open')===null)await panel.locator('summary').click();
  for(const [i,meal] of day.items.entries()){
   await page.locator('[data-recipe="'+d+','+i+'"]').click();
   const detail=page.locator('#mpRecipeDetail');
   await expect(detail.locator('h2')).toHaveText(meal.recipe.n);
   await expect(detail.locator('ol li')).toHaveCount(6);
   await expect(detail).toContainText('Macros calculados por ingredientes');
   for(const row of meal.ingredientAmounts){
    await expect(detail).toContainText(row.text);
    expect(row.text).toContain(row.state);
    expect(Number(row.text.match(/^\d+(?:\.\d+)?/)[0])).toBe(row.qty);
    expect(row.source.name).toContain('USDA');
    for(const k of ['k','p','c','f']){const z=k==='k'?1:10;expect(row.nutrients[k]).toBe(Math.round(row.per100[k]*row.qty/100*z+1e-9)/z)}
   }
  }
 }
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('recomp10.mealPlan30')))).toEqual(plan);
 expect(errors).toEqual([]);
});
test('final USDA catalogue recipes preserve exact ledgers and complete preparation after reload',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:4173/',{waitUntil:'load'});
 const plan=await page.evaluate(()=>{
  const api=globalThis.RecompMealPlanner,ids=['recipe-015','recipe-016','recipe-019','recipe-026','recipe-034','recipe-038','recipe-039','recipe-041','recipe-042','recipe-043','recipe-045','recipe-049','recipe-050'];
  const catalog=api.normalizeRecipeCatalog(recipes),days=[];
  for(let d=0;d<3;d++){
   const items=ids.slice(d*5,d*5+5).map((id,i)=>api.portionFromComposition(catalog.find(r=>r.id===id),['Desayuno','Media mañana','Comida','Merienda','Cena'][i],.73));
   if(items.length)days.push({day:d+1,items,totals:api.totals(items)});
  }
  const result={createdAt:new Date().toISOString(),preferences:{kcal:2200,protein:160,carbs:250,fat:62,meals:5,days:3},days};
  localStorage.setItem('recomp10.mealPlan30',JSON.stringify(result));return result;
 });
 await page.reload({waitUntil:'load'});
 await page.locator('nav button').filter({hasText:'Menús'}).click();
 await expect(page.locator('.mp-day')).toHaveCount(3);
 for(const [d,day] of plan.days.entries()){
  const panel=page.locator('.mp-day').nth(d);if(await panel.getAttribute('open')===null)await panel.locator('summary').click();
  for(const [i,meal] of day.items.entries()){
   await page.locator('[data-recipe="'+d+','+i+'"]').click();
   const detail=page.locator('#mpRecipeDetail');await expect(detail.locator('h2')).toHaveText(meal.recipe.n);await expect(detail.locator('ol li')).toHaveCount(6);
   await expect(detail).toContainText('Macros calculados por ingredientes');
   for(const row of meal.ingredientAmounts){await expect(detail).toContainText(row.text);expect(row.text).toContain(row.state);expect(Number(row.text.match(/^\d+(?:\.\d+)?/)[0])).toBe(row.qty);expect(row.source.name).toContain('USDA');}
  }
 }
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('recomp10.mealPlan30')))).toEqual(plan);
 expect(errors).toEqual([]);
});
test('tuna and legume recipes retain dry, cooked and drained quantities after reload',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:4173/',{waitUntil:'load'});
 const plan=await page.evaluate(()=>{
  const api=globalThis.RecompMealPlanner;
  const ids=['recipe-012','recipe-023','recipe-025','recipe-027','recipe-031','recipe-047'];
  const catalog=api.normalizeRecipeCatalog(recipes);
  // A persisted ingredient-ledger fixture exercises all six new recipes, not a
  // claim that this arbitrary combination satisfies a personal nutrition goal.
  const items=ids.map((id,i)=>api.portionFromComposition(catalog.find(r=>r.id===id),['Desayuno','Media mañana','Comida','Merienda','Cena','Snack nocturno'][i],.73));
  const result={createdAt:new Date().toISOString(),preferences:{kcal:2200,protein:160,carbs:250,fat:62,meals:6,days:1},days:[{day:1,items,totals:api.totals(items)}]};
  localStorage.setItem('recomp10.mealPlan30',JSON.stringify(result));return result;
 });
 await page.reload({waitUntil:'load'});
 await page.locator('nav button').filter({hasText:'Menús'}).click();
 await expect(page.locator('.mp-day')).toHaveCount(1);
 for(const [i,meal] of plan.days[0].items.entries()){
  await page.locator('[data-recipe="0,'+i+'"]').click();
  const detail=page.locator('#mpRecipeDetail');
  await expect(detail.locator('h2')).toHaveText(meal.recipe.n);
  await expect(detail.locator('ol li')).toHaveCount(6);
  await expect(detail).toContainText('Macros calculados por ingredientes');
  for(const row of meal.ingredientAmounts){
   await expect(detail).toContainText(row.text);
   expect(Number(row.text.match(/^\d+(?:\.\d+)?/)[0])).toBe(row.qty);
   expect(row.text).toContain(row.state);
   for(const k of ['k','p','c','f']){const z=k==='k'?1:10;expect(row.nutrients[k]).toBe(Math.round(row.per100[k]*row.qty/100*z+1e-9)/z)}
  }
 }
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('recomp10.mealPlan30')))).toEqual(plan);
 expect(errors).toEqual([]);
});


test('seven sourced days keep all four targets before and after swap and reload',async({page})=>{
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('http://127.0.0.1:4173/',{waitUntil:'load'});
 await page.evaluate(()=>{const migrated=recipes.filter(r=>r.composition);recipes.splice(0,recipes.length,...migrated)});
 await page.locator('nav button').filter({hasText:'Menús'}).click();
 await page.locator('#mpCake').uncheck();await page.locator('#mpShake').uncheck();
 await page.locator('#mpMeals').selectOption('6');
 for(const [id,value] of [['mpKcal','2000'],['mpProtein','175'],['mpCarbs','255'],['mpFat','30'],['mpDays','7']])await page.locator('#'+id).fill(value);
 await page.locator('#mpGenerate').click();
 await expect(page.locator('.mp-day')).toHaveCount(7);
 const verify=plan=>{
  expect(plan.days).toHaveLength(7);
  for(const day of plan.days){
   expect(day.withinTarget).toBe(true);
   expect(day.energyDistribution.policy).toBe('macro-fit-preserved');
   for(const [k,target,tol] of [['k',2000,.03],['p',175,.05],['c',255,.06],['f',30,.08]]){
    expect(Math.abs(day.totals[k]-target)/target).toBeLessThanOrEqual(tol);
    expect(day.totals[k]).toBe(day.items.reduce((sum,m)=>sum+m[k],0));
   }
   expect(Math.max(...day.items.map(m=>m.k/day.totals.k))).toBeLessThanOrEqual(.345);
  }
 };
 const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('recomp10.mealPlan30')));
 verify(before);
 let saved,after=before;
 for(const index of [0,1,2,3,4,5]){
  const old=after.days[0].items[index].recipe.id;
  await page.locator(`[data-swap="0,${index}"]`).click();
  saved=await page.evaluate(()=>localStorage.getItem('recomp10.mealPlan30'));after=JSON.parse(saved);
  verify(after);
  expect(after.days[0].items[index].recipe.id).not.toBe(old);
  expect(after.days.slice(1)).toEqual(before.days.slice(1));
 }
 await page.reload({waitUntil:'load'});
 await page.locator('nav button').filter({hasText:'Menús'}).click();
 await expect(page.locator('.mp-day')).toHaveCount(7);
 expect(await page.evaluate(()=>localStorage.getItem('recomp10.mealPlan30'))).toBe(saved);
 expect(errors).toEqual([]);
});

test('migrated real catalogue exposes each ingredient ledger and complete steps after reload',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:4173/',{waitUntil:'load'});
 // Select only real, migrated production recipes; no synthetic nutrition data.
 await page.evaluate(()=>{const migrated=recipes.filter(r=>r.composition);recipes.splice(0,recipes.length,...migrated)});
 await page.locator('nav button').filter({hasText:'Menús'}).click();
 await page.locator('#mpCake').uncheck();await page.locator('#mpShake').uncheck();
 await page.locator('#mpMeals').selectOption('6');
 for(const [id,value] of [['mpKcal','2000'],['mpProtein','175'],['mpCarbs','255'],['mpFat','30'],['mpDays','2']])await page.locator('#'+id).fill(value);
 await page.locator('#mpGenerate').click();
 await expect(page.locator('.mp-day')).toHaveCount(2);
 const first=await page.locator('[data-recipe="0,0"] b').innerText();
 await page.locator('[data-swap="0,0"]').click();
 await expect(page.locator('#mpRecipeDetail h2')).not.toHaveText(first);
 const saved=await page.evaluate(()=>localStorage.getItem('recomp10.mealPlan30')),plan=JSON.parse(saved);
 for(const [k,target,tol] of [['k',2000,.03],['p',175,.05],['c',255,.06],['f',30,.08]])expect(Math.abs(plan.days[0].totals[k]-target)/target).toBeLessThanOrEqual(tol);
 await page.reload({waitUntil:'load'});
 await page.locator('nav button').filter({hasText:'Menús'}).click();
 for(const [d,day] of plan.days.entries()){
  const panel=page.locator('.mp-day').nth(d);
  if(await panel.getAttribute('open')===null)await panel.locator('summary').click();
  for(const [i,meal] of day.items.entries()){
   await page.locator(`[data-recipe="${d},${i}"]`).click();
   const detail=page.locator('#mpRecipeDetail');
   await expect(detail.locator('h2')).toHaveText(meal.recipe.n);
   await expect(detail.locator('ol li')).toHaveCount(meal.recipe.s.length);
   expect(meal.recipe.s.length).toBeGreaterThanOrEqual(6);
   expect(meal.nutritionBasis).toBe('ingredient-composition');
   for(const row of meal.ingredientAmounts){
    await expect(detail).toContainText(row.text);
    expect(row.source.name).toContain('USDA');
    for(const k of ['k','p','c','f']){const z=k==='k'?1:10;expect(row.nutrients[k]).toBe(Math.round(row.per100[k]*row.qty/100*z+1e-9)/z)}
   }
  }
 }
 expect(await page.evaluate(()=>localStorage.getItem('recomp10.mealPlan30'))).toBe(saved);
 expect(errors).toEqual([]);
});

test('real USDA recipes keep quantities and equivalent daily macros after swap and reload',async({page})=>{
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('http://127.0.0.1:4173/',{waitUntil:'load'});
 await page.locator('nav button').filter({hasText:'Menús'}).click();
 await page.locator('#mpCake').uncheck();await page.locator('#mpShake').uncheck();
 await page.locator('#mpMeals').selectOption('6');
 for(const [id,value] of [['mpKcal','1950'],['mpProtein','155'],['mpCarbs','205'],['mpFat','58'],['mpDays','2']])await page.locator('#'+id).fill(value);
 await page.locator('#mpGenerate').click();
 await expect(page.locator('.mp-day')).toHaveCount(2);
 await page.locator('[data-recipe="0,0"]').click();
 const original=await page.evaluate(()=>JSON.parse(localStorage.getItem('recomp10.mealPlan30')).days[0].items[0]);
 await expect(page.locator('#mpRecipeDetail h2')).toHaveText(original.recipe.n);
 expect(original.nutritionBasis).toBe('ingredient-composition');
 for(const row of original.ingredientAmounts)await expect(page.locator('#mpRecipeDetail')).toContainText(row.text);
 await page.locator('[data-swap="0,0"]').click();
 await expect(page.locator('#mpRecipeDetail h2')).not.toHaveText(original.recipe.n);
 const saved=await page.evaluate(()=>localStorage.getItem('recomp10.mealPlan30'));
 const plan=JSON.parse(saved),day=plan.days[0];
 expect(day.energyDistribution.policy).toBe('macro-fit-preserved');
 for(const [key,target,tolerance] of [['k',1950,.03],['p',155,.05],['c',205,.06],['f',58,.08]])expect(Math.abs(day.totals[key]-target)/target).toBeLessThanOrEqual(tolerance);
 const meal=day.items[0];
 if(meal.nutritionBasis==='ingredient-composition')for(const row of meal.ingredientAmounts){
  expect(row.source.name).toContain('USDA');
  await expect(page.locator('#mpRecipeDetail')).toContainText(row.text);
  for(const key of ['k','p','c','f']){
   const precision=key==='k'?1:10;
   expect(row.nutrients[key]).toBe(Math.round(row.per100[key]*row.qty/100*precision+1e-9)/precision);
  }
 }
 if(meal.nutritionBasis!=='ingredient-composition')await expect(page.locator('#mpRecipeDetail')).toContainText('Macros de receta, no verificados ingrediente a ingrediente');
 await page.reload({waitUntil:'load'});
 await page.locator('nav button').filter({hasText:'Menús'}).click();
 await page.locator('[data-recipe="0,0"]').click();
 await expect(page.locator('#mpRecipeDetail h2')).toHaveText(meal.recipe.n);
 expect(await page.evaluate(()=>localStorage.getItem('recomp10.mealPlan30'))).toBe(saved);
 expect(errors).toEqual([]);
});

for(const meals of [4,6])test(`${meals} meals: ingredient composition reaches details, substitution and persistence`,async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:4173/',{waitUntil:'load'});
 await page.evaluate(()=>{
  const source={id:'test',name:'Synthetic arithmetic only',url:'https://example.invalid/test',accessedAt:'2026-08-28'};
  const composition=[
   {foodId:'P',name:'Test P',qty:40,per100:{k:400,p:100,c:0,f:0}},
   {foodId:'C',name:'Test C',qty:62.5,per100:{k:400,p:0,c:100,f:0}},
   {foodId:'F',name:'Test F',qty:15.5,per100:{k:900,p:0,c:0,f:100}}
  ].map(row=>({...row,unit:'g',state:'test state',source}));
  const fixture=['Desayuno','Comida','Merienda','Cena'].flatMap((m,i)=>[0,1].map(j=>({id:`test-${i}-${j}`,n:`Fixture ${i}-${j}`,m,k:9999,p:1,c:1,f:1,i:[],s:['Test preparation only.'],composition})));
  const catalog=typeof ALL_RECIPES!=='undefined'?ALL_RECIPES:recipes;
  catalog.splice(0,catalog.length,...fixture);
 });
 await page.locator('nav button').filter({hasText:'Menús'}).click();
 await page.locator('#mpCake').uncheck();await page.locator('#mpShake').uncheck();
 await page.locator('#mpMeals').selectOption(String(meals));
 for(const [id,value] of [['mpKcal','2200'],['mpProtein','160'],['mpCarbs','250'],['mpFat','62'],['mpDays','2']])await page.locator('#'+id).fill(value);
 await page.locator('#mpGenerate').click();
 await expect(page.locator('.mp-day')).toHaveCount(2);
 await page.locator('[data-recipe="0,0"]').click();
 await expect(page.locator('#mpRecipeDetail')).toContainText('Macros calculados por ingredientes');
 await expect(page.locator('#mpRecipeDetail')).toContainText('Test preparation only.');
 const old=await page.locator('#mpRecipeDetail h2').innerText();
 await page.locator('[data-swap="0,0"]').click();
 await expect(page.locator('#mpRecipeDetail h2')).not.toHaveText(old);
 const raw=await page.evaluate(()=>localStorage.getItem('recomp10.mealPlan30'));
 const plan=JSON.parse(raw);
 for(const meal of plan.days.flatMap(day=>day.items)){
  expect(meal.nutritionBasis).toBe('ingredient-composition');
  for(const k of ['k','p','c','f']){
   const precision=k==='k'?1:10;
   for(const row of meal.ingredientAmounts){
    expect(row.nutrients[k]).toBe(Math.round(row.per100[k]*row.qty/100*precision)/precision);
    expect(Number(row.text.match(/^\d+(?:\.\d+)?/)[0])).toBe(row.qty);
   }
   expect(meal[k]).toBe(Math.round(meal.ingredientAmounts.reduce((sum,row)=>sum+Math.round(row.nutrients[k]*precision),0)/precision));
  }
 }
 await page.reload({waitUntil:'load'});
 await page.locator('nav button').filter({hasText:'Menús'}).click();
 await page.locator('[data-recipe="0,0"]').click();
 await expect(page.locator('#mpRecipeDetail')).toContainText('Macros calculados por ingredientes');
 for(const row of plan.days[0].items[0].ingredientAmounts)await expect(page.locator('#mpRecipeDetail')).toContainText(row.text);
 expect(await page.evaluate(()=>localStorage.getItem('recomp10.mealPlan30'))).toBe(raw);
 expect(errors).toEqual([]);
});

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('recomp_unified_profile_v2', JSON.stringify({name:'Usuario QA',sex:'m',age:40,height:178,weight:80,activity:1.45,goal:'recomp',experience:'intermediate',days:4,minutes:50,equipment:['Máquina','Mancuernas','Barra','Polea'],meals:4,mealPattern:'balanced',diet:'flexible',excluded:'',maxTime:30,budget:'medio'}));
    localStorage.setItem('targets', JSON.stringify({kcal:2200,protein:160,carbs:250,fat:70}));
    const d=new Date(); const key=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    localStorage.setItem('meals', JSON.stringify([{id:1,date:key,type:'Desayuno',name:'Desayuno QA',kcal:500,p:40,c:55,f:14}]));
  });
});

test('nutrition is a daily dashboard, not a calculator-first screen', async ({ page }) => {
  const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4173/',{waitUntil:'load'});
  await page.locator('nav button').filter({hasText:'Nutrición'}).click();
  await expect(page.locator('#rnNutritionHeader')).toBeVisible();
  await expect(page.getByText('Lo que has comido.')).toBeVisible();
  await expect(page.locator('#nutricion .rn-tabs')).toBeVisible();
  await expect(page.locator('#rnTodayMeals')).toContainText('Desayuno QA');
  await expect(page.locator('#rnNutritionHeader')).toContainText('500');
  await page.locator('#nutricion .rn-tabs button[data-panel="targets"]').click();
  await expect(page.locator('#nutricion summary').filter({hasText:'Calculadora de kcal y macros'})).toBeVisible();
  await page.locator('#nutricion .rn-tabs button[data-panel="diary"]').click();
  await expect(page.locator('#mealEditor')).toBeVisible();
  expect(errors).toEqual([]);
});

test('USDA breakfast displays its real ingredient ledger and survives reload',async({page})=>{
 await page.goto('http://127.0.0.1:4173/',{waitUntil:'load'});
 await page.locator('nav button').filter({hasText:'Menús'}).click();
 await page.locator('#mpCake').check();
 await page.locator('#mpDays').fill('2');
 await page.locator('#mpGenerate').click();
 await expect(page.locator('.mp-day')).toHaveCount(2);
 const raw=await page.evaluate(()=>localStorage.getItem('recomp10.mealPlan30'));
 const plan=JSON.parse(raw);
 const index=plan.days[0].items.findIndex(meal=>meal.recipe.id==='fixed-breakfast-cake');
 expect(index).toBeGreaterThanOrEqual(0);
 const cake=plan.days[0].items[index];
 expect(cake.nutritionBasis).toBe('ingredient-composition');
 expect(cake.ingredientAmounts).toHaveLength(5);
 for(const key of ['k','p','c','f']){
  const precision=key==='k'?1:10;
  const sum=cake.ingredientAmounts.reduce((total,row)=>total+Math.round(row.nutrients[key]*precision),0);
  expect(cake[key]).toBe(Math.round(sum/precision));
 }
 await page.locator(`[data-recipe="0,${index}"]`).click();
 await expect(page.locator('#mpRecipeDetail')).toContainText('Macros calculados por ingredientes');
 for(const row of cake.ingredientAmounts){
  expect(row.source.name).toContain('USDA');
  await expect(page.locator('#mpRecipeDetail')).toContainText(row.text);
 }
 await expect(page.locator('#mpRecipeDetail')).toContainText('71');
 await page.reload({waitUntil:'load'});
 await page.locator('nav button').filter({hasText:'Menús'}).click();
 await page.locator(`[data-recipe="0,${index}"]`).click();
 await expect(page.locator('#mpRecipeDetail')).toContainText('Macros calculados por ingredientes');
 expect(await page.evaluate(()=>localStorage.getItem('recomp10.mealPlan30'))).toBe(raw);
});

test('calculator and multidday generator share one planning screen and persist all four targets', async ({ page }) => {
  const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4173/',{waitUntil:'load'});
  await page.locator('nav button').filter({hasText:'Menús'}).click();
  await expect(page.locator('#rnMenuHeader')).toBeVisible();
  await expect(page.getByText('Un plan. Una lista de compra. Cero generadores duplicados.')).toBeVisible();
  await expect(page.locator('#mealPlanner30')).toBeVisible();
  await expect(page.locator('#mpMacroCalculator')).toBeVisible();
  await expect(page.locator('#mpCalculateTargets')).toBeVisible();
  await expect(page.getByRole('heading',{name:'Generador rápido'})).toBeHidden();
  await expect(page.locator('#mpGenerate')).toBeVisible();
  await page.locator('#mpCalcAge').fill('46');
  await page.locator('#mpCalcWeight').fill('81');
  await page.locator('#mpCalcHeight').fill('181');
  await page.locator('#mpCalculateTargets').click();
  const calculated=await page.locator('#mpKcal, #mpProtein, #mpCarbs, #mpFat').evaluateAll(inputs=>Object.fromEntries(inputs.map(input=>[input.id,input.value])));
  expect(Number(calculated.mpKcal)).toBeGreaterThan(1000);
  expect(Number(calculated.mpProtein)).toBeGreaterThan(0);
  expect(Number(calculated.mpCarbs)).toBeGreaterThan(0);
  expect(Number(calculated.mpFat)).toBeGreaterThan(0);
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('targets')))).toEqual({
    kcal:Number(calculated.mpKcal),protein:Number(calculated.mpProtein),carbs:Number(calculated.mpCarbs),fat:Number(calculated.mpFat)
  });
  await page.locator('#mpDays').fill('7');
  await page.locator('#mpGenerate').click();
  await expect(page.locator('.mp-day').first()).toBeVisible({timeout:15000});
  await expect(page.locator('#rnMenuHeader')).toContainText('7 días listos.');
  const plannerParent=await page.locator('#mealPlanner30').evaluate(el=>el.parentElement.id);
  expect(plannerParent).toBe('recetas');
  await page.reload({waitUntil:'load'});
  await page.locator('nav button').filter({hasText:'Menús'}).click();
  await expect(page.locator('#mpKcal')).toHaveValue(calculated.mpKcal);
  await expect(page.locator('#mpProtein')).toHaveValue(calculated.mpProtein);
  await expect(page.locator('#mpCarbs')).toHaveValue(calculated.mpCarbs);
  await expect(page.locator('#mpFat')).toHaveValue(calculated.mpFat);
  await expect(page.locator('.mp-day').first()).toBeVisible({timeout:15000});
  expect(errors).toEqual([]);
});

test('planned meal opens recipe and swap keeps the day usable', async ({ page }) => {
  const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4173/',{waitUntil:'load'});
  await page.locator('nav button').filter({hasText:'Menús'}).click();
  await page.locator('#mpDays').fill('7');
  await page.locator('#mpGenerate').click();
  await expect(page.locator('.mp-day').first()).toBeVisible({timeout:15000});
  const swapButton=page.locator('[data-swap]').first();
  const coordinates=await swapButton.getAttribute('data-swap');
  const recipeButton=page.locator('[data-recipe="'+coordinates+'"]');
  await recipeButton.click();
  await expect(page.locator('#mpRecipeDetail')).toContainText('Ingredientes');
  const original=await recipeButton.textContent();
  await swapButton.click();
  await page.waitForTimeout(250);
  const changed=await page.locator('[data-recipe="'+coordinates+'"]').textContent();
  expect(changed).not.toBe(original);
  await expect(page.locator('.mp-day').first()).toBeVisible();
  expect(errors).toEqual([]);
});

test('six meals selected in the unified profile are available in the advanced menu planner', async ({ page }) => {
  const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(() => {
    const p=JSON.parse(localStorage.getItem('recomp_unified_profile_v2')||'{}');p.meals=6;localStorage.setItem('recomp_unified_profile_v2',JSON.stringify(p));
  });
  await page.goto('http://127.0.0.1:4173/',{waitUntil:'load'});
  await page.locator('nav button').filter({hasText:'Menús'}).click();
  await expect(page.locator('#mpMeals')).toHaveValue('6');
  await page.locator('#mpDays').fill('2');
  await page.locator('#mpGenerate').click();
  await expect(page.locator('.mp-day').first()).toBeVisible({timeout:20000});
  const firstDayMeals=page.locator('.mp-day').first().locator('.mp-meal');
  await expect(firstDayMeals).toHaveCount(6);
  await expect(firstDayMeals.nth(5)).toContainText(/Snack nocturno|Merienda|Desayuno|Cena/);
  expect(errors).toEqual([]);
});
