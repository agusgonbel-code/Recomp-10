const { test, expect } = require('@playwright/test');

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


async function enableMenuWriteFault(page) {
  await page.addInitScript(() => {
    const setItem=Storage.prototype.setItem;
    window.failMenuWrite=false;
    Storage.prototype.setItem=function(key,value) {
      if(key==='recomp10.mealPlan30'&&window.failMenuWrite)throw new DOMException('Storage full','QuotaExceededError');
      return setItem.call(this,key,value);
    };
  });
  await page.goto('http://127.0.0.1:4173/',{waitUntil:'load'});
  await page.locator('nav button').filter({hasText:'Menús'}).click();
  await page.locator('#mpDays').fill('2');
  await page.locator('#mpGenerate').click();
  await expect(page.locator('.mp-day')).toHaveCount(2,{timeout:20000});
  return page.evaluate(()=>localStorage.getItem('recomp10.mealPlan30'));
}

test('failed menu generation retains the active plan and retry persists across reload',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const previous=await enableMenuWriteFault(page);
  await page.locator('[data-recipe]').first().click();
  const detail=await page.locator('#mpRecipeDetail').innerHTML();
  await page.locator('#mpDays').fill('3');
  await page.evaluate(()=>window.failMenuWrite=true);
  await page.locator('#mpGenerate').click();
  await expect(page.locator('#mpStatus')).toContainText('No se pudo crear el menú');
  await expect(page.locator('#mpGenerate')).toBeEnabled();
  await expect(page.locator('#mpDays')).toHaveValue('3');
  expect(await page.evaluate(()=>localStorage.getItem('recomp10.mealPlan30'))).toBe(previous);
  expect(await page.locator('#mpRecipeDetail').innerHTML()).toBe(detail);
  // Re-render through a real control: it must still use the committed plan.
  await page.locator('[data-week="0"]').click();
  await expect(page.locator('.mp-day')).toHaveCount(2);
  await page.evaluate(()=>window.failMenuWrite=false);
  await page.locator('#mpGenerate').click();
  await expect(page.locator('.mp-day')).toHaveCount(3,{timeout:20000});
  await expect(page.locator('#mpRecipeDetail')).toBeEmpty();
  const saved=await page.evaluate(()=>localStorage.getItem('recomp10.mealPlan30'));
  expect(JSON.parse(saved).days).toHaveLength(3);
  await page.reload({waitUntil:'load'});
  await page.locator('nav button').filter({hasText:'Menús'}).click();
  await expect(page.locator('.mp-day')).toHaveCount(3);
  expect(await page.evaluate(()=>localStorage.getItem('recomp10.mealPlan30'))).toBe(saved);
  expect(errors).toEqual([]);
});

test('failed meal replacement keeps recipe and quantities; retry saves the balanced day',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const previous=await enableMenuWriteFault(page);
  const coordinates=await page.locator('[data-swap]').first().getAttribute('data-swap');
  const recipe=page.locator('[data-recipe="'+coordinates+'"]');
  const replace=page.locator('[data-swap="'+coordinates+'"]');
  await recipe.click();
  const detail=await page.locator('#mpRecipeDetail').innerHTML();
  const original=await recipe.textContent();
  await page.evaluate(()=>window.failMenuWrite=true);
  await replace.click();
  await expect(page.locator('#mpStatus')).toContainText('No se pudo guardar la sustitución');
  expect(await page.evaluate(()=>localStorage.getItem('recomp10.mealPlan30'))).toBe(previous);
  await recipe.click();
  expect(await page.locator('#mpRecipeDetail').innerHTML()).toBe(detail);
  expect(await recipe.textContent()).toBe(original);
  await page.evaluate(()=>window.failMenuWrite=false);
  await replace.click();
  await expect(recipe).not.toHaveText(original);
  const saved=await page.evaluate(()=>localStorage.getItem('recomp10.mealPlan30'));
  const result=JSON.parse(saved),day=Number(coordinates.split(',')[0]);
  const target=result.preferences;
  for(const [field,name,tolerance] of [['k','kcal',.03],['p','protein',.05],['c','carbs',.06],['f','fat',.08]]) {
    expect(Math.abs(result.days[day].totals[field]-target[name])/target[name]).toBeLessThanOrEqual(tolerance);
  }
  await page.reload({waitUntil:'load'});
  await page.locator('nav button').filter({hasText:'Menús'}).click();
  expect(await page.evaluate(()=>localStorage.getItem('recomp10.mealPlan30'))).toBe(saved);
  await page.locator('[data-recipe="'+coordinates+'"]').click();
  const item=result.days[day].items[Number(coordinates.split(',')[1])];
  await expect(page.locator('#mpRecipeDetail h2')).toHaveText(item.recipe.n);
  for(const ingredient of item.ingredientAmounts)await expect(page.locator('#mpRecipeDetail')).toContainText(ingredient.text);
  expect(errors).toEqual([]);
});

