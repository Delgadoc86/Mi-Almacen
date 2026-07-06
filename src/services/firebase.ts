import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { initializeAuth, getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getFunctions, type Functions } from 'firebase/functions';
import AsyncStorage from '@react-native-async-storage/async-storage';

// getReactNativePersistence lives in the RN bundle of firebase/auth (resolved by Metro)
// but is absent from the Node bundle's TypeScript declarations. Use require() to bypass.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { getReactNativePersistence } = require('firebase/auth') as {
  getReactNativePersistence: (storage: typeof AsyncStorage) => unknown;
};

const REQUIRED_VARS = [
  'EXPO_PUBLIC_FIREBASE_API_KEY',
  'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
  'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'EXPO_PUBLIC_FIREBASE_APP_ID',
] as const;

const missing = REQUIRED_VARS.filter(k => !process.env[k]);
if (missing.length > 0) {
  console.warn('[Firebase] Variables de entorno faltantes:', missing.join(', '));
}

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? '',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? '',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? '',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? '',
};

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let functionsInstance: Functions;

try {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

  // initializeAuth with AsyncStorage persistence so the session survives app restarts.
  // Falls back to getAuth on hot-reload (auth already initialized on same app instance).
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage) as any,
    });
  } catch {
    auth = getAuth(app);
  }

  db = getFirestore(app);
  functionsInstance = getFunctions(app);
} catch (e) {
  console.warn('[Firebase] Error al inicializar Firebase:', e);
  throw e;
}

export { auth, db };
export const functions = functionsInstance;
