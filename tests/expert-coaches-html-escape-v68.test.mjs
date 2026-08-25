import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../expert-coaches-v1.js',import.meta.url),'utf8');

test('el formulario experto escapa comillas y apóstrofes antes de usar innerHTML',()=>{
  assert.match(source,/replace\(\/\[&<>"'\]\\/g/);
  assert.match(source,/'"':'&quot;'/);
  assert.match(source,/"'":'&#39;'/);
  assert.doesNotMatch(source,/'\\"':'&quot;'/);
});
