import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  connectAuthEmulator,
  Auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
  signOut,
  onIdTokenChanged,
  User as FirebaseUser,
} from 'firebase/auth';

import { config } from './config';

const firebaseConfig = {
  apiKey: config.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: config.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: config.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: config.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: config.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: config.NEXT_PUBLIC_FIREBASE_APP_ID,
};

function initFirebase(): { app: FirebaseApp; auth: Auth } {
  const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  const auth = getAuth(app);

  // Connect to emulator ONLY in non-production environments
  const isProd = process.env.NODE_ENV === 'production';
  const emulatorHost = process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST;
  const useEmulator = !isProd && (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true' || !!emulatorHost);

  if (useEmulator) {
    const host = emulatorHost ? `http://${emulatorHost.replace(/^http:\/\//, '')}` : 'http://127.0.0.1:9099';
    try {
      connectAuthEmulator(auth, host, { disableWarnings: true });
    } catch {
      // Emulator might already be connected
    }
  }

  return { app, auth };
}

export const { app, auth } = initFirebase();

export {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
  signOut,
  onIdTokenChanged,
};
export type { FirebaseUser };
