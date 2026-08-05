import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  android: {
    allowMixedContent: false,
    backgroundColor: '#05040d',
  },
  appId: 'com.kakasnowww.crypt',
  appName: 'Crypt',
  plugins: {
    Keyboard: {
      autoBackdropColor: 'dom',
      resizeOnFullScreen: true,
    },
    LocalNotifications: {
      iconColor: '#9667FF',
      smallIcon: 'ic_stat_crypt',
    },
    PushNotifications: {
      presentationOptions: [],
    },
    SplashScreen: {
      backgroundColor: '#05040d',
      launchAutoHide: false,
      showSpinner: false,
    },
    StatusBar: {
      backgroundColor: '#05040d',
      overlaysWebView: false,
      style: 'LIGHT',
    },
  },
  server: {
    androidScheme: 'https',
    hostname: 'crypt.local',
  },
  webDir: 'dist',
};

export default config;
