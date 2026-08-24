import test from 'node:test';
import assert from 'node:assert/strict';
await import('../meal-planner.js');

test('la compra semanal no puede perder cantidades cuando se repite un ingrediente',()=>{
  const plan={days:[
    {items:[{ingredientAmounts:[{text:'100 g de pollo'}]}]},
    {items:[{ingredientAmounts:[{text:'150 g de pollo'}]}]}
  ]};
  const shopping=RecompMealPlanner.shoppingByWeek(plan,0);
  const chicken=shopping.find(item=>/pollo/i.test(item.name||''));
  assert.ok(chicken,'La compra semanal debe contener pollo');
  assert.equal(chicken.totalQty,250,'Debe sumar 100 g + 150 g, no conservar solo la primera cantidad');
  assert.equal(chicken.unit,'g');
});
