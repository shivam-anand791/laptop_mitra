import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  ResetPassword: { token: string };
  OTPVerification: { email: string; mode: 'login' | 'register' | 'reset' };
};

export type MainTabParamList = {
  Home: undefined;
  Store: undefined;
  Wishlist: undefined;
  Cart: undefined;
  Account: undefined;
};

export type MainStackParamList = {
  MainTabs: undefined;
  ProductDetail: { productId: string };
  CartDetail: undefined;
  WishlistDetail: undefined;
  Checkout: undefined;
  OrderConfirmation: { orderId: string };
  OrderHistory: undefined;
  OrderDetail: { orderId: string };
  Profile: undefined;
  AddressBook: undefined;
  AddAddress: { addressId?: string };
  ReferralDashboard: undefined;
  EarningsHistory: undefined;
  Settings: undefined;
};

export type RootNavigationProp = NativeStackNavigationProp<RootStackParamList>;
export type AuthNavigationProp = NativeStackNavigationProp<AuthStackParamList>;
export type MainTabNavigationProp = BottomTabNavigationProp<MainTabParamList>;
export type MainStackNavigationProp = NativeStackNavigationProp<MainStackParamList>;