import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const expectedVersion = '0.11.1';
const expectedTitle = 'Clear Signal';
const failures = [];
const successes = [];

function readText(relativePath) {
  const absolutePath = path.join(root, relativePath);

  if (!fs.existsSync(absolutePath)) {
    failures.push(`Arquivo ausente: ${relativePath}`);
    return '';
  }

  return fs.readFileSync(absolutePath, 'utf8');
}

function readJson(relativePath) {
  try {
    return JSON.parse(readText(relativePath));
  } catch (error) {
    failures.push(
      `JSON inválido em ${relativePath}: ${error instanceof Error ? error.message : String(error)}`,
    );
    return null;
  }
}

function check(condition, success, failure) {
  if (condition) {
    successes.push(success);
  } else {
    failures.push(failure);
  }
}

const packageJson = readJson('package.json');
const lock = readJson('package-lock.json');
const androidBuild = readText('android/app/build.gradle');
const releaseNotes = readText('src/features/desktopUpdates/releaseNotes.ts');
const windowsWorkflow = readText('.github/workflows/release-windows.yml');
const androidWorkflow = readText('.github/workflows/release-android.yml');
const publicNotes = readText(`docs/releases/v${expectedVersion}.md`);

check(
  packageJson?.version === expectedVersion,
  `package.json está em ${expectedVersion}`,
  `package.json não está em ${expectedVersion}`,
);

check(
  lock?.version === expectedVersion && lock?.packages?.['']?.version === expectedVersion,
  'package-lock.json está sincronizado',
  `package-lock.json não está sincronizado com ${expectedVersion}`,
);

check(
  androidBuild.includes(`versionName "${expectedVersion}"`),
  `Android versionName está em ${expectedVersion}`,
  `Android versionName não está em ${expectedVersion}`,
);

const versionCode = Number(androidBuild.match(/versionCode\s+(\d+)/u)?.[1] ?? 0);

check(
  versionCode >= 19,
  `Android versionCode é ${versionCode}`,
  'Android versionCode precisa ser pelo menos 19',
);

check(
  releaseNotes.includes(`'${expectedVersion}': {`) &&
    releaseNotes.includes(`title: '${expectedTitle}'`),
  `Novidades internas da ${expectedVersion} existem`,
  `Novidades internas da ${expectedVersion} estão ausentes`,
);

check(
  publicNotes.includes(`# Crypt v${expectedVersion} — ${expectedTitle}`),
  'Notas públicas da release existem',
  'Notas públicas da release estão ausentes',
);

check(
  windowsWorkflow.includes('npm run release:verify') &&
    windowsWorkflow.includes('Crypt-Windows-$version.sha256') &&
    windowsWorkflow.includes(expectedTitle),
  'Workflow Windows verifica versão e checksum',
  'Workflow Windows não contém as proteções novas',
);

check(
  androidWorkflow.includes('npm run release:verify') &&
    androidWorkflow.includes('Crypt-Android-$version.sha256') &&
    androidWorkflow.includes(expectedTitle),
  'Workflow Android verifica versão e checksum',
  'Workflow Android não contém as proteções novas',
);

const requiredFiles = [
  'src/styles/arcane-theme.css',
  'src/styles/accessibility-performance.css',
  'src/features/experience/AppExperienceCoordinator.tsx',
  'src/features/server-onboarding/ServerOnboardingGate.tsx',
  'src/features/moderation/components/AutoModPanel.tsx',
  'src/features/arcana/ArcanaTierBadge.tsx',
  'public/arcane/ui/arcane-circle.svg',
  'scripts/build-release-local.ps1',
  'scripts/publish-release-v0.11.1.ps1',
];

for (const relativePath of requiredFiles) {
  check(
    fs.existsSync(path.join(root, relativePath)),
    `Presente: ${relativePath}`,
    `Bloco obrigatório ausente: ${relativePath}`,
  );
}

const forbiddenTrackedCandidates = [
  '.env',
  'android/app/google-services.json',
  'android/crypt-release.keystore',
  'android/crypt-release.jks',
];

for (const relativePath of forbiddenTrackedCandidates) {
  if (fs.existsSync(path.join(root, relativePath))) {
    successes.push(`Arquivo sensível local detectado e mantido fora do pacote: ${relativePath}`);
  }
}

console.log('');
console.log(`CRYPT — VERIFICAÇÃO DA RELEASE v${expectedVersion}`);
console.log('');

for (const success of successes) {
  console.log(`[OK] ${success}`);
}

if (failures.length) {
  console.log('');

  for (const failure of failures) {
    console.error(`[ERRO] ${failure}`);
  }

  console.log('');
  console.error(`A release possui ${failures.length} pendência(s).`);
  process.exit(1);
}

console.log('');
console.log(`Metadados da v${expectedVersion} estão consistentes.`);
