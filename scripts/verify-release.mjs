import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const expectedVersion = '0.10.0';
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
const publicNotes = readText('docs/releases/v0.10.0.md');

check(
  packageJson?.version === expectedVersion,
  'package.json está em 0.10.0',
  'package.json não está em 0.10.0',
);

check(
  lock?.version === expectedVersion && lock?.packages?.['']?.version === expectedVersion,
  'package-lock.json está sincronizado',
  'package-lock.json não está sincronizado com 0.10.0',
);

check(
  /versionName\s+"0\.10\.0"/u.test(androidBuild),
  'Android versionName está em 0.10.0',
  'Android versionName não está em 0.10.0',
);

const versionCode = Number(androidBuild.match(/versionCode\s+(\d+)/u)?.[1] ?? 0);

check(
  versionCode >= 17,
  `Android versionCode é ${versionCode}`,
  'Android versionCode precisa ser pelo menos 17',
);

check(
  releaseNotes.includes("'0.10.0': {") && releaseNotes.includes("title: 'A Ascensão Arcana'"),
  'Novidades internas da 0.10.0 existem',
  'Novidades internas da 0.10.0 estão ausentes',
);

check(
  publicNotes.includes('# Crypt v0.10.0'),
  'Notas públicas da release existem',
  'Notas públicas da release estão ausentes',
);

check(
  windowsWorkflow.includes('npm run release:verify') &&
    windowsWorkflow.includes('Crypt-Windows-$version.sha256'),
  'Workflow Windows verifica versão e checksum',
  'Workflow Windows não contém as proteções novas',
);

check(
  androidWorkflow.includes('npm run release:verify') &&
    androidWorkflow.includes('Crypt-Android-$version.sha256'),
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
  'scripts/publish-release-v0.10.0.ps1',
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
console.log('CRYPT — VERIFICAÇÃO DA RELEASE v0.10.0');
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
console.log('Metadados da v0.10.0 estão consistentes.');
