const { test, expect } = require('@playwright/test');
const BASE='http://127.0.0.1:4173';
async function completeIntake(page){for(let i=0;i<3;i++)await page.locator('#rNext').click();await page.locator('#rGenerate').click();await page.waitForFunction(()=>localStorage.getItem('recomp_unified_profile_v2')!==null)}

test('Recomp mobile controls remain labelled, unique and touchable',async({browser})=>{
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const page=await context.newPage();
  await page.goto(BASE+'/',{waitUntil:'domcontentloaded'});
  await completeIntake(page);
  const ids=await page.locator('[id]').evaluateAll(nodes=>nodes.map(n=>n.id).filter(Boolean));
  expect(new Set(ids).size,'duplicate DOM ids').toBe(ids.length);
  const nav=page.locator('nav button');
  expect(await nav.count()).toBeGreaterThanOrEqual(6);
  for(let i=0;i<await nav.count();i++){
    const button=nav.nth(i);if(!(await button.isVisible()))continue;
    const box=await button.boundingBox();expect(box?.height||0,`nav target ${i} below 44px`).toBeGreaterThanOrEqual(44);
    const name=(await button.getAttribute('aria-label'))||(await button.textContent())||'';
    expect(name.trim(),`nav target ${i} without name`).not.toBe('');
  }
  const unnamed=await page.locator('input:visible,select:visible,textarea:visible,button:visible').evaluateAll(nodes=>nodes.filter(el=>{
    if(el.tagName==='BUTTON')return !(el.getAttribute('aria-label')||el.textContent?.trim());
    const parentLabel=el.closest('label')?.textContent?.trim();
    const previousLabel=el.previousElementSibling?.tagName==='LABEL'?el.previousElementSibling.textContent?.trim():'';
    const id=el.id;const explicit=id?document.querySelector(`label[for="${CSS.escape(id)}"]`)?.textContent?.trim():'';
    return !(el.getAttribute('aria-label')||el.getAttribute('placeholder')||parentLabel||previousLabel||explicit);
  }).map(el=>el.outerHTML.slice(0,180)));
  expect(unnamed,'visible controls without an accessible cue').toEqual([]);
  const zoomRisk=await page.locator('input:visible,select:visible,textarea:visible').evaluateAll(nodes=>nodes.filter(el=>parseFloat(getComputedStyle(el).fontSize)<16).map(el=>({id:el.id,size:getComputedStyle(el).fontSize})));
  expect(zoomRisk,'iOS form controls below 16px can trigger zoom').toEqual([]);
  await context.close();
});

test('Recomp generated menu remains readable with large text wrapping policy',async({browser})=>{
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const page=await context.newPage();await page.goto(BASE+'/',{waitUntil:'domcontentloaded'});await completeIntake(page);
  await page.waitForSelector('#mpGenerate');await page.locator('#mpDays').fill('1');await page.locator('#mpGenerate').click();await page.waitForSelector('.mp-meal');
  const rows=await page.locator('.mp-meal').evaluateAll(nodes=>nodes.map(row=>{const link=row.querySelector('.mp-recipe-link');const s=getComputedStyle(link);return{width:link.getBoundingClientRect().width,wordBreak:s.wordBreak,overflowWrap:s.overflowWrap}}));
  for(const row of rows){expect(row.width).toBeGreaterThan(180);expect(row.wordBreak).not.toBe('break-all');expect(row.overflowWrap).not.toBe('anywhere')}
  await context.close();
});
