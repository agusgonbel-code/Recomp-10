import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const build=await readFile(new URL('../scripts/build-mobile.mjs',import.meta.url),'utf8');
const workflow=await readFile(new URL('../.github/workflows/ios-native-ci.yml',import.meta.url),'utf8');

test('iOS bundle includes the professional stylesheet loaded at runtime',()=>{
  assert.match(build,/['"]professional-v61\.css['"]/);
});

test('iOS native CI reruns when shipped styles or manifest assets change',()=>{
  assert.match(workflow,/- ['"]?\*\.css['"]?/);
  assert.match(workflow,/- ['"]?manifest\.webmanifest['"]?/);
  assert.match(workflow,/- ['"]?icon-192\.png['"]?/);
  assert.match(workflow,/- ['"]?icon-512\.png['"]?/);
});
