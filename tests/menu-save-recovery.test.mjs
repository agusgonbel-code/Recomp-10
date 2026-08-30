import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const KEY = 'recomp10.mealPlan30';
const source = readFileSync(new URL('../meal-planner-ui.js', import.meta.url), 'utf8');
const snapshot = value => JSON.parse(JSON.stringify(value));
const menu = name => ({createdAt:name, preferences:{kcal:2200,protein:160,carbs:250,fat:70}, days:[{items:[{recipe:{n:name},k:400},{recipe:{n:'Other'},k:600}]}]});
function fixture() {
  const previous = menu('Previous');
  const store = new Map([[KEY,JSON.stringify(previous)]]);
  const nodes = new Map();
  const node = id => {
    if (!nodes.has(id)) nodes.set(id,{value:'4',innerHTML:'',textContent:'',disabled:false,scrollIntoView(){}});
    return nodes.get(id);
  };
  node('mpRecipeDetail').innerHTML='Previous recipe detail';
  let failWrite=false, failRead=false, failSwap=false, returnedSwap, next=menu('New');
  const context = vm.createContext({
    document:{readyState:'loading',addEventListener(){},getElementById:node},
    localStorage:{getItem(key){if(key===KEY&&failRead)throw new Error('Storage unavailable');return store.get(key)??null},setItem(key,value){if(key===KEY&&failWrite)throw new Error('Storage full');store.set(key,value)}},
    recipes:[{}], alert(){},
    RecompMealPlanner:{normalizeRecipeCatalog:x=>x,macroTargets:()=>({kcal:2200,protein:160,carbs:250,fat:70}),generateDays:()=>next,
      swapMeal(plan){plan.days[0].items[0].recipe.n='Replacement';plan.days[0].items[1].k=900;if(failSwap)throw new Error('Cannot rebalance');return returnedSwap}}
  });
  // Expose the real handlers in this isolated VM; production has no test API.
  const instrumented=source.replace(/\}\)\(\);\s*$/, `
    globalThis.probe={generate,swap,readSavedPlan,restorePlan,setPlan(value){plan=value;visibleWeek=2},getPlan(){return plan},getWeek(){return visibleWeek},renders:0,details:0};
    render=()=>{globalThis.probe.renders++};showRecipe=()=>{globalThis.probe.details++};
  })();`);
  vm.runInContext(instrumented,context);
  context.probe.setPlan(snapshot(previous));
  return {api:context.probe,previous,store,node,writeFails(value){failWrite=value},readFails(value){failRead=value},swapFails(value){failSwap=value},swapReturns(value){returnedSwap=value},next(value){next=value}};
}

test('replacement publishes the final returned plan, not an intermediate mutation',()=>{
  const f=fixture(),final=menu('Rebuilt day');f.swapReturns(final);f.api.swap(0,0);
  assert.deepEqual(snapshot(f.api.getPlan()),final);
  assert.deepEqual(JSON.parse(f.store.get(KEY)),final);
  assert.equal(f.api.renders,1);assert.equal(f.api.details,1);
});

test('returned replacement remains unpublished if persistence fails and can be retried',()=>{
  const f=fixture(),final=menu('Rebuilt day');f.swapReturns(final);f.writeFails(true);f.api.swap(0,0);
  assert.deepEqual(snapshot(f.api.getPlan()),f.previous);
  assert.equal(f.store.get(KEY),JSON.stringify(f.previous));
  assert.equal(f.api.renders,0);assert.equal(f.api.details,0);
  f.writeFails(false);f.api.swap(0,0);
  assert.deepEqual(snapshot(f.api.getPlan()),final);
  assert.deepEqual(JSON.parse(f.store.get(KEY)),final);
});

test('failed generation preserves committed menu, week and recipe detail; retry publishes once',()=>{
  const f=fixture();f.writeFails(true);f.api.generate();
  assert.deepEqual(snapshot(f.api.getPlan()),f.previous);
  assert.equal(f.api.getWeek(),2);
  assert.equal(f.store.get(KEY),JSON.stringify(f.previous));
  assert.equal(f.api.renders,0);
  assert.equal(f.node('mpRecipeDetail').innerHTML,'Previous recipe detail');
  assert.equal(f.node('mpGenerate').disabled,false);
  assert.match(f.node('mpStatus').innerHTML,/Storage full/);
  f.writeFails(false);f.api.generate();
  assert.equal(f.api.getPlan().createdAt,'New');
  assert.equal(f.api.getWeek(),0);
  assert.deepEqual(JSON.parse(f.store.get(KEY)),snapshot(f.api.getPlan()));
  assert.equal(f.api.renders,1);
  assert.equal(f.node('mpRecipeDetail').innerHTML,'');
});

test('failed replacement cannot mutate any meal or rebalance the committed day',()=>{
  const f=fixture();f.writeFails(true);f.api.swap(0,0);
  assert.deepEqual(snapshot(f.api.getPlan()),f.previous);
  assert.equal(f.store.get(KEY),JSON.stringify(f.previous));
  assert.equal(f.api.renders,0);assert.equal(f.api.details,0);
  assert.match(f.node('mpStatus').innerHTML,/Storage full/);
  f.writeFails(false);f.api.swap(0,0);
  assert.equal(f.api.getPlan().days[0].items[0].recipe.n,'Replacement');
  assert.equal(f.api.getPlan().days[0].items[1].k,900);
  assert.deepEqual(JSON.parse(f.store.get(KEY)),snapshot(f.api.getPlan()));
  assert.equal(f.api.renders,1);assert.equal(f.api.details,1);
});

test('a solver throwing after partial mutation leaves the original menu unchanged',()=>{
  const f=fixture();f.swapFails(true);f.api.swap(0,0);
  assert.deepEqual(snapshot(f.api.getPlan()),f.previous);
  assert.equal(f.store.get(KEY),JSON.stringify(f.previous));
  assert.equal(f.api.renders,0);
});

test('serialization failure cannot replace the active menu',()=>{
  const f=fixture();const candidate=menu('Unserializable');candidate.circular=candidate;f.next(candidate);
  f.api.generate();
  assert.deepEqual(snapshot(f.api.getPlan()),f.previous);
  assert.equal(f.store.get(KEY),JSON.stringify(f.previous));
  assert.equal(f.api.renders,0);
  assert.equal(f.node('mpGenerate').disabled,false);
});

const validSavedMenu=()=>({createdAt:'legacy',preferences:{kcal:2200,protein:160,carbs:250,fat:70},days:[{
  day:1,totals:{k:2200,p:160,c:250,f:70},withinTarget:true,items:[{
    k:2200,p:160,c:250,f:70,recipe:{n:'Legacy recipe',i:['100 g rice'],s:['Cook the rice.']}
  }]
}]});

test('valid legacy menus without ingredient-level metadata remain readable',()=>{
  const f=fixture(),saved=validSavedMenu();f.store.set(KEY,JSON.stringify(saved));
  assert.deepEqual(snapshot(f.api.readSavedPlan()),saved);
  f.api.restorePlan();assert.deepEqual(snapshot(f.api.getPlan()),saved);
  assert.equal(f.node('mpStatus').innerHTML,'');
  assert.equal(f.store.get(KEY),JSON.stringify(saved));
});

test('seven-intake saved menus are restored completely while eight remain rejected',()=>{
  const f=fixture(),saved=validSavedMenu();saved.preferences.meals=6;saved.preferences.includePostWorkoutShake=true;
  saved.days[0].trainingDay=true;
  saved.days[0].items=Array.from({length:7},()=>snapshot(saved.days[0].items[0]));
  f.store.set(KEY,JSON.stringify(saved));f.api.restorePlan();
  assert.deepEqual(snapshot(f.api.getPlan()),saved);
  assert.equal(f.store.get(KEY),JSON.stringify(saved));
  saved.days[0].items.push(snapshot(saved.days[0].items[0]));f.store.set(KEY,JSON.stringify(saved));
  assert.throws(()=>f.api.readSavedPlan(),/formato no válido/);
  assert.equal(f.store.get(KEY),JSON.stringify(saved));
});

test('missing menu and explicitly saved null are normal empty states',()=>{
  for(const stored of [undefined,'null']){
    const f=fixture();if(stored===undefined)f.store.delete(KEY);else f.store.set(KEY,stored);
    f.api.restorePlan();assert.equal(f.api.getPlan(),null);
    assert.equal(f.node('mpStatus').innerHTML,'');
  }
});

test('fixed breakfast ingredients with text-only quantities survive restoration',()=>{
  const f=fixture(),saved=validSavedMenu();
  saved.days[0].items[0].ingredientAmounts=[
    {text:'60 g de avena',adjustable:false,estimated:false,quantityEstimated:false},
    {text:'1 huevo (60 g)',adjustable:false,estimated:false,quantityEstimated:false}
  ];
  f.store.set(KEY,JSON.stringify(saved));
  f.api.restorePlan();
  assert.deepEqual(snapshot(f.api.getPlan()),saved);
  assert.equal(f.node('mpStatus').innerHTML,'');
  assert.equal(f.store.get(KEY),JSON.stringify(saved));
  saved.days[0].items[0].ingredientAmounts[0].qty=-1;
  f.store.set(KEY,JSON.stringify(saved));
  assert.throws(()=>f.api.readSavedPlan(),/incompleto/);
});

for(const raw of ['{broken','','{}','[]','{"days":[null],"preferences":{}}']){
  test(`damaged saved menu is reported without deleting its raw value: ${raw||'empty string'}`,()=>{
    const f=fixture();f.store.set(KEY,raw);
    assert.doesNotThrow(()=>f.api.restorePlan());
    assert.equal(f.api.getPlan(),null);assert.equal(f.store.get(KEY),raw);
    assert.match(f.node('mpStatus').innerHTML,/No se pudo recuperar/);
    assert.match(f.node('mpStatus').innerHTML,/role="alert"/);
    assert.equal(f.api.renders,1);
  });
}

test('invalid render and recipe-detail fields are rejected before activation',()=>{
  const mutations=[
    plan=>{plan.preferences.kcal=null},
    plan=>{plan.days=[]},
    plan=>{plan.days[0].items=[]},
    plan=>{plan.days[0].totals.k=-1},
    plan=>{plan.days[0].items[0].recipe.s='not an array'},
    plan=>{plan.days[0].items[0].ingredientAmounts=[null]},
    plan=>{plan.days[0].items[0].ingredientAmounts=[{text:'10 g rice',qty:10,nutrients:{k:20,p:'2',c:3,f:1}}]}
  ];
  for(const mutate of mutations){
    const f=fixture(),saved=validSavedMenu();mutate(saved);const raw=JSON.stringify(saved);f.store.set(KEY,raw);
    f.api.restorePlan();assert.equal(f.api.getPlan(),null);assert.equal(f.store.get(KEY),raw);
  }
});

test('temporary read failure leaves storage untouched and a later restore can recover',()=>{
  const f=fixture(),saved=validSavedMenu();f.store.set(KEY,JSON.stringify(saved));f.readFails(true);
  assert.doesNotThrow(()=>f.api.restorePlan());assert.equal(f.api.getPlan(),null);
  assert.equal(f.store.get(KEY),JSON.stringify(saved));
  f.readFails(false);f.api.restorePlan();assert.deepEqual(snapshot(f.api.getPlan()),saved);
});
