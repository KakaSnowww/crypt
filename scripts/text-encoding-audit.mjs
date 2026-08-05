import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const includedExtensions = new Set([
  '.css',
  '.html',
  '.js',
  '.json',
  '.md',
  '.mjs',
  '.ts',
  '.tsx',
  '.xml',
  '.yaml',
  '.yml',
]);
const ignoredDirectories = new Set([
  '.git',
  'build',
  'coverage',
  'dist',
  'dist-electron',
  'node_modules',
  'release',
]);
const suspiciousSequences = [
  [0x00c3, 0x00a1],
  [0x00c3, 0x00a2],
  [0x00c3, 0x00a3],
  [0x00c3, 0x00a7],
  [0x00c3, 0x00a9],
  [0x00c3, 0x00aa],
  [0x00c3, 0x00ad],
  [0x00c3, 0x00b3],
  [0x00c3, 0x00b4],
  [0x00c3, 0x00b5],
  [0x00c3, 0x00ba],
  [0x00c2, 0x00b7],
  [0x00c2, 0x00ba],
  [0x00c2, 0x00aa],
  [0x00e2, 0x20ac, 0x201c],
  [0x00e2, 0x20ac, 0x201d],
  [0x00e2, 0x20ac, 0x00a6],
  [0x00e2, 0x0153, 0x201c],
  [0x00ef, 0x00bf, 0x00bd],
  [0xfffd],
].map((codePoints) => String.fromCodePoint(...codePoints));

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.name.startsWith('.backup-') || entry.name.includes('-backup-')) continue;
    const absolutePath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name)) files.push(...(await collectFiles(absolutePath)));
      continue;
    }

    if (entry.isFile() && includedExtensions.has(path.extname(entry.name).toLowerCase())) {
      files.push(absolutePath);
    }
  }

  return files;
}

const failures = [];
for (const file of await collectFiles(root)) {
  const content = await readFile(file, 'utf8');
  const lines = content.split(/\r?\n/u);

  lines.forEach((line, index) => {
    const sequence = suspiciousSequences.find((candidate) => line.includes(candidate));
    if (sequence) {
      failures.push({
        line: index + 1,
        path: path.relative(root, file),
        sequence,
      });
    }
  });
}

if (failures.length) {
  console.error('Foram encontrados textos possivelmente corrompidos por codificação:');
  for (const failure of failures) {
    console.error(`- ${failure.path}:${failure.line} (${JSON.stringify(failure.sequence)})`);
  }
  process.exitCode = 1;
} else {
  console.log('Auditoria de textos UTF-8 aprovada.');
}
