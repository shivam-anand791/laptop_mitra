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
  ResetPassword: { token: string; email?: string };
  OTPVerification: { email: string; mode: 'login' | 'register' | 'reset' };
};

export type MainTabParamList = {
  Home: undefined;
  Store: { categoryId?: string; categoryName?: string } | undefined;
  Wishlist: undefined;
  Cart: undefined;
  Account: undefined;
};

export type MainStackParamList = {
  MainTabs: { screen?: keyof MainTabParamList; params?: any } | undefined;
  Auth: undefined;
  Search: undefined;
  ProductDetail: { productId: string };
  Checkout: { initialCoupon?: string } | undefined;
  MyCoupons: undefined;
  OrderHistory: undefined;
  OrderDetail: { orderId: string };
  Profile: undefined;
  MitraDashboard: undefined;
  AddressBook: undefined;
  AddAddress: { addressId?: string };
  ChangePassword: undefined;
  BuybackGuarantee: undefined;
  Terms: undefined;
  Privacy: undefined;
  About: undefined;
  HelpHome: undefined;
  HelpArticleDetail: { slug: string; title?: string };
  GuidedSupportFlow: { orderId?: string; category?: string };
  TicketList: undefined;
  TicketDetail: { ticketId: string; isNew?: boolean };
  ReturnDetail: { returnId: string; isNew?: boolean };
  MyLaptops: undefined;
  ServiceJobsList: undefined;
  ServiceJobDetail: { jobId: string };
  PaymentHistory: undefined;
  NotificationPreferences: undefined;
  ReturnsList: undefined;
};

export type RootNavigationProp = NativeStackNavigationProp<RootStackParamList>;
export type AuthNavigationProp = NativeStackNavigationProp<AuthStackParamList>;
export type MainTabNavigationProp = BottomTabNavigationProp<MainTabParamList>;
export type MainStackNavigationProp = NativeStackNavigationProp<MainStackParamList>;