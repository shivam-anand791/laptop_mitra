import { useEffect, useState, useCallback } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import RootNavigator from './navigation/RootNavigator';
import { QueryProvider } from './providers/QueryProvider';
import { AuthProvider } from './providers/AuthProvider';
import { ToastProvider } from './components/Toast';
import { ErrorBoundary } from './components/ErrorBoundary';
import { OfflineBanner } from './components/OfflineBanner';
import { DevApiBanner } from './components/DevApiBanner';
import ServerUnreachableScreen from './components/ServerUnreachableScreen';
import FirebaseConfigErrorScreen from './components/FirebaseConfigErrorScreen';
import { linking } from './navigation/LinkingConfig';
import { pushSupported, getNotificationsModule } from './utils/capabilities';
import { getMissingFirebaseEnvVars } from './firebase/firebase';
import { API_BASE_URL } from './config';

export default function App() {
  const missingFirebaseVars = getMissingFirebaseEnvVars();
  const [serverReachable, setServerReachable] = useState<boolean | null>(
    process.env.NODE_ENV === 'test' ? true : null,
  );
  const [isProbing, setIsProbing] = useState(false);

  const probeHealth = useCallback(async () => {
    setIsProbing(true);
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 12000);
      const res = await fetch(`${API_BASE_URL}/health`, {
        method: 'GET',
        signal: controller.signal,
      });
      clearTimeout(timer);
      setServerReachable(res.status < 500);
    } catch (err) {
      const isDev = typeof __DEV__ !== 'undefined' ? Boolean(__DEV__) : process.env.NODE_ENV !== 'production';
      if (isDev) {
        console.warn('[App] Health probe failed against', `${API_BASE_URL}/health:`, err);
      }
      setServerReachable(false);
    } finally {
      setIsProbing(false);
    }
  }, []);

  useEffect(() => {
    if (process.env.NODE_ENV !== 'test') {
      void probeHealth();
    }
  }, [probeHealth]);

  useEffect(() => {
    const isDev = typeof __DEV__ !== 'undefined' ? Boolean(__DEV__) : process.env.NODE_ENV !== 'production';
    if (!pushSupported) {
      if (isDev) {
        console.log('[App] Push notifications disabled in this environment (Expo Go or Web).');
      }
      return;
    }

    let responseSub: { remove: () => void } | undefined;
    try {
      const Notifications = getNotificationsModule();
      if (Notifications?.setNotificationHandler) {
        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowBanner: true,
            shouldShowList: true,
            shouldPlaySound: true,
            shouldSetBadge: false,
          }),
        });
      }

      if (Notifications?.addNotificationResponseReceivedListener) {
        responseSub = Notifications.addNotificationResponseReceivedListener((response: any) => {
          if (isDev) {
            console.log('[Notification] Notification clicked:', response?.notification?.request?.content?.data);
          }
        });
      }
    } catch (error) {
      if (isDev) {
        console.warn('[App] Push notification listener setup failed:', error);
      }
    }

    return () => {
      try {
        responseSub?.remove();
      } catch {
        // Safe unmount cleanup
      }
    };
  }, []);

  if (missingFirebaseVars.length > 0) {
    return <FirebaseConfigErrorScreen missingVars={missingFirebaseVars} />;
  }

  if (serverReachable === false) {
    return (
      <ServerUnreachableScreen
        onRetry={probeHealth}
        isRetrying={isProbing}
        onContinueAnyway={() => setServerReachable(true)}
      />
    );
  }

  return (
    <ErrorBoundary>
      <QueryProvider>
        <AuthProvider>
          <ToastProvider>
            <SafeAreaProvider>
              <DevApiBanner />
              <NavigationContainer linking={linking}>
                <RootNavigator />
                <OfflineBanner />
              </NavigationContainer>
            </SafeAreaProvider>
          </ToastProvider>
        </AuthProvider>
      </QueryProvider>
    </ErrorBoundary>
  );
}
