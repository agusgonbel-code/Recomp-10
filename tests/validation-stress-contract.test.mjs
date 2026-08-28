import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const workflow = readFileSync(new URL('../.github/workflows/validation-bundle-stress.yml', import.meta.url), 'utf8');

test('joint stress repeats the check-in and nutrition browser regressions', () => {
  const command = workflow.split('\n').find(line => line.includes('npx playwright test '));
  for (const file of ['browser-smoke', 'checkin-save', 'mobile-layout', 'nutrition-menu-v5', 'meal-intelligence-v60', 'accessibility']) {
    assert.ok(command?.includes(`qa/${file}.spec.js`), `${file} must remain in the repeated browser gate`);
  }
  assert.match(workflow, /- '\*\.js'/, 'root application scripts must trigger validation');
});

test('stress evidence records completed iterations only after successful commands', () => {
  for (const phase of ['unit', 'browser']) {
    const zero = workflow.indexOf(`echo 0 > /tmp/recomp-validation-evidence/${phase}-completed.txt`);
    const command = workflow.indexOf(phase === 'unit' ? 'npm test >' : 'npx playwright test ');
    const increment = workflow.indexOf(`echo "$i" > /tmp/recomp-validation-evidence/${phase}-completed.txt`);
    assert.ok(zero > 0 && zero < command && command < increment);
    assert.match(workflow.slice(command, increment), /exit 1/, 'failed iterations cannot be counted');
  }
  assert.match(workflow, /\[ "\$unit" = 100 \] && \[ "\$browser" = 100 \]/);
  assert.match(workflow, /TESTED_COMMIT: \$\(git rev-parse HEAD\)/);
});

test('joint stress keeps failure evidence without write access or deployment', () => {
  assert.match(workflow, /permissions:\s+contents: read/);
  assert.match(workflow, /Upload validation evidence even after failure\s+if: always\(\)/);
  assert.match(workflow, /uses: actions\/upload-artifact@v4/);
  assert.match(workflow, /Require all repetitions to have completed\s+if: always\(\)/);
  assert.doesNotMatch(workflow, /contents: write|git push|deploy-pages/);
});
