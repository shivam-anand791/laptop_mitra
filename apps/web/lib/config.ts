// In Vercel, VERCEL_ENV is 'production' for production deployments, and 'preview' for previews.
// Strict environment variable enforcement is active in production deployments, while
// preview deployments and local/CI test builds fall back to safe preview defaults if unset.
const isVercel = process.env.VERCEL === '1';
const isVercelPreview = process.env.VERCEL_ENV === 'preview';
const isStrictProduction =
  process.env.NODE_ENV === 'production' &&
  (isVercel ? process.env.VERCEL_ENV === 'production' : process.env.STRICT_PRODUCTION === 'true');

// Safe fallback defaults for Preview and local builds when dashboard env vars are not set
const PREVIEW_DEFAULTS: Record<string, string> = {
  NEXT_PUBLIC_API_URL: 'https://laptopmitra-api.onrender.com',
  NEXT_PUBLIC_RAZORPAY_KEY_ID: 'rzp_test_placeholder',
  NEXT_PUBLIC_FIREBASE_API_KEY: 'AIzaSyACj0fden0ISvJ8Of1F_2R8VQ-kq1X46hc',
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: 'laptop-mitra.firebaseapp.com',
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'laptop-mitra',
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: 'laptop-mitra.appspot.com',
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: '101564514748',
  NEXT_PUBLIC_FIREBASE_APP_ID: '1:101564514748:web:abcdef123456',
};

function getRequiredValue(name: string, value: string | undefined): string {
  const val = (value || '').trim();
  if (!val) {
    if (isStrictProduction) {
      throw new Error(`Missing required environment variable: ${name}`);
    }
    return PREVIEW_DEFAULTS[name] || '';
  }
  return val;
}

function getApiUrl(name: string, value: string | undefined): string {
  let val = (value || '').trim();
  if (!val) {
    if (isStrictProduction) {
      throw new Error(`Missing required environment variable: ${name}`);
    }
    val = isVercelPreview
      ? PREVIEW_DEFAULTS.NEXT_PUBLIC_API_URL
      : 'http://localhost:3001';
  }

  // Normalise trailing slashes
  val = val.replace(/\/+$/, '');

  if (isStrictProduction && !val.startsWith('https://')) {
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

export const NEXT_PUBLIC_SUPPORT_PHONE =
  process.env.NEXT_PUBLIC_SUPPORT_PHONE || '+917701993300';
export const NEXT_PUBLIC_SUPPORT_PHONE_DISPLAY =
  process.env.NEXT_PUBLIC_SUPPORT_PHONE_DISPLAY || '+91 7701993300';
export const NEXT_PUBLIC_WHATSAPP_NUMBER =
  process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '917701993300';
export const NEXT_PUBLIC_SUPPORT_EMAIL =
  process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'support@laptopmitra.in';

export const isProduction = isStrictProduction;

export const config = {
  NEXT_PUBLIC_API_URL,
  NEXT_PUBLIC_RAZORPAY_KEY_ID,
  NEXT_PUBLIC_FIREBASE_API_KEY,
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  NEXT_PUBLIC_FIREBASE_APP_ID,
  SUPPORT_PHONE: NEXT_PUBLIC_SUPPORT_PHONE,
  SUPPORT_PHONE_DISPLAY: NEXT_PUBLIC_SUPPORT_PHONE_DISPLAY,
  WHATSAPP_NUMBER: NEXT_PUBLIC_WHATSAPP_NUMBER,
  isProduction,
  isVercelPreview,
};

export default config;
