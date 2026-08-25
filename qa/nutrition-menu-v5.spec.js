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
  await expect(page.getByText('Calculadora de kcal y macros')).toBeVisible();
  await page.locator('#nutricion .rn-tabs button[data-panel="diary"]').click();
  await expect(page.locator('#mealEditor')).toBeVisible();
  expect(errors).toEqual([]);
});

test('menu is a single planning studio without duplicate quick generators', async ({ page }) => {
  const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4173/',{waitUntil:'load'});
  await page.locator('nav button').filter({hasText:'Menús'}).click();
  await expect(page.locator('#rnMenuHeader')).toBeVisible();
  await expect(page.getByText('Un plan. Una lista de compra. Cero generadores duplicados.')).toBeVisible();
  await expect(page.locator('#mealPlanner30')).toBeVisible();
  await expect(page.getByRole('heading',{name:'Generador rápido'})).toBeHidden();
  await expect(page.locator('#mpGenerate')).toBeVisible();
  await page.locator('#mpDays').fill('7');
  await page.locator('#mpGenerate').click();
  await expect(page.locator('.mp-day').first()).toBeVisible({timeout:15000});
  await expect(page.locator('#rnMenuHeader')).toContainText('7 días listos.');
  const plannerParent=await page.locator('#mealPlanner30').evaluate(el=>el.parentElement.id);
  expect(plannerParent).toBe('recetas');
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

