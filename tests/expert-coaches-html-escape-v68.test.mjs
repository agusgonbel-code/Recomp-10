import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../expert-coaches-v1.js',import.meta.url),'utf8');

test('el formulario experto escapa comillas y apóstrofes antes de usar innerHTML',()=>{
  assert.ok(source.includes(`replace(/[&<>"']/g`));
  assert.ok(source.includes(`'"':'&quot;'`));
  assert.ok(source.includes(`"'":'&#39;'`));
  assert.ok(!source.includes(`'\\"':'&quot;'`));
});
