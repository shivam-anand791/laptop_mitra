import { FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app';
import {
  Auth,
  getAuth,
  initializeAuth,
} from 'firebase/auth';
// @ts-expect-error getReactNativePersistence is exported by React Native entrypoint of firebase/auth
import { getReactNativePersistence } from 'firebase/auth';
import Constants from 'expo-constants';
import { securePersistenceStorage } from './securePersistence';

let app: FirebaseApp | undefined;
let auth: Auth | undefined;

function getFirebaseConfig() {
  const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, string | undefined>;
  const config = {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? extra.FIREBASE_API_KEY,
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? extra.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? extra.FIREBASE_PROJECT_ID,
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? extra.FIREBASE_STORAGE_BUCKET,
    messagingSenderId:
      process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? extra.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? extra.FIREBASE_APP_ID,
  };

  const missingVars: string[] = [];
  if (!config.apiKey?.trim()) missingVars.push('EXPO_PUBLIC_FIREBASE_API_KEY');
  if (!config.authDomain?.trim()) missingVars.push('EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN');
  if (!config.projectId?.trim()) missingVars.push('EXPO_PUBLIC_FIREBASE_PROJECT_ID');
  if (!config.storageBucket?.trim()) missingVars.push('EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET');
  if (!config.messagingSenderId?.trim()) missingVars.push('EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID');
  if (!config.appId?.trim()) missingVars.push('EXPO_PUBLIC_FIREBASE_APP_ID');

  if (missingVars.length > 0) {
    throw new Error(
      'Firebase client configuration is missing required environment variables: ' + missingVars.join(', '),
    );
  }
  return config as {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
  };
}

export function getFirebaseAuth(): Auth {
  if (auth) return auth;

  const config = getFirebaseConfig();
  app = getApps().length > 0 ? getApp() : initializeApp(config);
  if (app.options.projectId !== config.projectId) {
    throw new Error('Firebase client configuration does not match the initialized Firebase project.');
  }

  const securePersistence = getReactNativePersistence(securePersistenceStorage);

  try {
    auth = initializeAuth(app, { persistence: securePersistence });
  } catch (error: any) {
    if (error?.code !== 'auth/already-initialized') throw error;
    auth = getAuth(app);
  }

  return auth;
}
