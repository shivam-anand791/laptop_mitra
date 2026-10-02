/**
 * Mobile app configuration.
 *
 * API_BASE_URL is resolved in this order:
 * 1. EXPO_PUBLIC_API_URL env var (set in .env or shell)
 * 2. expo-constants extra.API_URL (from app.config.js / app.json)
 * 3. Fallback: http://localhost:3000
 *
 * To connect to a dev server on your LAN:
 *   - Find your machine's LAN IP (e.g. 192.168.1.x)
 *   - Set EXPO_PUBLIC_API_URL=http://192.168.1.x:3000
 *   - Or set extra.API_URL in app.config.js
 *
 * Never commit live API URLs or secrets to source control.
 */
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const extra = (Constants.expoConfig?.extra ?? (Constants as any).manifest?.extra ?? {}) as Record<string, string | undefined>;
const legacyManifest = Constants.manifest as unknown as { hostUri?: string } | null;
const hostUri = Constants.expoConfig?.hostUri ?? legacyManifest?.hostUri;
const developmentHost = hostUri ? new URL(`http://${hostUri}`).hostname : null;
const apiHost = developmentHost === 'localhost' || developmentHost === '127.0.0.1'
  ? Platform.OS === 'android' ? '10.0.2.2' : 'localhost'
  : developmentHost ?? (Platform.OS === 'android' ? '10.0.2.2' : 'localhost');
const apiPort = extra.API_PORT ?? '3001';

export const API_BASE_URL: string =
  process.env.EXPO_PUBLIC_API_URL ??
  extra.API_URL ??
  `http://${apiHost}:${apiPort}`;
