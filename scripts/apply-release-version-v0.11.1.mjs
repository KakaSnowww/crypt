import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const targetVersion = '0.11.1';
const minimumAndroidVersionCode = 19;

function readText(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function writeText(relativePath, content) {
  fs.writeFileSync(
    path.join(root, relativePath),
    content.endsWith('\n') ? content : `${content}\n`,
    'utf8',
  );
}

function readJson(relativePath) {
  return JSON.parse(readText(relativePath));
}

function writeJson(relativePath, value) {
  writeText(relativePath, JSON.stringify(value, null, 2));
}

function updatePackageFiles() {
  const packageJson = readJson('package.json');

  packageJson.version = targetVersion;
  packageJson.scripts = {
    ...packageJson.scripts,
    'release:verify': 'node scripts/verify-release.mjs',
    'release:local':
      'powershell -NoProfile -ExecutionPolicy Bypass -File scripts/build-release-local.ps1',
    'release:publish':
      'powershell -NoProfile -ExecutionPolicy Bypass -File scripts/publish-release-v0.11.1.ps1',
  };

  writeJson('package.json', packageJson);

  const lock = readJson('package-lock.json');

  lock.version = targetVersion;

  if (lock.packages && typeof lock.packages === 'object' && lock.packages['']) {
    lock.packages[''].version = targetVersion;
  }

  writeJson('package-lock.json', lock);
}

function updateAndroidVersion() {
  const relativePath = 'android/app/build.gradle';
  let content = readText(relativePath);

  const versionCodeMatch = content.match(/versionCode\s+(\d+)/u);
  const currentVersionCode = versionCodeMatch
    ? Number(versionCodeMatch[1])
    : minimumAndroidVersionCode;
  const nextVersionCode = Math.max(currentVersionCode, minimumAndroidVersionCode);

  content = content.replace(/versionCode\s+\d+/u, `versionCode ${nextVersionCode}`);
  content = content.replace(/versionName\s+"[^"]+"/u, `versionName "${targetVersion}"`);

  writeText(relativePath, content);
}

function updateBundledReleaseNotes() {
  const relativePath = 'src/features/desktopUpdates/releaseNotes.ts';
  let content = readText(relativePath);

  if (content.includes("'0.11.1': {")) {
    return;
  }

  const anchor = 'const bundledReleases: Record<string, CryptRelease> = {\n';

  if (!content.includes(anchor)) {
    throw new Error('Não encontrei a coleção bundledReleases.');
  }

  const release = `  '0.11.1': {
    highlights: [
      {
        description:
          'O modo Voz limpa agora usa cancelamento de ruído Krisp AI, com proteção WebRTC automática em aparelhos incompatíveis.',
        title: 'Voz realmente limpa',
      },
      {
        description:
          'Transmissões não abrem mais sozinhas. Cada pessoa escolhe quando assistir e pode parar sem sair da call.',
        title: 'Você controla a transmissão',
      },
      {
        description:
          'Vídeo e áudio da tela são conectados e interrompidos juntos, sem afetar o restante da chamada.',
        title: 'Compartilhamento previsível',
      },
      {
        description:
          'Trocas, remoções e novos enquadramentos do avatar aparecem na call em tempo real.',
        title: 'Avatar sincronizado',
      },
    ],
    summary:
      'A versão 0.11.1 é a Clear Signal: mais controle sobre transmissões e uma experiência de voz muito mais limpa.',
    title: 'Clear Signal',
    version: '0.11.1',
  },
`;

  content = content.replace(anchor, `${anchor}${release}`);

  writeText(relativePath, content);
}

updatePackageFiles();
updateAndroidVersion();
updateBundledReleaseNotes();

console.log(`Crypt preparado para a versão ${targetVersion}.`);
