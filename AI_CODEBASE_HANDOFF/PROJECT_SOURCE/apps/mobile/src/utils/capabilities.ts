import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Execution environment detection:
 * - StoreClient: running in standard Expo Go app from App Store / Google Play
 * - Bare / Standalone: running in custom development build (expo-dev-client) or standalone binary
 */
export const isExpoGo: boolean =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

export const isDevBuild: boolean =
  Constants.executionEnvironment === ExecutionEnvironment.Bare ||
  Constants.executionEnvironment === ExecutionEnvironment.Standalone;

/**
 * Push notifications (remote FCM) functionality provided by expo-notifications was removed
 * from Expo Go on Android starting with Expo SDK 53.
 * Web also does not support Expo push tokens via native service.
 */
export const pushSupported: boolean = !isExpoGo && Platform.OS !== 'web';

/**
 * Native payment gateways (such as react-native-razorpay) contain custom native Android/iOS code
 * and cannot be loaded within Expo Go or Web runtimes.
 */
export const nativePaymentsSupported: boolean = !isExpoGo && Platform.OS !== 'web';

export type NotificationsModule = typeof import('expo-notifications');

/**
 * Safely accesses the expo-notifications module only when the environment supports it.
 * In Expo Go on Android, requiring or importing 'expo-notifications' triggers
 * DevicePushTokenAutoRegistration.fx at module load, which throws a fatal startup Error.
 */
export function getNotificationsModule(): NotificationsModule | null {
  if (!pushSupported) {
    return null;
  }
  try {
    // Dynamic require so bundlers do not evaluate side-effects in Expo Go
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-notifications') as NotificationsModule;
  } catch (error) {
    const isDev = typeof __DEV__ !== 'undefined' ? Boolean(__DEV__) : process.env.NODE_ENV !== 'production';
    if (isDev) {
      console.warn('[Capabilities] Unable to load expo-notifications:', error);
    }
    return null;
  }
}
