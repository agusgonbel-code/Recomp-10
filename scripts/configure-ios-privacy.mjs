import { copyFile, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const privacySource = path.join(root, 'PrivacyInfo.xcprivacy');
const releasePath = path.join(root, 'app-store', 'release.json');
const privacyDestination = path.join(root, 'ios', 'App', 'App', 'PrivacyInfo.xcprivacy');
const projectPath = path.join(root, 'ios', 'App', 'App.xcodeproj', 'project.pbxproj');

for (const file of [privacySource, projectPath]) {
  await stat(file).catch(() => {
    throw new Error(file === privacySource
      ? 'Falta PrivacyInfo.xcprivacy en la raíz del proyecto.'
      : 'No existe el proyecto iOS. Ejecuta primero `npm run ios:add`.');
  });
}

await copyFile(privacySource, privacyDestination);

const release = JSON.parse(await readFile(releasePath, 'utf8'));
if (release.bundleId !== 'com.agusgonbel.recomp10m') throw new Error('El bundleId de distribución no coincide con Recomp 10M.');
if (!/^\d+\.\d+\.\d+$/.test(release.marketingVersion)) throw new Error('La versión de distribución debe usar formato semántico.');
if (!Number.isInteger(release.buildNumber) || release.buildNumber < 1) throw new Error('El número de compilación debe ser un entero positivo.');
if (!/^\d+\.\d+$/.test(release.minimumIos)) throw new Error('La versión mínima de iOS no es válida.');

let project = await readFile(projectPath, 'utf8');
const fileRef = 'A11CE1010000000000000001';
const buildRef = 'A11CE1010000000000000002';
const buildLine = `\t\t${buildRef} /* PrivacyInfo.xcprivacy in Resources */ = {isa = PBXBuildFile; fileRef = ${fileRef} /* PrivacyInfo.xcprivacy */; };\n`;
const fileLine = `\t\t${fileRef} /* PrivacyInfo.xcprivacy */ = {isa = PBXFileReference; lastKnownFileType = text.xml; path = PrivacyInfo.xcprivacy; sourceTree = "<group>"; };\n`;
const groupLine = `\t\t\t\t${fileRef} /* PrivacyInfo.xcprivacy */,\n`;
const resourceLine = `\t\t\t\t${buildRef} /* PrivacyInfo.xcprivacy in Resources */,\n`;

const addAfter = (source, anchor, addition, description) => {
  if (source.includes(addition.trim())) return source;
  if (!source.includes(anchor)) throw new Error(`No se encontró ${description} en el proyecto Xcode.`);
  return source.replace(anchor, anchor + addition);
};

project = addAfter(project, '/* Begin PBXBuildFile section */\n', buildLine, 'PBXBuildFile');
project = addAfter(project, '/* Begin PBXFileReference section */\n', fileLine, 'PBXFileReference');

if (!project.includes(groupLine.trim())) {
  const appGroup = /(\/\* App \*\/ = \{\n\t\t\tisa = PBXGroup;\n\t\t\tchildren = \(\n)/;
  if (!appGroup.test(project)) throw new Error('No se encontró el grupo App en el proyecto Xcode.');
  project = project.replace(appGroup, `$1${groupLine}`);
}
if (!project.includes(resourceLine.trim())) {
  const resources = /(\/\* Resources \*\/ = \{\n\t\t\tisa = PBXResourcesBuildPhase;\n\t\t\tbuildActionMask = 2147483647;\n\t\t\tfiles = \(\n)/;
  if (!resources.test(project)) throw new Error('No se encontró la fase Resources en el proyecto Xcode.');
  project = project.replace(resources, `$1${resourceLine}`);
}

const replaceBuildSetting = (source, name, value) => {
  const pattern = new RegExp(`(${name} = )[^;]+;`, 'g');
  const matches = source.match(pattern) ?? [];
  if (!matches.length) throw new Error(`No se encontró ${name} en el proyecto Xcode.`);
  return source.replace(pattern, (_, prefix) => `${prefix}${value};`);
};

project = replaceBuildSetting(project, 'MARKETING_VERSION', release.marketingVersion);
project = replaceBuildSetting(project, 'CURRENT_PROJECT_VERSION', String(release.buildNumber));
project = replaceBuildSetting(project, 'IPHONEOS_DEPLOYMENT_TARGET', release.minimumIos);

await writeFile(projectPath, project, 'utf8');
console.log(`Recomp 10M ${release.marketingVersion} (${release.buildNumber}): identidad y privacidad instaladas en iOS.`);
