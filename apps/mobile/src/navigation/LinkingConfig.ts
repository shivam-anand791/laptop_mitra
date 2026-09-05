import { LinkingOptions } from '@react-navigation/native';
import { RootStackParamList } from './types';

export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['laptopmitra://', 'https://app.laptopmitra.com'],
  config: {
    screens: {
      Auth: {
        screens: {
          Login: 'login',
          Register: 'register',
          ForgotPassword: 'forgot-password',
          OTPVerification: 'otp-verification',
        },
      },
      Main: {
        screens: {
          MainTabs: {
            screens: {
              Home: 'home',
              Store: 'store',
              Wishlist: 'wishlist',
              Cart: 'cart',
              Account: 'account',
            },
          },
          ProductDetail: 'product/:productId',
          OrderDetail: 'order/:orderId',
          OrderConfirmation: 'order-confirmation/:orderId',
          Checkout: 'checkout',
          Profile: 'profile',
          Settings: 'settings',
          ReferralDashboard: 'referral',
          EarningsHistory: 'earnings',
        },
      },
    },
  },
};