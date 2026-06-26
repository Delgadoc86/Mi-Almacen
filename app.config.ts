import { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'Mi Almacén',
  slug: 'mi-almacen',
  version: '1.1.1',
  orientation: 'portrait',
  icon: './assets/icon.png',
  scheme: 'mialmacen',
  userInterfaceStyle: 'light',
  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#F8FAFB',
  },
  ios: {
    supportsTablet: true,
    infoPlist: {
      NSFaceIDUsageDescription: 'Mi Almacén usa Face ID para verificar tu identidad al ingresar.',
    },
  },
  android: {
    package: 'com.delgadodev.mialmacen',
    versionCode: 3,
    adaptiveIcon: {
      backgroundColor: '#E6F4FE',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    permissions: [],
    predictiveBackGestureEnabled: false,
  },
  web: {
    favicon: './assets/favicon.png',
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
    'expo-local-authentication',
  ],
  extra: {
    eas: {
      projectId: '66613a19-35d5-46ef-b02f-c392d3d3fc80',
    },
  },
};

export default config;
