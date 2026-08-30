import {spawnSync} from 'node:child_process';
import {mkdirSync,writeFileSync,renameSync,readFileSync,readdirSync,existsSync,openSync,closeSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const phases=['unit','browser'];
const integer=(value,min,max)=>Number.isInteger(value)&&value>=min&&value<=max;
export function configuration(env=process.env){
 const config={scope:env.STRESS_SCOPE,shards:Number(env.STRESS_SHARDS),passes:Number(env.STRESS_PASSES),source:env.STRESS_SOURCE,run:String(env.STRESS_RUN||''),attempt:String(env.STRESS_ATTEMPT||'')};
 if(!['smoke','release-1000'].includes(config.scope)||!integer(config.shards,1,10)||!integer(config.passes,1,100)||!/^[a-f0-9]{40}$/.test(config.source||'')||!/^\d+$/.test(config.run)||!/^\d+$/.test(config.attempt))throw Error('Invalid stress configuration');
 if(config.scope==='release-1000'&&config.shards*config.passes!==1000)throw Error('Release requires 1000 repetitions of each suite');
 return config;
}
function atomicJson(path,value){writeFileSync(path+'.tmp',JSON.stringify(value,null,2)+'\n');renameSync(path+'.tmp',path);}
export function runPhase(config,phase,shard,directory,execute){
 if(!phases.includes(phase)||!integer(shard,1,config.shards))throw Error('Invalid phase/shard');
 mkdirSync(directory,{recursive:true});
 const path=join(directory,`${phase}-${shard}.json`),log=join(directory,`${phase}-${shard}.log`);
 const record={version:1,...config,phase,shard,completed:0,status:'running',failedIteration:null};
 atomicJson(path,record);
 for(let iteration=1;iteration<=config.passes;iteration++){
  let result;
  try{result=execute(log,iteration)}catch(error){result={status:null,error:String(error.message||error)}}
  if(result?.status!==0){record.status='failure';record.failedIteration=iteration;record.error=result?.error?String(result.error):'Suite failed or was interrupted';atomicJson(path,record);return record;}
  // Count only after the whole suite exits successfully. Interrupted runners
  // leave a durable partial count and cannot masquerade as success.
  record.completed=iteration;atomicJson(path,record);
 }
 record.status='success';atomicJson(path,record);return record;
}
export function summarize(records,config,jobResult='success',downloadResult='success'){
 const issues=[],seen=new Set(),completed={unit:0,browser:0};
 for(const record of records){
  if(!record||record.version!==1||!phases.includes(record.phase)||!integer(record.shard,1,config.shards)){issues.push('Invalid phase record');continue;}
  const key=`${record.phase}-${record.shard}`;
  if(seen.has(key)){issues.push(`Duplicate ${key}`);continue;}seen.add(key);
  if(['scope','source','run','attempt','shards','passes'].some(field=>record[field]!==config[field])){issues.push(`Identity mismatch ${key}`);continue;}
  if(!integer(record.completed,0,config.passes)){issues.push(`Invalid counter ${key}`);continue;}
  completed[record.phase]+=record.completed;
  if(record.status!=='success'||record.completed!==config.passes||record.failedIteration!==null)issues.push(`Incomplete ${key}`);
 }
 for(const phase of phases)for(let shard=1;shard<=config.shards;shard++)if(!seen.has(`${phase}-${shard}`))issues.push(`Missing ${phase}-${shard}`);
 if(jobResult!=='success')issues.push(`Matrix result: ${jobResult}`);
 if(downloadResult!=='success')issues.push(`Download result: ${downloadResult}`);
 const planned=config.shards*config.passes;
 if(completed.unit!==planned||completed.browser!==planned)issues.push('Completed totals do not match planned totals');
 return{version:1,...config,result:issues.length?'FAIL':'PASS',releaseValidated:issues.length===0&&config.scope==='release-1000'&&planned===1000,plannedPerSuite:planned,completed,issues};
}
export function readRecords(directory){
 if(!existsSync(directory))return [];
 const records=[];
 for(const entry of readdirSync(directory,{withFileTypes:true})){
  const path=join(directory,entry.name);
  if(entry.isDirectory())records.push(...readRecords(path));
  else if(entry.name.endsWith('.json')){try{records.push(JSON.parse(readFileSync(path,'utf8')))}catch{records.push(null)}}
 }
 return records;
}
function main(){
 const config=configuration(),[mode,directory,output]=process.argv.slice(2);
 if(!directory)throw Error('Missing evidence directory');
 if(mode==='run'){
  const actual=spawnSync('git',['rev-parse','HEAD'],{encoding:'utf8'});
  if(actual.status!==0||actual.stdout.trim()!==config.source)throw Error('Checked-out commit differs from evidence source');
  const phase=process.env.STRESS_PHASE;
  const command=phase==='unit'?['npm',['test']]:['npx',['playwright','test','qa/browser-smoke.spec.js','qa/mobile-layout.spec.js','qa/nutrition-menu-v5.spec.js','qa/meal-intelligence-v60.spec.js','qa/accessibility.spec.js','qa/user-100-sim.spec.js','--workers=2','--reporter=line']];
  const result=runPhase(config,phase,Number(process.env.STRESS_SHARD),directory,log=>{
   const fd=openSync(log,'w');try{return spawnSync(command[0],command[1],{stdio:['ignore',fd,fd]})}finally{closeSync(fd)}
  });
  console.log(JSON.stringify(result));if(result.status!=='success')process.exitCode=1;
 }else if(mode==='aggregate'){
  if(!output)throw Error('Missing report directory');
  const report=summarize(readRecords(directory),config,process.env.STRESS_JOB_RESULT||'missing',process.env.STRESS_DOWNLOAD_RESULT||'missing');
  mkdirSync(output,{recursive:true});atomicJson(join(output,'release-stress.json'),report);
  const text=[`RECOMP STRESS — ${report.scope}`,`SOURCE_COMMIT: ${report.source}`,`RUN: ${report.run} / ATTEMPT: ${report.attempt}`,`RESULT: ${report.result}`,`RELEASE_1000_VALIDATED: ${report.releaseValidated}`,`PLANNED_PER_SUITE: ${report.plannedPerSuite}`,`UNIT_COMPLETED: ${report.completed.unit}`,`BROWSER_COMPLETED: ${report.completed.browser}`,...report.issues].join('\n')+'\n';
  writeFileSync(join(output,'release-stress.txt'),text);console.log(text);if(report.result!=='PASS')process.exitCode=1;
 }else throw Error('Expected run or aggregate');
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main();
