import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const targetVersion = '0.11.0';
const minimumAndroidVersionCode = 18;

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
      'powershell -NoProfile -ExecutionPolicy Bypass -File scripts/publish-release-v0.11.0.ps1',
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

  if (content.includes("'0.11.0': {")) {
    return;
  }

  const anchor = 'const bundledReleases: Record<string, CryptRelease> = {\n';

  if (!content.includes(anchor)) {
    throw new Error('Não encontrei a coleção bundledReleases.');
  }

  const release = `  '0.11.0': {
    highlights: [
      {
        description:
          'O aplicativo foi reconstruído com uma identidade gamer e dev em preto, roxo e ciano.',
        title: 'Uma interface totalmente nova',
      },
      {
        description:
          'Servidores, cargos, membros e permissões ganharam uma central profissional e ações rápidas.',
        title: 'Servidores refeitos',
      },
      {
        description:
          'Perfis e configurações agora são mais claros, organizados e consistentes em todas as telas.',
        title: 'Perfil e configurações',
      },
      {
        description:
          'O volume individual chega a 300%, com correções de áudio e sincronização de entrada e saída.',
        title: 'Calls mais fortes',
      },
      {
        description:
          'Online, ausente, ocupado e offline são atualizados em tempo real na lista de membros.',
        title: 'Presença sincronizada',
      },
      {
        description:
          'Assinantes podem enviar arquivos de até 500 MB e usar avatar GIF de até 5 MB.',
        title: 'Crypt Pro ampliado',
      },
    ],
    summary:
      'A versão 0.11.0 é o System Reboot: o Crypt foi reconstruído para gamers, comunidades e programadores.',
    title: 'System Reboot',
    version: '0.11.0',
  },
`;

  content = content.replace(anchor, `${anchor}${release}`);

  writeText(relativePath, content);
}

updatePackageFiles();
updateAndroidVersion();
updateBundledReleaseNotes();

console.log(`Crypt preparado para a versão ${targetVersion}.`);
