import { LaptopMitraApiClient } from '@laptopmitra/api-client';
import { signOut as firebaseSignOut } from 'firebase/auth';
import { API_BASE_URL } from '../config';
import { getFirebaseAuth } from '../firebase/firebase';
import { clearAuth } from '../utils/storage';

export const apiClient = new LaptopMitraApiClient({
  baseUrl: API_BASE_URL,
  getToken: async () => {
    const currentUser = getFirebaseAuth().currentUser;
    return currentUser ? currentUser.getIdToken() : null;
  },
  onUnauthorized: async () => {
    await firebaseSignOut(getFirebaseAuth()).catch(() => undefined);
    await clearAuth().catch(() => undefined);
  },
});

export default apiClient;
