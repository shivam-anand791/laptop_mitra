import { LaptopMitraApiClient } from '@laptopmitra/api-client';
import { API_BASE_URL } from '../config';
import { getFirebaseAuth } from '../firebase/firebase';

export const apiClient = new LaptopMitraApiClient({
  baseUrl: API_BASE_URL,
  getToken: async () => {
    const currentUser = getFirebaseAuth().currentUser;
    return currentUser ? currentUser.getIdToken() : null;
  },
});

export default apiClient;
