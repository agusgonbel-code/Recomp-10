import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const json = path => JSON.parse(read(path));

test('App Store: la identidad de distribución es coherente', () => {
  const release = json('app-store/release.json');
  const capacitor = json('capacitor.config.json');
  const pkg = json('package.json');

  assert.equal(release.bundleId, capacitor.appId);
  assert.equal(release.marketingVersion, pkg.version);
  assert.ok(Number.isInteger(release.buildNumber) && release.buildNumber > 0);
  assert.match(release.minimumIos, /^\d+\.\d+$/);
  assert.ok(Number.parseFloat(release.minimumIos) >= 15);
});

test('App Store: la ficha española está completa y dentro de límites', () => {
  const metadata = json('app-store/metadata.es-ES.json');
  const capacitor = json('capacitor.config.json');

  assert.equal(metadata.locale, 'es-ES');
  assert.equal(metadata.name, capacitor.appName);
  assert.ok(metadata.name.length > 0 && metadata.name.length <= 30);
  assert.ok(metadata.subtitle.length > 0 && metadata.subtitle.length <= 30);
  assert.ok(metadata.promotionalText.length > 0 && metadata.promotionalText.length <= 170);
  assert.ok(metadata.description.length > 0 && metadata.description.length <= 4000);
  assert.ok(metadata.keywords.length > 0 && metadata.keywords.length <= 100);
  assert.equal(metadata.primaryCategory, 'HEALTH_AND_FITNESS');
  assert.match(metadata.privacyUrl, /^https:\/\//);
  assert.match(metadata.supportUrl, /^https:\/\//);
  assert.ok(metadata.reviewNotes.length > 0);
  assert.doesNotMatch(JSON.stringify(metadata), /TODO|TBD|PLACEHOLDER|example\.com/i);
});

test('App Store: el guion de capturas es reproducible, privado y corresponde a la interfaz', () => {
  const screenshots = json('app-store/screenshots.es-ES.json');
  const html = read('index.html');

  assert.equal(screenshots.locale, 'es-ES');
  assert.equal(screenshots.platform, 'IPHONE');
  assert.equal(screenshots.orientation, 'PORTRAIT');
  assert.equal(screenshots.minimumScreenshots, 1);
  assert.equal(screenshots.maximumScreenshots, 10);
  assert.ok(screenshots.scenes.length >= screenshots.minimumScreenshots);
  assert.ok(screenshots.scenes.length <= screenshots.maximumScreenshots);
  assert.deepEqual(screenshots.scenes.map(scene => scene.order),
    screenshots.scenes.map((_, index) => index + 1));
  assert.equal(new Set(screenshots.scenes.map(scene => scene.id)).size, screenshots.scenes.length);

  for (const scene of screenshots.scenes) {
    assert.ok(scene.headline.length > 0 && scene.headline.length <= 40);
    assert.ok(scene.supportingText.length > 0 && scene.supportingText.length <= 70);
    assert.ok(Array.isArray(scene.setup) && scene.setup.length >= 2);
    assert.ok(scene.setup.every(step => typeof step === 'string' && step.trim().length > 0));
    assert.match(html, new RegExp(`id=['"]${scene.surface}['"]`));
  }

  const privacy = screenshots.privacyRules.join(' ');
  assert.match(privacy, /datos ficticios/i);
  assert.match(privacy, /no incluir fotografías reales/i);
  assert.match(privacy, /kcal.*proteínas.*carbohidratos.*grasas/i);
});

test('App Store: el configurador y CI fijan y validan versión y build', () => {
  const configure = read('scripts/configure-ios-privacy.mjs');
  const workflow = read('.github/workflows/ios-native-ci.yml');

  assert.match(configure, /MARKETING_VERSION/);
  assert.match(configure, /CURRENT_PROJECT_VERSION/);
  assert.match(configure, /IPHONEOS_DEPLOYMENT_TARGET/);
  assert.match(workflow, /-configuration Release/);
  assert.match(workflow, /EXPECTED_BUNDLE/);
  assert.match(workflow, /EXPECTED_VERSION/);
  assert.match(workflow, /EXPECTED_BUILD/);
  assert.match(workflow, /Release-iphonesimulator/);
});
