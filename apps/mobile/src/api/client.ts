import { LaptopMitraApiClient } from '@laptopmitra/api-client';
import { getAccessToken } from '../utils/storage';
import { API_BASE_URL } from '../config';

export const apiClient = new LaptopMitraApiClient({
  baseUrl: API_BASE_URL,
  getToken: async () => {
    const token = await getAccessToken();
    return token;
  },
});

export default apiClient;