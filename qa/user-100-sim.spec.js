const {test,expect}=require('@playwright/test');
const URL='http://127.0.0.1:4173/';
async function closeIntakeModal(page){
  const modal=page.locator('#r10IntakeModal');
  await modal.waitFor({state:'visible',timeout:1800}).catch(()=>{});
  if(await modal.isVisible().catch(()=>false)) await page.locator('#rClose').click();
  await expect(modal).toBeHidden();
}
async function ready(page){
  await page.goto(URL,{waitUntil:'domcontentloaded'});
  await expect(page.locator('#inicio')).toBeVisible();
  await closeIntakeModal(page);
}
async function nutrition(page,panel='today'){
  await ready(page);await page.locator('nav button').nth(2).click();await expect(page.locator('#nutricion')).toBeVisible();
  await page.locator('#nutricion .rn-tabs').waitFor({state:'visible',timeout:4000});
  // Under CI load the first-run intake can finish mounting after navigation. Dismiss it again
  // before interacting so this flow models a user who explicitly closes onboarding and continues.
  await closeIntakeModal(page);
  if(panel!=='today') await page.locator(`#nutricion .rn-tabs [data-panel="${panel}"]`).click();
  await expect(page.locator(`#nutricion .rn-panel[data-panel="${panel}"]`)).toHaveClass(/active/);
}
async function menus(page){await ready(page);await page.locator('nav button').nth(3).click();await expect(page.locator('#recetas')).toBeVisible();await expect(page.locator('#mealPlanner30')).toBeVisible();}
async function openLibrary(page){await menus(page);const details=page.locator('#recetas details.card').last();await expect(details).toBeVisible();if(!(await details.getAttribute('open')))await details.locator('summary').click();await expect(page.locator('#recipeSearch')).toBeVisible();}
function errs(page){const a=[];page.on('pageerror',e=>a.push(e.message));return a}
const nav=[['Inicio','inicio',0],['Entreno','entreno',1],['Nutrición','nutricion',2],['Menús','recetas',3],['Progreso','progreso',4],['Ajustes','ajustes',5]];
for(const [name,id,i] of nav)test(`usuario navega a ${name}`,async({page})=>{await ready(page);await page.locator('nav button').nth(i).click();await expect(page.locator(`#${id}`)).toBeVisible()});
for(const width of [320,375,390,430])test(`usuario usa Recomp a ${width}px sin desbordamiento`,async({page})=>{await page.setViewportSize({width,height:760});await ready(page);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+2)).toBeTruthy()});
test('usuario puede cerrar el perfil inicial y explorar',async({page})=>{await page.goto(URL,{waitUntil:'domcontentloaded'});const modal=page.locator('#r10IntakeModal');await expect(modal).toBeVisible({timeout:2500});await page.locator('#rClose').click();await expect(modal).toBeHidden();await expect(page.locator('#inicio')).toBeVisible()});
test('usuario fresco no ve peso personal precargado',async({page})=>{await ready(page);await expect(page.locator('#dWeight')).toHaveText('—')});
test('usuario fresco ve perfil neutro',async({page})=>{await ready(page);await page.locator('nav button').nth(5).click();await expect(page.locator('#profileName')).toHaveValue('Usuario')});
test('usuario introduce antropometría sin crash',async({page})=>{const e=errs(page);await nutrition(page,'targets');await page.locator('#age').fill('40');await page.locator('#weight').fill('75');await page.locator('#height').fill('178');expect(e).toEqual([])});
test('usuario cambia actividad y objetivo',async({page})=>{await nutrition(page,'targets');await page.locator('#activity').selectOption('1.375');await page.locator('#goal').selectOption('0');await expect(page.locator('#activity')).toHaveValue('1.375');await expect(page.locator('#goal')).toHaveValue('0')});
test('usuario cierra el onboarding y Nutrición sigue siendo interactiva',async({page})=>{await nutrition(page,'targets');await expect(page.locator('#r10IntakeModal')).toBeHidden();await page.locator('#activity').selectOption('1.2');await expect(page.locator('#activity')).toHaveValue('1.2')});
test('usuario navega por día anterior y vuelve a hoy',async({page})=>{await nutrition(page,'diary');const before=await page.locator('#mealJournalDate').inputValue();await page.getByRole('button',{name:'Día anterior'}).click();expect(await page.locator('#mealJournalDate').inputValue()).not.toBe(before);await page.getByRole('button',{name:'Ir a hoy'}).click();expect(await page.locator('#mealJournalDate').inputValue()).toBe(before)});
test('usuario no puede introducir kcal negativas por control',async({page})=>{await nutrition(page,'diary');expect(await page.locator('#mealKcal').getAttribute('min')).toBe('0')});
test('usuario abre biblioteca de recetas sin perder menú',async({page})=>{await openLibrary(page);await expect(page.locator('#mealPlanner30')).toBeVisible();await expect(page.locator('#recipeSearch')).toBeVisible()});
test('usuario busca una receta',async({page})=>{await openLibrary(page);await page.locator('#recipeSearch').fill('pollo');await expect(page.locator('#recipeSearch')).toHaveValue('pollo')});
test('usuario filtra recetas por proteína',async({page})=>{await openLibrary(page);await page.locator('#recipeProteinFilter').selectOption('30');await expect(page.locator('#recipeProteinFilter')).toHaveValue('30')});
test('usuario ve botones táctiles de navegación >=44px',async({page})=>{await ready(page);const n=await page.locator('nav button').evaluateAll(ns=>ns.filter(x=>x.getBoundingClientRect().height<44).length);expect(n).toBe(0)});
test('usuario con reducir movimiento mantiene navegación',async({page})=>{await page.emulateMedia({reducedMotion:'reduce'});await ready(page);await page.locator('nav button').nth(1).click();await expect(page.locator('#entreno')).toBeVisible()});
test('usuario recarga sin perder datos locales básicos',async({page})=>{await ready(page);await page.evaluate(()=>localStorage.setItem('qa-user-marker','ok'));await page.reload({waitUntil:'domcontentloaded'});expect(await page.evaluate(()=>localStorage.getItem('qa-user-marker'))).toBe('ok')});
test('usuario recorre toda la app sin pageerror',async({page})=>{const e=errs(page);await ready(page);for(let i=0;i<6;i++)await page.locator('nav button').nth(i).click();expect(e).toEqual([])});
test('usuario en iPhone landscape no desborda',async({page})=>{await page.setViewportSize({width:844,height:390});await ready(page);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+2)).toBeTruthy()});
test('usuario en iPad portrait conserva navegación',async({page})=>{await page.setViewportSize({width:768,height:1024});await ready(page);await expect(page.locator('nav')).toBeVisible()});
test('usuario puede enfocar controles con teclado',async({page})=>{await ready(page);await page.keyboard.press('Tab');expect(await page.evaluate(()=>document.activeElement!==document.body)).toBeTruthy()});