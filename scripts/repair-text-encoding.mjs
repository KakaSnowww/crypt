import { readdir, readFile, writeFile } from 'node:fs/promises';
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

function characters(...codePoints) {
  return String.fromCodePoint(...codePoints);
}

const replacements = new Map([
  [characters(0x00c3, 0x00a1), 'á'],
  [characters(0x00c3, 0x00a2), 'â'],
  [characters(0x00c3, 0x00a3), 'ã'],
  [characters(0x00c3, 0x00a7), 'ç'],
  [characters(0x00c3, 0x00a9), 'é'],
  [characters(0x00c3, 0x00aa), 'ê'],
  [characters(0x00c3, 0x00ad), 'í'],
  [characters(0x00c3, 0x00b3), 'ó'],
  [characters(0x00c3, 0x00b4), 'ô'],
  [characters(0x00c3, 0x00b5), 'õ'],
  [characters(0x00c3, 0x00ba), 'ú'],
  [characters(0x00c3, 0x0081), 'Á'],
  [characters(0x00c3, 0x0082), 'Â'],
  [characters(0x00c3, 0x0083), 'Ã'],
  [characters(0x00c3, 0x0087), 'Ç'],
  [characters(0x00c3, 0x0089), 'É'],
  [characters(0x00c3, 0x008a), 'Ê'],
  [characters(0x00c3, 0x008d), 'Í'],
  [characters(0x00c3, 0x0093), 'Ó'],
  [characters(0x00c3, 0x0094), 'Ô'],
  [characters(0x00c3, 0x0095), 'Õ'],
  [characters(0x00c3, 0x009a), 'Ú'],
  [characters(0x00c2, 0x00b7), '·'],
  [characters(0x00c2, 0x00ba), 'º'],
  [characters(0x00c2, 0x00aa), 'ª'],
  [characters(0x00c2, 0x00a0), ' '],
  [characters(0x00e2, 0x0153, 0x201c), '✓'],
  [characters(0x00e2, 0x20ac, 0x201c), '–'],
  [characters(0x00e2, 0x20ac, 0x201d), '—'],
  [characters(0x00e2, 0x20ac, 0x00a6), '…'],
  [characters(0x00e2, 0x20ac, 0x2122), '’'],
  [characters(0x00e2, 0x20ac, 0x0153), '“'],
]);

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

const changedFiles = [];
for (const file of await collectFiles(root)) {
  const relativePath = path.relative(root, file).replaceAll('\\', '/');
  if (relativePath === 'supabase/functions/external-oauth/index.ts') continue;

  const original = await readFile(file, 'utf8');
  let repaired = original;

  for (const [broken, correct] of replacements) {
    repaired = repaired.replaceAll(broken, correct);
  }

  if (repaired !== original) {
    await writeFile(file, repaired, 'utf8');
    changedFiles.push(path.relative(root, file));
  }
}

if (changedFiles.length) {
  console.log('Textos reparados:');
  for (const file of changedFiles) console.log(`- ${file}`);
} else {
  console.log('Nenhum texto corrompido precisou ser reparado.');
}
