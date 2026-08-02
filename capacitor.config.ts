import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  android: {
    allowMixedContent: false,
    backgroundColor: '#070b16',
  },
  appId: 'com.kakasnowww.crypt',
  appName: 'Crypt',
  plugins: {
    Keyboard: {
      autoBackdropColor: 'dom',
      resizeOnFullScreen: true,
    },
    LocalNotifications: {
      iconColor: '#7C3AED',
      smallIcon: 'ic_stat_crypt',
    },
    PushNotifications: {
      presentationOptions: [],
    },
    SplashScreen: {
      backgroundColor: '#070b16',
      launchAutoHide: false,
      showSpinner: false,
    },
    StatusBar: {
      backgroundColor: '#070b16',
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
