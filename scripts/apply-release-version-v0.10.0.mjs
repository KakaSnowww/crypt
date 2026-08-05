import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const targetVersion = '0.10.0';
const minimumAndroidVersionCode = 17;

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
      'powershell -NoProfile -ExecutionPolicy Bypass -File scripts/publish-release-v0.10.0.ps1',
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

function updateCapacitorIdentity() {
  const relativePath = 'capacitor.config.ts';
  let content = readText(relativePath);

  content = content.replaceAll('#070b16', '#05040d').replaceAll('#7C3AED', '#9667FF');

  writeText(relativePath, content);
}

function updateIndexIdentity() {
  const relativePath = 'index.html';
  let content = readText(relativePath);

  content = content.replace(
    /content="Crypt —[^"]+"/u,
    'content="Crypt — comunidades, chamadas e conversas em uma experiência arcana e tecnológica."',
  );
  content = content.replace(
    /<meta name="theme-color" content="[^"]+"\s*\/>/u,
    '<meta name="theme-color" content="#05040d" />',
  );
  content = content.replace(/<title>[^<]+<\/title>/u, '<title>Crypt — Arcane Network</title>');

  writeText(relativePath, content);
}

function updateAndroidColors() {
  const relativePath = 'android/app/src/main/res/values/colors.xml';
  let content = readText(relativePath);

  content = content
    .replaceAll('#7C3AED', '#9667FF')
    .replaceAll('#070B16', '#05040D')
    .replaceAll('#2563EB', '#54B7FF');

  writeText(relativePath, content);
}

function updateBundledReleaseNotes() {
  const relativePath = 'src/features/desktopUpdates/releaseNotes.ts';
  let content = readText(relativePath);

  if (content.includes("'0.10.0': {")) {
    return;
  }

  const anchor = 'const bundledReleases: Record<string, CryptRelease> = {\n';

  if (!content.includes(anchor)) {
    throw new Error('Não encontrei a coleção bundledReleases.');
  }

  const release = `  '0.10.0': {
    highlights: [
      {
        description:
          'Toda a interface recebeu constelações, runas, profundidade, animações e uma identidade mágica e tecnológica própria.',
        title: 'O Crypt renasceu',
      },
      {
        description:
          'Arcana ganhou assinatura recorrente, doze níveis mensais, símbolos próprios, benefícios premium e Runas de Comunidade.',
        title: 'A jornada Arcana',
      },
      {
        description:
          'Servidores evoluem por Círculos, recebem identidade ampliada, arquivos maiores e uma entrada guiada com regras.',
        title: 'Comunidades que evoluem',
      },
      {
        description:
          'Chamadas, áudio, vídeo, compartilhamento de tela e cartões de participantes ficaram mais estáveis e integrados aos perfis.',
        title: 'Presença mais viva',
      },
      {
        description:
          'Busca global, AutoMod, antispam, hierarquia de cargos, menções e navegação inteligente tornam o dia a dia mais completo.',
        title: 'Mais poder e controle',
      },
      {
        description:
          'Texto ajustável, contraste, atalhos, redução de movimento e melhorias para o teclado Android tornam o Crypt mais acessível.',
        title: 'Feito para mais pessoas',
      },
    ],
    summary:
      'A versão 0.10.0 é a Ascensão Arcana: uma reconstrução visual e funcional do Crypt no Windows e no Android.',
    title: 'A Ascensão Arcana',
    version: '0.10.0',
  },
`;

  content = content.replace(anchor, `${anchor}${release}`);

  writeText(relativePath, content);
}

updatePackageFiles();
updateAndroidVersion();
updateCapacitorIdentity();
updateIndexIdentity();
updateAndroidColors();
updateBundledReleaseNotes();

console.log(`Crypt preparado para a versão ${targetVersion}.`);
