import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import RootNavigator from './navigation/RootNavigator';
import { QueryProvider } from './providers/QueryProvider';
import { AuthProvider } from './providers/AuthProvider';
import { ErrorBoundary } from './components/ErrorBoundary';
import { OfflineBanner } from './components/OfflineBanner';
import { linking } from './navigation/LinkingConfig';

export default function App() {
  return (
    <ErrorBoundary>
      <QueryProvider>
        <AuthProvider>
          <SafeAreaProvider>
            <NavigationContainer linking={linking}>
              <RootNavigator />
              <OfflineBanner />
            </NavigationContainer>
          </SafeAreaProvider>
        </AuthProvider>
      </QueryProvider>
    </ErrorBoundary>
  );
}