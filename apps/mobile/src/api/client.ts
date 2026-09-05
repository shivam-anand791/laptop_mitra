import { LaptopMitraApiClient } from '@laptopmitra/api-client';
import Constants from 'expo-constants';
import { getAccessToken } from '../utils/storage';

const apiUrl = Constants.expoConfig?.extra?.apiUrl || 'http://localhost:3001';

export const apiClient = new LaptopMitraApiClient({
  baseUrl: apiUrl,
  getToken: async () => {
    const token = await getAccessToken();
    return token;
  },
});

export default apiClient;