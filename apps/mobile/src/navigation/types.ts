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
  Search: undefined;
  ProductDetail: { productId: string };
  Checkout: undefined;
  OrderHistory: undefined;
  OrderDetail: { orderId: string };
  Profile: undefined;
  MitraDashboard: undefined;
  AddressBook: undefined;
  AddAddress: { addressId?: string };
  ChangePassword: undefined;
};

export type RootNavigationProp = NativeStackNavigationProp<RootStackParamList>;
export type AuthNavigationProp = NativeStackNavigationProp<AuthStackParamList>;
export type MainTabNavigationProp = BottomTabNavigationProp<MainTabParamList>;
export type MainStackNavigationProp = NativeStackNavigationProp<MainStackParamList>;