import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('la aplicación iOS incluye una declaración de privacidad verificable', () => {
  const config = JSON.parse(readFileSync(new URL('../capacitor.config.json', import.meta.url), 'utf8'));
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  const build = readFileSync(new URL('../scripts/build-mobile.mjs', import.meta.url), 'utf8');
  const installer = readFileSync(new URL('../scripts/configure-ios-privacy.mjs', import.meta.url), 'utf8');
  const manifest = readFileSync(new URL('../PrivacyInfo.xcprivacy', import.meta.url), 'utf8');
  const privacyPage = readFileSync(new URL('../privacy.html', import.meta.url), 'utf8');
  const supportPage = readFileSync(new URL('../support.html', import.meta.url), 'utf8');
  const workflow = readFileSync(new URL('../.github/workflows/ios-native-ci.yml', import.meta.url), 'utf8');

  assert.equal(config.appId, 'com.agusgonbel.recomp10m');
  assert.equal(config.appName, 'Recomp 10M');
  assert.equal(config.webDir, 'www');
  assert.equal(pkg.scripts['ios:privacy'], 'node scripts/configure-ios-privacy.mjs');
  assert.match(pkg.scripts['ios:add'], /cap add ios.*ios:privacy/);
  assert.match(pkg.scripts['ios:prepare'], /cap sync ios.*ios:privacy/);

  for (const resource of ['privacy.html', 'support.html']) {
    assert.ok(build.includes(`'${resource}'`), `Falta ${resource} en el paquete móvil`);
  }

  assert.match(installer, /PrivacyInfo\.xcprivacy/);
  assert.match(installer, /PBXResourcesBuildPhase/);
  assert.match(installer, /PrivacyInfo\.xcprivacy in Resources/);
  assert.match(manifest, /<key>NSPrivacyTracking<\/key>\s*<false\/>/);
  assert.match(manifest, /<key>NSPrivacyTrackingDomains<\/key>\s*<array\/>/);
  assert.match(manifest, /<key>NSPrivacyCollectedDataTypes<\/key>\s*<array\/>/);
  assert.match(manifest, /<key>NSPrivacyAccessedAPITypes<\/key>\s*<array\/>/);
  assert.match(privacyPage, /permanezcan en tu dispositivo/);
  assert.match(supportPage, /github\.com\/agusgonbel-code\/Recomp-10\/issues/);
  assert.match(workflow, /pull_request:/);
  assert.match(workflow, /npm run ios:privacy/);
  assert.match(workflow, /plutil -lint/);
  assert.match(workflow, /NSPrivacyCollectedDataTypes/);
});
