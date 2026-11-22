export const ExecutionEnvironment = {
  StoreClient: 'storeClient',
  Standalone: 'standalone',
  Bare: 'bare',
};

const Constants = {
  executionEnvironment: ExecutionEnvironment.StoreClient,
  expoConfig: {
    extra: {
      API_URL: 'http://127.0.0.1:3001',
      FIREBASE_API_KEY: 'test-api-key',
      FIREBASE_AUTH_DOMAIN: 'test.firebaseapp.com',
      FIREBASE_PROJECT_ID: 'test-project',
      FIREBASE_STORAGE_BUCKET: 'test.appspot.com',
      FIREBASE_MESSAGING_SENDER_ID: '123456789',
      FIREBASE_APP_ID: '1:123456789:web:abcdef',
    },
    hostUri: '127.0.0.1:8081',
  },
  manifest: {},
  ExecutionEnvironment,
};

export default Constants;

