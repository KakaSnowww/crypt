import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const outputDirectory = process.argv[2];

if (!outputDirectory) {
  console.error('Uso: node scripts/create-release-checksums.mjs <pasta>');
  process.exit(1);
}

const absoluteDirectory = path.resolve(outputDirectory);

if (!fs.existsSync(absoluteDirectory)) {
  console.error(`Pasta não encontrada: ${absoluteDirectory}`);
  process.exit(1);
}

const supportedExtensions = new Set(['.aab', '.apk', '.blockmap', '.exe', '.yml']);

const files = fs
  .readdirSync(absoluteDirectory, {
    withFileTypes: true,
  })
  .filter(
    (entry) =>
      entry.isFile() &&
      supportedExtensions.has(path.extname(entry.name).toLocaleLowerCase('en-US')),
  )
  .map((entry) => entry.name)
  .sort((left, right) => left.localeCompare(right));

if (!files.length) {
  console.error('Nenhum artefato compatível encontrado.');
  process.exit(1);
}

const lines = files.map((name) => {
  const buffer = fs.readFileSync(path.join(absoluteDirectory, name));
  const hash = crypto.createHash('sha256').update(buffer).digest('hex');

  return `${hash}  ${name}`;
});

const outputPath = path.join(absoluteDirectory, 'SHA256SUMS.txt');

fs.writeFileSync(outputPath, `${lines.join('\n')}\n`, 'utf8');

console.log(`Checksums criados em ${outputPath}`);
