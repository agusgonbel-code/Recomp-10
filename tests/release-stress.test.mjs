import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {configuration,runPhase,summarize,readRecords} from '../scripts/release-stress.mjs';
const env={STRESS_SCOPE:'smoke',STRESS_SHARDS:'2',STRESS_PASSES:'1',STRESS_SOURCE:'a'.repeat(40),STRESS_RUN:'12',STRESS_ATTEMPT:'1'};
const config=configuration(env);
const records=(c=config)=>['unit','browser'].flatMap(phase=>Array.from({length:c.shards},(_,i)=>({version:1,...c,phase,shard:i+1,completed:c.passes,status:'success',failedIteration:null})));
const temporary=fn=>{const dir=mkdtempSync(join(tmpdir(),'recomp-stress-test-'));try{return fn(dir)}finally{rmSync(dir,{recursive:true,force:true})}};

test('smoke cannot be described as the complete 1000-repetition release',()=>{
 const result=summarize(records(),config);assert.equal(result.result,'PASS');assert.equal(result.releaseValidated,false);assert.deepEqual(result.completed,{unit:2,browser:2});
 assert.throws(()=>configuration({...env,STRESS_SCOPE:'release-1000'}),/1000/);
});
test('complete release requires 1000 actual passes from each suite',()=>{
 const c=configuration({...env,STRESS_SCOPE:'release-1000',STRESS_SHARDS:'10',STRESS_PASSES:'100'}),result=summarize(records(c),c);
 assert.equal(result.result,'PASS');assert.equal(result.releaseValidated,true);assert.deepEqual(result.completed,{unit:1000,browser:1000});
});
test('runner persists each completed suite, not the planned count',()=>temporary(dir=>{
 const c={...config,passes:3};let calls=0;
 const result=runPhase(c,'unit',1,dir,()=>{const record=JSON.parse(readFileSync(join(dir,'unit-1.json'),'utf8'));assert.equal(record.completed,calls);assert.equal(record.status,'running');calls++;return{status:0}});
 assert.equal(calls,3);assert.equal(result.completed,3);assert.equal(result.status,'success');assert.deepEqual(JSON.parse(readFileSync(join(dir,'unit-1.json'),'utf8')),result);
}));
test('failed iteration is never counted and no later iteration executes',()=>temporary(dir=>{
 let calls=0;const result=runPhase({...config,passes:3},'browser',1,dir,()=>({status:++calls===2?1:0}));
 assert.equal(calls,2);assert.equal(result.completed,1);assert.equal(result.failedIteration,2);assert.equal(result.status,'failure');
}));
test('interruption or process launch failure retains a zero completion count',()=>temporary(dir=>{
 for(const execute of [()=>({status:null,signal:'SIGTERM'}),()=>{throw Error('launch failed')}]){
  const result=runPhase(config,'unit',1,dir,execute);assert.equal(result.completed,0);assert.equal(result.status,'failure');
 }
}));
test('missing duplicate corrupt and incomplete records all fail closed',()=>{
 const good=records();
 for(const bad of [[],good.slice(1),[...good,good[0]],[...good,null],good.map((r,i)=>i===0?{...r,completed:0}:r),good.map((r,i)=>i===0?{...r,status:'running'}:r),good.map((r,i)=>i===0?{...r,failedIteration:1}:r)])assert.equal(summarize(bad,config).result,'FAIL');
});
test('records from a different commit run attempt or scope cannot certify a release',()=>{
 for(const [field,value] of [['source','b'.repeat(40)],['run','13'],['attempt','2'],['scope','release-1000'],['passes',2],['shards',3]]){
  const bad=records();bad[0][field]=value;assert.equal(summarize(bad,config).result,'FAIL',field);
 }
});
test('invalid completion counters are rejected rather than summed',()=>{
 for(const value of [-1,1.5,2,'1',null,NaN]){const bad=records();bad[0].completed=value;assert.equal(summarize(bad,config).result,'FAIL');}
});
test('a cancelled matrix or failed artifact download cannot pass with complete records',()=>{
 assert.equal(summarize(records(),config,'cancelled').result,'FAIL');assert.equal(summarize(records(),config,'success','failure').result,'FAIL');
});
test('nested artifacts are read and malformed JSON remains a validation failure',()=>temporary(dir=>{
 mkdirSync(join(dir,'artifact'));writeFileSync(join(dir,'artifact','unit-1.json'),JSON.stringify(records()[0]));writeFileSync(join(dir,'broken.json'),'{broken');writeFileSync(join(dir,'last.log'),'ignored');
 assert.equal(readRecords(dir).length,2);assert.equal(summarize(readRecords(dir),config).result,'FAIL');assert.deepEqual(readRecords(join(dir,'missing')),[]);
}));
test('CLI writes a failing report and exits nonzero when artifacts are missing',()=>temporary(dir=>{
 const result=spawnSync(process.execPath,['scripts/release-stress.mjs','aggregate',join(dir,'missing'),join(dir,'report')],{cwd:new URL('..',import.meta.url),env:{...process.env,...env,STRESS_JOB_RESULT:'success',STRESS_DOWNLOAD_RESULT:'success'},encoding:'utf8'});
 assert.equal(result.status,1);const report=JSON.parse(readFileSync(join(dir,'report','release-stress.json'),'utf8'));assert.equal(report.result,'FAIL');assert.equal(report.completed.unit,0);
}));
test('workflow has no branch-writing credentials and scopes artifacts to the current attempt',()=>{
 const workflow=readFileSync(new URL('../.github/workflows/release-stress.yml',import.meta.url),'utf8');
 assert.match(workflow,/contents: read/);assert.doesNotMatch(workflow,/contents: write|git push|git commit|ref: main/);
 assert.equal((workflow.match(/persist-credentials: false/g)||[]).length,2);
 assert.match(workflow,/pattern: recomp-stress-\$\{\{ github.run_attempt \}\}-\*/);
 assert.match(workflow,/phase: \[unit, browser\]/);assert.match(workflow,/STRESS_SOURCE: \$\{\{ github.sha \}\}/);
 const script=readFileSync(new URL('../scripts/release-stress.mjs',import.meta.url),'utf8');assert.match(script,/qa\/user-100-sim.spec.js/);
});
