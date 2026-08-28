import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';

const KEY='recomp_checkins_v4';
const source=fs.readFileSync(new URL('../recomp-checkin-v4.js',import.meta.url),'utf8');
function fixture(initial=[],rawInitial=JSON.stringify(initial),decisionMode=false){
 const stored=new Map([[KEY,rawInitial]]);
 const targetKeys=['targets','macro','recomp_targets_v2'];
 if(decisionMode)for(const key of targetKeys)stored.set(key,JSON.stringify({kcal:2200,protein:160,carbs:250,fat:62}));
 const fields=Object.fromEntries(Object.entries({weight:'80.5',waist:'90',diet:'85',training:'90',performance:'0',sleep:'3',hunger:'3',stress:'3',notes:'Conservar esta nota'}).map(([k,value])=>[k,{value}]));
 for(const k of ['front','side','back','standardized'])fields[k]={checked:false};
 const status={textContent:'',setAttribute(){}};
 let renders=0,failWrite=false,failRead=false,writes=0,failKey=null,failRestoreKey=null,restoring=false;
 const events=[];
 const host={
  style:{},querySelector(selector){if(selector==='[data-checkin-status]')return status;const key=/data-k="([^"]+)"/.exec(selector)?.[1];return fields[key];},
  set innerHTML(value){this.html=value;renders++;},get innerHTML(){return this.html;},
 };
 const storage={
  getItem(key){if(failRead&&key===KEY)throw new Error('storage denied');return stored.get(key)??null;},
  setItem(key,value){writes++;if((failWrite&&key===KEY)||key===failKey){restoring=true;throw new Error('quota exceeded');}if(restoring&&key===failRestoreKey)throw new Error('storage unavailable');stored.set(key,value);},
  removeItem(key){stored.delete(key);},
 };
 const context={localStorage:storage,CustomEvent:class{constructor(type){this.type=type;}},document:{
  readyState:'complete',getElementById:id=>id==='recompCheckin360'?host:null,
  dispatchEvent(event){events.push({type:event.type,history:JSON.parse(stored.get(KEY)),targets:stored.get('targets'),decisions:stored.get('recomp_decisions_v4')});},
 }};
 if(decisionMode)context.RecompReview={
  review:()=>({status:'stalled',reliable:true,calorieDelta:-100,signals:[],confidence:'high'}),
  apply:t=>({...t,kcal:t.kcal-100,carbs:t.carbs-25}),
 };
 vm.runInNewContext(source,context);
 return {host,fields,status,events,stored,save:()=>host.onclick({target:{dataset:{act:'save'}}}),act:a=>host.onclick({target:{dataset:{act:a}}}),
  get renders(){return renders;},get writes(){return writes;},
  set failWrite(v){failWrite=v;},set failRead(v){failRead=v;},set failKey(v){failKey=v;},set failRestoreKey(v){failRestoreKey=v;},
 };
}
const old={id:'old',date:'2026-08-01',weight:81};

test('save appends to the latest persisted history, not the history captured at render',()=>{
 const f=fixture([old]);
 f.stored.set(KEY,JSON.stringify([old,{id:'other-tab',date:'2026-08-02',weight:80.8}]));
 f.save();
 const history=JSON.parse(f.stored.get(KEY));
 assert.equal(history.length,3);assert.ok(history.some(x=>x.id==='other-tab'));
 assert.equal(f.events.length,1);assert.equal(f.events[0].history.length,3);
});

test('accept persists all target copies and audit before notifying consumers',()=>{
 const f=fixture([old],undefined,true);f.act('accept');
 const values=['targets','macro','recomp_targets_v2'].map(k=>JSON.parse(f.stored.get(k)));
 assert.equal(values[0].kcal,2100);assert.deepEqual(values[1],values[0]);assert.deepEqual(values[2],values[0]);
 const audit=JSON.parse(f.stored.get('recomp_decisions_v4'));assert.equal(audit.length,1);assert.equal(audit[0].action,'accept');
 assert.ok(f.events.some(e=>e.type==='recomp:targets-updated'));
 assert.ok(f.events.every(e=>JSON.parse(e.targets).kcal===2100&&JSON.parse(e.decisions).length===1));
});

test('each failed decision write restores completed writes and emits no success event',()=>{
 for(const key of ['targets','macro','recomp_targets_v2','recomp_last_accepted_review_v4','recomp_decisions_v4']){
  const f=fixture([old],undefined,true),before=[...f.stored];
  f.failKey=key;assert.doesNotThrow(()=>f.act('accept'),key);
  assert.deepEqual([...f.stored].sort(),before.sort(),key);
  assert.equal(f.events.length,0,key);assert.equal(f.renders,1,key);
  assert.match(f.status.textContent,/no se pudo guardar/i);assert.equal(f.fields.notes.value,'Conservar esta nota');
  f.failKey=null;f.act('accept');
  assert.equal(JSON.parse(f.stored.get('targets')).kcal,2100);
  assert.equal(JSON.parse(f.stored.get('recomp_decisions_v4')).length,1);
 }
});

test('accepting the same review twice cannot repeatedly lower calories',()=>{
 const f=fixture([old],undefined,true);f.act('accept');f.act('accept');
 assert.equal(JSON.parse(f.stored.get('recomp_targets_v2')).kcal,2100);
 assert.equal(JSON.parse(f.stored.get('recomp_decisions_v4')).length,1);
 assert.match(f.status.textContent,/ya se aplicó/i);
});

test('a rollback failure is explicitly reported and never announced as success',()=>{
 const f=fixture([old],undefined,true);
 f.failKey='recomp_decisions_v4';f.failRestoreKey='macro';
 assert.doesNotThrow(()=>f.act('accept'));
 assert.equal(f.events.length,0);assert.equal(f.stored.has('recomp_decisions_v4'),false);
 assert.match(f.status.textContent,/no se pudieron restaurar/i);
 assert.match(f.status.textContent,/revisa los objetivos/i);
});

test('decisions reject stale history or targets rather than applying a hidden recalculation',()=>{
 for(const changed of [KEY,'targets','macro','recomp_targets_v2']){
  const f=fixture([old],undefined,true);
  f.stored.set(changed,JSON.stringify(changed===KEY?[old,{...old,id:'new'}]:{kcal:2400,protein:160,carbs:300,fat:62}));
  const before=[...f.stored];assert.doesNotThrow(()=>f.act('accept'));
  assert.deepEqual([...f.stored],before);assert.equal(f.events.length,0);
  assert.match(f.status.textContent,/han cambiado/i);
 }
});

test('accepting a review without actionable evidence does not manufacture targets',()=>{
 const f=fixture([old]);f.act('accept');
 assert.equal(f.writes,0);assert.equal(f.events.length,0);
 assert.match(f.status.textContent,/no hay.*aplicar/i);
});

test('hold and reject preserve malformed audit data and recover from write failures',()=>{
 for(const action of ['hold','reject']){
  const f=fixture([old],undefined,true),targets=f.stored.get('targets');
  f.stored.set('recomp_decisions_v4','{broken');assert.doesNotThrow(()=>f.act(action));
  assert.equal(f.stored.get('recomp_decisions_v4'),'{broken');assert.equal(f.writes,0);
  f.stored.delete('recomp_decisions_v4');f.failKey='recomp_decisions_v4';
  assert.doesNotThrow(()=>f.act(action));assert.equal(f.events.length,0);
  f.failKey=null;f.act(action);
  assert.equal(JSON.parse(f.stored.get('recomp_decisions_v4'))[0].action,action);
  assert.equal(f.stored.get('targets'),targets);
 }
});

test('failed write preserves the form and history and announces an actionable error',()=>{
 const f=fixture([old]),before=f.host.innerHTML;
 f.failWrite=true;
 assert.doesNotThrow(()=>f.save());
 assert.equal(f.stored.get(KEY),JSON.stringify([old]));assert.equal(f.events.length,0);
 assert.equal(f.renders,1);assert.equal(f.host.innerHTML,before);
 assert.equal(f.fields.notes.value,'Conservar esta nota');assert.equal(f.fields.weight.value,'80.5');
 assert.match(f.status.textContent,/no se pudo guardar/i);assert.match(f.status.textContent,/reintenta/i);
});

test('retry after a failed write saves exactly one check-in and notifies only after persistence',()=>{
 const f=fixture([old]);f.failWrite=true;
 try{f.save();}catch{}
 f.failWrite=false;f.save();
 const history=JSON.parse(f.stored.get(KEY));
 assert.equal(history.length,2);assert.equal(history.at(-1).notes,'Conservar esta nota');
 assert.equal(f.events.length,1);assert.equal(f.events[0].history.length,2);
 assert.equal(f.renders,2);assert.match(f.status.textContent,/check-in guardado/i);
});

test('read failures cannot replace the history with a stale in-memory snapshot',()=>{
 const f=fixture([old]);f.failRead=true;
 assert.doesNotThrow(()=>f.save());
 assert.equal(f.writes,0);assert.equal(f.events.length,0);assert.equal(f.renders,1);
 assert.match(f.status.textContent,/no se pudo guardar/i);
});

test('malformed persisted history is preserved instead of overwritten during save',()=>{
 for(const raw of ['{broken','{}','null','[null]']){
  const f=fixture([old]);f.stored.set(KEY,raw);
  assert.doesNotThrow(()=>f.save());
  assert.equal(f.stored.get(KEY),raw);assert.equal(f.writes,0);assert.equal(f.events.length,0);
  assert.match(f.status.textContent,/no se pudo guardar/i);
 }
});

test('initial malformed history still renders the form without silently overwriting storage',()=>{
 for(const raw of ['{broken','{}','null','[null]']){
  const f=fixture([],raw);
  assert.equal(f.renders,1);assert.match(f.host.innerHTML,/Guardar check-in/);
  assert.match(f.status.textContent,/no se pudo leer/i);
  assert.doesNotThrow(()=>f.save());
  assert.equal(f.stored.get(KEY),raw);
 }
});
