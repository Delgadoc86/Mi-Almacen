import * as Application from 'expo-application';
import Constants from 'expo-constants';

// Separado de versionUtils.ts a propósito: expo-application/expo-constants
// son módulos nativos que no resuelven bajo el runner de tests puros de Node
// (ver package.json "test:unit", que ejecuta src/utils/*.test.ts fuera de
// Metro) — solo funcionan dentro del bundle de la app.
//
// Application.nativeApplicationVersion es la versión real del binario nativo
// instalado (APK/EAS Build) — en Expo Go/dev puede devolver null, por eso el
// fallback a Constants.expoConfig.version (el valor de app.config.ts).
export function getInstalledAppVersion(): string | null {
  return Application.nativeApplicationVersion ?? Constants.expoConfig?.version ?? null;
}
