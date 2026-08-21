import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { ArcaneAtmosphere } from './components/arcane/ArcaneAtmosphere';
import { AppExperienceCoordinator } from './features/experience/AppExperienceCoordinator';
import { configureAndroidRuntime, hideAndroidSplashScreen } from './lib/androidRuntime';
import { configureDesktopDeepLinks } from './lib/desktopDeepLinks';
import { configureRuntimeDocument } from './lib/platform';
import './styles/globals.css';
import './styles/cyber-app.css';
import './styles/nova-ui.css';

configureRuntimeDocument();

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('O elemento raiz do Crypt não foi encontrado.');
}

void Promise.all([configureDesktopDeepLinks(), configureAndroidRuntime()])
  .catch(() => undefined)
  .finally(() => {
    createRoot(rootElement).render(
      <StrictMode>
        <AppExperienceCoordinator />
        <ArcaneAtmosphere />
        <App />
      </StrictMode>,
    );
    window.requestAnimationFrame(() => {
      void hideAndroidSplashScreen().catch(() => undefined);
    });
  });
