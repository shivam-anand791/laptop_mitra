/**
 * Mobile app configuration.
 *
 * API_BASE_URL resolution:
 * 1. process.env.EXPO_PUBLIC_API_URL (explicitly set via .env or shell)
 * 2. Constants.expoConfig.extra.API_URL
 * 3. Dynamic resolution:
 *    - On Android Emulator (detected via expo-device): 10.0.2.2:PORT
 *    - On Physical Devices / LAN: machine IP from hostUri (e.g. 192.168.x.x:PORT)
 *    - In Tunnel mode: warns that API must be reachable from tunnel or set via EXPO_PUBLIC_API_URL
 */
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import * as Device from 'expo-device';

const extra = (Constants.expoConfig?.extra ?? (Constants as any).manifest?.extra ?? {}) as Record<string, string | undefined>;
const legacyManifest = Constants.manifest as unknown as { hostUri?: string } | null;
export const hostUri = Constants.expoConfig?.hostUri ?? legacyManifest?.hostUri;

// True if Metro is connected via Expo Tunnel (host is not an IP or localhost)
export const isTunnelMode: boolean = Boolean(
  hostUri &&
    !hostUri.startsWith('localhost') &&
    !hostUri.startsWith('127.0.0.1') &&
    !/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(hostUri),
);

export const isPhysicalDevice: boolean = Device.isDevice ?? false;

export const hasExplicitApiUrl: boolean = Boolean(
  process.env.EXPO_PUBLIC_API_URL || extra.API_URL,
);

export const isMissingExplicitApiUrlOnDevice: boolean =
  isPhysicalDevice && !hasExplicitApiUrl;

let hostFromUri: string | null = null;
if (hostUri) {
  try {
    hostFromUri = new URL(`http://${hostUri}`).hostname;
  } catch {
    hostFromUri = hostUri.split(':')[0] || null;
  }
}

if (isTunnelMode) {
  const isDev = typeof __DEV__ !== 'undefined' ? Boolean(__DEV__) : process.env.NODE_ENV !== 'production';
  if (isDev) {
    console.warn(
      '[Config] Expo Tunnel mode detected. The API must be reachable over the internet or via public tunnel; local LAN IPs may not resolve.',
    );
  }
}

if (isMissingExplicitApiUrlOnDevice) {
  const isDev = typeof __DEV__ !== 'undefined' ? Boolean(__DEV__) : process.env.NODE_ENV !== 'production';
  if (isDev) {
    console.warn(
      '[Config] Physical device detected without explicit EXPO_PUBLIC_API_URL. Falling back to Metro hostUri:',
      hostFromUri,
    );
  }
}

const apiPort = extra.API_PORT ?? '3001';

function resolveDefaultHost(): string {
  // If we have an actual LAN IP from Metro hostUri, prefer it for physical device connectivity
  if (hostFromUri && hostFromUri !== 'localhost' && hostFromUri !== '127.0.0.1' && !isTunnelMode) {
    return hostFromUri;
  }

  // On Android Emulator only, 10.0.2.2 maps to the host machine's loopback
  if (!isPhysicalDevice && Platform.OS === 'android') {
    return '10.0.2.2';
  }

  // Default fallback for simulator / web / local development
  return 'localhost';
}

export const API_BASE_URL: string =
  process.env.EXPO_PUBLIC_API_URL ??
  extra.API_URL ??
  `http://${resolveDefaultHost()}:${apiPort}`;

export const SUPPORT_PHONE: string =
  process.env.EXPO_PUBLIC_SUPPORT_PHONE ?? '+917701993300';

export const SUPPORT_PHONE_DISPLAY: string =
  process.env.EXPO_PUBLIC_SUPPORT_PHONE_DISPLAY ?? '+91 7701993300';

export const WHATSAPP_NUMBER: string =
  process.env.EXPO_PUBLIC_WHATSAPP_NUMBER ?? '917701993300';
