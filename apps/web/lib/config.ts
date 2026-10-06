const isProduction = process.env.NODE_ENV === 'production';

function getRequiredValue(name: string, value: string | undefined): string {
  const val = (value || '').trim();
  if (isProduction && !val) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return val;
}

function getApiUrl(name: string, value: string | undefined): string {
  let val = (value || '').trim();
  if (!val) {
    if (isProduction) {
      throw new Error(`Missing required environment variable: ${name}`);
    }
    val = 'http://localhost:3001';
  }

  // Normalise trailing slashes
  val = val.replace(/\/+$/, '');

  if (isProduction && !val.startsWith('https://')) {
    throw new Error(`${name} must start with https:// in production`);
  }

  return val;
}

export const NEXT_PUBLIC_API_URL = getApiUrl(
  'NEXT_PUBLIC_API_URL',
  process.env.NEXT_PUBLIC_API_URL
);

export const NEXT_PUBLIC_RAZORPAY_KEY_ID = getRequiredValue(
  'NEXT_PUBLIC_RAZORPAY_KEY_ID',
  process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID
);

export const NEXT_PUBLIC_FIREBASE_API_KEY = getRequiredValue(
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY
);

export const NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN = getRequiredValue(
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
);

export const NEXT_PUBLIC_FIREBASE_PROJECT_ID = getRequiredValue(
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
);

export const NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET = getRequiredValue(
  'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
  process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
);

export const NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID = getRequiredValue(
  'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
);

export const NEXT_PUBLIC_FIREBASE_APP_ID = getRequiredValue(
  'NEXT_PUBLIC_FIREBASE_APP_ID',
  process.env.NEXT_PUBLIC_FIREBASE_APP_ID
);

export const config = {
  NEXT_PUBLIC_API_URL,
  NEXT_PUBLIC_RAZORPAY_KEY_ID,
  NEXT_PUBLIC_FIREBASE_API_KEY,
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  NEXT_PUBLIC_FIREBASE_APP_ID,
  isProduction,
};

export default config;
