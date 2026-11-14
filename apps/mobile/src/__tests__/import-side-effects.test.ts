/* eslint-disable @typescript-eslint/no-require-imports */
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';

jest.mock('react-native', () => ({
  Platform: { OS: 'android', select: (objs: any) => objs.android || objs.default },
  StyleSheet: { create: (styles: any) => styles },
  View: 'View',
  Text: 'Text',
  TouchableOpacity: 'TouchableOpacity',
  ScrollView: 'ScrollView',
  Dimensions: { get: () => ({ width: 375, height: 812 }) },
  Alert: { alert: jest.fn() },
  ActivityIndicator: 'ActivityIndicator',
  TextInput: 'TextInput',
  RefreshControl: 'RefreshControl',
  Linking: { openURL: jest.fn() },
  AppState: { addEventListener: jest.fn(() => ({ remove: jest.fn() })) },
}));

jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(() => jest.fn()),
  fetch: jest.fn().mockResolvedValue({ isConnected: true, isInternetReachable: true }),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
  useRoute: () => ({ params: { productId: 'test-123' } }),
  NavigationContainer: ({ children }: any) => children,
}));

jest.mock('@react-navigation/bottom-tabs', () => ({
  createBottomTabNavigator: () => ({
    Navigator: ({ children }: any) => children,
    Screen: () => null,
  }),
}));

jest.mock('@react-navigation/native-stack', () => ({
  createNativeStackNavigator: () => ({
    Navigator: ({ children }: any) => children,
    Screen: () => null,
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  SafeAreaProvider: ({ children }: any) => children,
}));

jest.mock('expo-image', () => ({
  Image: 'Image',
}));

describe('Module Import Side-Effects & Expo Go Safety', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('imports core utilities, navigation, screens, and modals without triggering native listeners at module scope', () => {
    expect(() => {
      require('../utils/capabilities');
      require('../config');
      require('../firebase/firebase');
      require('../firebase/securePersistence');
      require('../components/ErrorBoundary');
      require('../components/DataErrorView');
      require('../components/ServerUnreachableScreen');
      require('../components/RazorpayCheckoutModal');
      require('../screens/main/HomeScreen');
      require('../screens/main/StoreScreen');
      require('../screens/main/ProductDetailScreen');
      require('../screens/main/CartScreen');
      require('../screens/main/CheckoutScreen');
      require('../screens/main/OrderDetailScreen');
      require('../screens/main/NotificationPreferencesScreen');
      require('../navigation/MainTabs');
      require('../navigation/RootNavigator');
      require('../App');
    }).not.toThrow();

    // Verify zero native listener registrations at module load time
    expect(Notifications.addPushTokenListener).not.toHaveBeenCalled();
    expect(Notifications.getExpoPushTokenAsync).not.toHaveBeenCalled();
    expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();

    // Verify SecureStore was not read synchronously during module evaluation
    expect(SecureStore.getItemAsync).not.toHaveBeenCalled();
  });
});
