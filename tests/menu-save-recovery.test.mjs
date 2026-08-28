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
  let failWrite=false, failSwap=false, next=menu('New');
  const context = vm.createContext({
    document:{readyState:'loading',addEventListener(){},getElementById:node},
    localStorage:{getItem:key=>store.get(key)??null,setItem(key,value){if(key===KEY&&failWrite)throw new Error('Storage full');store.set(key,value)}},
    recipes:[{}], alert(){},
    RecompMealPlanner:{normalizeRecipeCatalog:x=>x,macroTargets:()=>({kcal:2200,protein:160,carbs:250,fat:70}),generateDays:()=>next,
      swapMeal(plan){plan.days[0].items[0].recipe.n='Replacement';plan.days[0].items[1].k=900;if(failSwap)throw new Error('Cannot rebalance')}}
  });
  // Expose the real handlers in this isolated VM; production has no test API.
  const instrumented=source.replace(/\}\)\(\);\s*$/, `
    globalThis.probe={generate,swap,setPlan(value){plan=value;visibleWeek=2},getPlan(){return plan},getWeek(){return visibleWeek},renders:0,details:0};
    render=()=>{globalThis.probe.renders++};showRecipe=()=>{globalThis.probe.details++};
  })();`);
  vm.runInContext(instrumented,context);
  context.probe.setPlan(snapshot(previous));
  return {api:context.probe,previous,store,node,writeFails(value){failWrite=value},swapFails(value){failSwap=value},next(value){next=value}};
}

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
