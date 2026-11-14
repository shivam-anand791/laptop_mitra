/* eslint-disable @typescript-eslint/no-require-imports */
describe('Capabilities and Safe Runtime Helpers', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('correctly identifies Expo Go environment and disables native push and payments', () => {
    jest.doMock('expo-constants', () => ({
      __esModule: true,
      default: {
        executionEnvironment: 'storeClient',
        expoConfig: { extra: { eas: { projectId: 'test-project' } } },
      },
      ExecutionEnvironment: {
        StoreClient: 'storeClient',
        Standalone: 'standalone',
        Bare: 'bare',
      },
    }));

    jest.doMock('react-native', () => ({
      Platform: { OS: 'android' },
    }));

    const capabilities = require('../utils/capabilities');
    expect(capabilities.isExpoGo).toBe(true);
    expect(capabilities.isDevBuild).toBe(false);
    expect(capabilities.pushSupported).toBe(false);
    expect(capabilities.nativePaymentsSupported).toBe(false);

    // Module access must return null without attempting require('expo-notifications')
    expect(capabilities.getNotificationsModule()).toBeNull();
  });

  it('identifies development client build and enables native push and payments on Android', () => {
    jest.doMock('expo-constants', () => ({
      __esModule: true,
      default: {
        executionEnvironment: 'bare',
        expoConfig: { extra: { eas: { projectId: 'test-project' } } },
      },
      ExecutionEnvironment: {
        StoreClient: 'storeClient',
        Standalone: 'standalone',
        Bare: 'bare',
      },
    }));

    jest.doMock('react-native', () => ({
      Platform: { OS: 'android' },
    }));

    const mockNotifications = {
      setNotificationHandler: jest.fn(),
      getPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
      getExpoPushTokenAsync: jest.fn().mockResolvedValue({ data: 'ExponentPushToken[mock]' }),
    };

    jest.doMock('expo-notifications', () => mockNotifications, { virtual: true });

    const capabilities = require('../utils/capabilities');
    expect(capabilities.isExpoGo).toBe(false);
    expect(capabilities.isDevBuild).toBe(true);
    expect(capabilities.pushSupported).toBe(true);
    expect(capabilities.nativePaymentsSupported).toBe(true);

    const mod = capabilities.getNotificationsModule();
    expect(mod).toBe(mockNotifications);
  });

  it('identifies production standalone build and enables native push on iOS', () => {
    jest.doMock('expo-constants', () => ({
      __esModule: true,
      default: {
        executionEnvironment: 'standalone',
        expoConfig: { extra: { eas: { projectId: 'test-project' } } },
      },
      ExecutionEnvironment: {
        StoreClient: 'storeClient',
        Standalone: 'standalone',
        Bare: 'bare',
      },
    }));

    jest.doMock('react-native', () => ({
      Platform: { OS: 'ios' },
    }));

    const capabilities = require('../utils/capabilities');
    expect(capabilities.isExpoGo).toBe(false);
    expect(capabilities.isDevBuild).toBe(true);
    expect(capabilities.pushSupported).toBe(true);
    expect(capabilities.nativePaymentsSupported).toBe(true);
  });

  it('disables native push and payments when running on Web even in standalone', () => {
    jest.doMock('expo-constants', () => ({
      __esModule: true,
      default: {
        executionEnvironment: 'standalone',
      },
      ExecutionEnvironment: {
        StoreClient: 'storeClient',
        Standalone: 'standalone',
        Bare: 'bare',
      },
    }));

    jest.doMock('react-native', () => ({
      Platform: { OS: 'web' },
    }));

    const capabilities = require('../utils/capabilities');
    expect(capabilities.pushSupported).toBe(false);
    expect(capabilities.nativePaymentsSupported).toBe(false);
    expect(capabilities.getNotificationsModule()).toBeNull();
  });

  it('survives throwing require without crashing and returns null', () => {
    jest.doMock('expo-constants', () => ({
      __esModule: true,
      default: {
        executionEnvironment: 'bare',
      },
      ExecutionEnvironment: {
        StoreClient: 'storeClient',
        Standalone: 'standalone',
        Bare: 'bare',
      },
    }));

    jest.doMock('react-native', () => ({
      Platform: { OS: 'android' },
    }));

    // Mock expo-notifications throwing an error when required
    jest.doMock('expo-notifications', () => {
      throw new Error('Native notification module unavailable');
    }, { virtual: true });

    const capabilities = require('../utils/capabilities');
    expect(capabilities.pushSupported).toBe(true);
    expect(() => capabilities.getNotificationsModule()).not.toThrow();
    expect(capabilities.getNotificationsModule()).toBeNull();
  });
});

describe('App Boot and Notification Setup in Expo Go', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('loads App component cleanly without throwing in Expo Go environment', () => {
    jest.doMock('expo-constants', () => ({
      __esModule: true,
      default: {
        executionEnvironment: 'storeClient',
      },
      ExecutionEnvironment: {
        StoreClient: 'storeClient',
        Standalone: 'standalone',
        Bare: 'bare',
      },
    }));

    jest.doMock('react-native', () => ({
      Platform: { OS: 'android' },
      StyleSheet: { create: (s: any) => s },
      View: 'View',
      Text: 'Text',
      TouchableOpacity: 'TouchableOpacity',
      ScrollView: 'ScrollView',
    }));

    jest.doMock('@react-navigation/native', () => ({
      NavigationContainer: ({ children }: any) => children,
    }));
    jest.doMock('react-native-safe-area-context', () => ({
      SafeAreaProvider: ({ children }: any) => children,
    }));
    jest.doMock('../navigation/RootNavigator', () => () => null);
    jest.doMock('../providers/QueryProvider', () => ({
      QueryProvider: ({ children }: any) => children,
    }));
    jest.doMock('../providers/AuthProvider', () => ({
      AuthProvider: ({ children }: any) => children,
    }));
    jest.doMock('../components/Toast', () => ({
      ToastProvider: ({ children }: any) => children,
    }));
    jest.doMock('../components/ErrorBoundary', () => ({
      ErrorBoundary: ({ children }: any) => children,
    }));
    jest.doMock('../components/OfflineBanner', () => ({
      OfflineBanner: () => null,
    }));
    jest.doMock('../navigation/LinkingConfig', () => ({
      linking: {},
    }));

    // Simulating expo-notifications failing if required directly in Expo Go
    jest.doMock('expo-notifications', () => {
      throw new Error('expo-notifications: Android Push notifications were removed from Expo Go');
    }, { virtual: true });

    // App should load without throwing
    expect(() => {
      require('../App');
    }).not.toThrow();
  });
});

describe('Notification Registration Flow in Different Environments', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  async function simulatePushRegistration(
    capabilities: { pushSupported: boolean; getNotificationsModule: () => any },
    apiClient: { registerDeviceToken: jest.Mock },
    projectId = 'test-project',
  ) {
    if (!capabilities.pushSupported) {
      return { skipped: true, reason: 'unsupported_runtime' };
    }

    const Notifications = capabilities.getNotificationsModule();
    if (!Notifications) {
      return { skipped: true, reason: 'module_not_found' };
    }

    try {
      const currentPermission = await Notifications.getPermissionsAsync();
      const permission = currentPermission.granted
        ? currentPermission
        : await Notifications.requestPermissionsAsync();
      if (!permission.granted) return { skipped: true, reason: 'permission_denied' };

      const { data: token } = await Notifications.getExpoPushTokenAsync(
        projectId ? { projectId } : undefined,
      );
      if (token) {
        await apiClient.registerDeviceToken(token, 'android');
        return { registered: true, token };
      }
      return { skipped: true, reason: 'no_token' };
    } catch (err: any) {
      return { error: err.message, survived: true };
    }
  }

  it('no-ops safely in Expo Go without attempting permission or token calls', async () => {
    const mockApiClient = { registerDeviceToken: jest.fn() };
    const mockNotifications = {
      getPermissionsAsync: jest.fn(),
      requestPermissionsAsync: jest.fn(),
      getExpoPushTokenAsync: jest.fn(),
    };

    const capabilities = {
      pushSupported: false,
      getNotificationsModule: () => mockNotifications,
    };

    const result = await simulatePushRegistration(capabilities, mockApiClient);
    expect(result.skipped).toBe(true);
    expect(result.reason).toBe('unsupported_runtime');
    expect(mockNotifications.getPermissionsAsync).not.toHaveBeenCalled();
    expect(mockApiClient.registerDeviceToken).not.toHaveBeenCalled();
  });

  it('requests permissions and registers push token in development build', async () => {
    const mockApiClient = { registerDeviceToken: jest.fn().mockResolvedValue({ message: 'OK' }) };
    const mockNotifications = {
      getPermissionsAsync: jest.fn().mockResolvedValue({ granted: false }),
      requestPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
      getExpoPushTokenAsync: jest.fn().mockResolvedValue({ data: 'ExponentPushToken[device-123]' }),
    };

    const capabilities = {
      pushSupported: true,
      getNotificationsModule: () => mockNotifications,
    };

    const result = await simulatePushRegistration(capabilities, mockApiClient);
    expect(result.registered).toBe(true);
    expect(result.token).toBe('ExponentPushToken[device-123]');
    expect(mockNotifications.requestPermissionsAsync).toHaveBeenCalled();
    expect(mockApiClient.registerDeviceToken).toHaveBeenCalledWith(
      'ExponentPushToken[device-123]',
      'android',
    );
  });

  it('survives throwing notification token retrieval without crashing', async () => {
    const mockApiClient = { registerDeviceToken: jest.fn() };
    const mockNotifications = {
      getPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
      getExpoPushTokenAsync: jest.fn().mockRejectedValue(new Error('FCM service unavailable')),
    };

    const capabilities = {
      pushSupported: true,
      getNotificationsModule: () => mockNotifications,
    };

    const result = await simulatePushRegistration(capabilities, mockApiClient);
    expect(result.survived).toBe(true);
    expect(result.error).toBe('FCM service unavailable');
    expect(mockApiClient.registerDeviceToken).not.toHaveBeenCalled();
  });
});
