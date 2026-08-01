import { openCryptDeepLink } from './desktopDeepLinks';
import { isAndroidRuntime } from './platform';
import { configureAndroidSystemNotifications } from '../features/notifications/systemNotifications';

export async function configureAndroidRuntime() {
  if (!isAndroidRuntime()) return;

  const [{ App }, { StatusBar, Style }] = await Promise.all([
    import('@capacitor/app'),
    import('@capacitor/status-bar'),
  ]);

  const launchUrl = await App.getLaunchUrl();
  if (launchUrl?.url) openCryptDeepLink(launchUrl.url);

  await Promise.all([
    App.addListener('appUrlOpen', ({ url }) => openCryptDeepLink(url)),
    App.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack) {
        window.history.back();
      } else {
        void App.minimizeApp();
      }
    }),
    StatusBar.setStyle({ style: Style.Light }),
    StatusBar.setBackgroundColor({ color: '#070b16' }),
    StatusBar.setOverlaysWebView({ overlay: false }),
    configureAndroidSystemNotifications(),
  ]);
}

export async function hideAndroidSplashScreen() {
  if (!isAndroidRuntime()) return;

  const { SplashScreen } = await import('@capacitor/splash-screen');
  await SplashScreen.hide({ fadeOutDuration: 220 });
}
