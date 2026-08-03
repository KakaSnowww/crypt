import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const failures = [];

function read(path) {
  return readFileSync(path, 'utf8');
}

function requireText(path, expected, description) {
  if (!read(path).includes(expected)) failures.push(`${description}: ${path}`);
}

function forbidText(path, forbidden, description) {
  if (read(path).includes(forbidden)) failures.push(`${description}: ${path}`);
}

const trackedFiles = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' })
  .split('\0')
  .filter(Boolean);
const forbiddenTrackedFiles = trackedFiles.filter((path) =>
  /(^|\/)(\.env\.local|google-services\.json|key\.properties|[^/]+\.(jks|keystore))$/iu.test(path),
);

if (forbiddenTrackedFiles.length) {
  failures.push(`arquivos secretos versionados: ${forbiddenTrackedFiles.join(', ')}`);
}

requireText('electron/main.ts', 'contextIsolation: true', 'isolamento do renderer ausente');
requireText('electron/main.ts', 'nodeIntegration: false', 'Node foi exposto ao renderer');
requireText('electron/main.ts', 'sandbox: true', 'sandbox do Electron ausente');
forbidText('electron/main.ts', 'webSecurity: false', 'segurança web do Electron desativada');
forbidText(
  'electron/main.ts',
  'allowRunningInsecureContent: true',
  'conteúdo inseguro permitido no Electron',
);

for (const path of trackedFiles.filter((file) =>
  /^(src|electron)\/.*\.[cm]?[jt]sx?$/u.test(file),
)) {
  forbidText(path, 'dangerouslySetInnerHTML', 'HTML não confiável inserido diretamente');
}

const functionConfiguration = read('supabase/config.toml');
for (const functionName of ['delete-account', 'livekit-token', 'push-notifications']) {
  if (!functionConfiguration.includes(`[functions.${functionName}]\nverify_jwt = false`)) {
    failures.push(`configuração inesperada da função ${functionName}`);
  }
}

requireText(
  'supabase/functions/delete-account/index.ts',
  'auth.getUser()',
  'delete-account não valida a sessão manualmente',
);
requireText(
  'supabase/functions/livekit-token/index.ts',
  'auth.getUser()',
  'livekit-token não valida a sessão manualmente',
);
requireText(
  'supabase/functions/push-notifications/index.ts',
  "Deno.env.get('PUSH_WEBHOOK_SECRET')",
  'webhook push não exige segredo dedicado',
);
requireText(
  'supabase/functions/livekit-token/index.ts',
  'consume_livekit_token_rate_limit',
  'emissão LiveKit não possui limite',
);
requireText(
  'supabase/migrations/20260803180000_phase21_22_security_hardening.sql',
  'force row level security',
  'auditoria final não reforça RLS',
);

if (failures.length) {
  console.error('Auditoria estática de segurança falhou:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Auditoria estática de segurança aprovada.');
