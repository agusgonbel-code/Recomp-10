const { test, expect } = require('@playwright/test');
test('unified intake opens, generates nutrition and training, and persists', async ({ page }) => {
  const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4173/',{waitUntil:'domcontentloaded'});
  await expect(page.locator('#r10IntakeModal')).toBeVisible();
  await expect(page.getByText('Perfil único usuario / cliente')).toBeVisible();
  await page.locator('#rNext').click(); await page.locator('#rNext').click(); await page.locator('#rNext').click();
  await expect(page.locator('#rGenerate')).toBeVisible();
  await page.locator('#rGenerate').click();
  await page.waitForFunction(()=>localStorage.getItem('recomp_unified_profile_v2')!==null);
  const profile=await page.evaluate(()=>JSON.parse(localStorage.getItem('recomp_unified_profile_v2')));
  const nutrition=await page.evaluate(()=>JSON.parse(localStorage.getItem('recomp_unified_nutrition_v2')));
  const plan=await page.evaluate(()=>JSON.parse(localStorage.getItem('recomp_unified_plan_v2')));
  expect(profile.meals).toBeGreaterThanOrEqual(3); expect(nutrition.targets.kcal).toBeGreaterThan(1000);
  expect(Object.keys(plan.routine).length).toBe(profile.days);
  expect(errors).toEqual([]);
});