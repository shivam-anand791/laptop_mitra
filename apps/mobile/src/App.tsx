import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import RootNavigator from './navigation/RootNavigator';
import { QueryProvider } from './providers/QueryProvider';
import { AuthProvider } from './providers/AuthProvider';
import { ToastProvider } from './components/Toast';
import { ErrorBoundary } from './components/ErrorBoundary';
import { OfflineBanner } from './components/OfflineBanner';
import { linking } from './navigation/LinkingConfig';
import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function App() {
  return (
    <ErrorBoundary>
      <QueryProvider>
        <AuthProvider>
          <ToastProvider>
            <SafeAreaProvider>
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