import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const projectRoot = resolve(import.meta.dirname, '..');
const googleServicesPath = resolve(projectRoot, 'android/app/google-services.json');
const requiredSounds = ['som1.mp3', 'som4.mp3'];
const expectedPackage = 'com.kakasnowww.crypt';
const errors = [];

if (!existsSync(googleServicesPath)) {
  errors.push(
    'android/app/google-services.json não existe. Execute scripts/configure-firebase-push.ps1.',
  );
} else {
  try {
    const configuration = JSON.parse(readFileSync(googleServicesPath, 'utf8'));
    const packages = (configuration.client ?? []).map(
      (client) => client?.client_info?.android_client_info?.package_name,
    );
    if (!packages.includes(expectedPackage)) {
      errors.push(`google-services.json não contém o aplicativo ${expectedPackage}.`);
    }
  } catch {
    errors.push('android/app/google-services.json não contém um JSON válido.');
  }
}

for (const sound of requiredSounds) {
  if (!existsSync(resolve(projectRoot, 'public', sound))) {
    errors.push(`public/${sound} não foi encontrado.`);
  }
}

if (errors.length > 0) {
  console.error('\nConfiguração de push Android incompleta:\n');
  for (const error of errors) console.error(`- ${error}`);
  console.error('\nConsulte docs/push-notifications.md.\n');
  process.exitCode = 1;
} else {
  console.log('Push Android configurado: Firebase, pacote e sons conferidos.');
}
