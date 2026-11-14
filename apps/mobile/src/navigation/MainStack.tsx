import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MainStackParamList } from './types';
import MainTabs from './MainTabs';
import AuthStack from './AuthStack';
import ProductDetailScreen from '../screens/main/ProductDetailScreen';
import SearchScreen from '../screens/main/SearchScreen';
import CheckoutScreen from '../screens/main/CheckoutScreen';
import OrderHistoryScreen from '../screens/main/OrderHistoryScreen';
import OrderDetailScreen from '../screens/main/OrderDetailScreen';
import ProfileScreen from '../screens/main/ProfileScreen';
import MitraDashboardScreen from '../screens/main/MitraDashboardScreen';
import AddressBookScreen from '../screens/main/AddressBookScreen';
import AddAddressScreen from '../screens/main/AddAddressScreen';
import ChangePasswordScreen from '../screens/main/ChangePasswordScreen';
import BuybackGuaranteeScreen from '../screens/main/BuybackGuaranteeScreen';
import TermsScreen from '../screens/main/TermsScreen';
import PrivacyScreen from '../screens/main/PrivacyScreen';
import AboutScreen from '../screens/main/AboutScreen';
import HelpHomeScreen from '../screens/main/HelpHomeScreen';
import HelpArticleDetailScreen from '../screens/main/HelpArticleDetailScreen';
import GuidedSupportFlowScreen from '../screens/main/GuidedSupportFlowScreen';
import TicketListScreen from '../screens/main/TicketListScreen';
import TicketDetailScreen from '../screens/main/TicketDetailScreen';
import ReturnDetailScreen from '../screens/main/ReturnDetailScreen';
import MyCouponsScreen from '../screens/main/MyCouponsScreen';
import MyLaptopsScreen from '../screens/main/MyLaptopsScreen';
import ServiceJobDetailScreen from '../screens/main/ServiceJobDetailScreen';
import PaymentHistoryScreen from '../screens/main/PaymentHistoryScreen';
import NotificationPreferencesScreen from '../screens/main/NotificationPreferencesScreen';
import ReturnsListScreen from '../screens/main/ReturnsListScreen';
import ServiceJobsListScreen from '../screens/main/ServiceJobsListScreen';

const Stack = createNativeStackNavigator<MainStackParamList>();

export default function MainStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen
        name="Auth"
        component={AuthStack}
        options={{ headerShown: false, presentation: 'modal' }}
      />
      <Stack.Screen
        name="Search"
        component={SearchScreen}
        options={{ headerShown: true, title: 'Search', headerTintColor: '#2563eb' }}
      />
      <Stack.Screen
        name="ProductDetail"
        component={ProductDetailScreen}
        options={{ headerShown: true, title: 'Product', headerTintColor: '#2563eb' }}
      />
      <Stack.Screen
        name="Checkout"
        component={CheckoutScreen}
        options={{ headerShown: true, title: 'Checkout', headerTintColor: '#2563eb' }}
      />
      <Stack.Screen
        name="OrderHistory"
        component={OrderHistoryScreen}
        options={{ headerShown: true, title: 'Orders', headerTintColor: '#2563eb' }}
      />
      <Stack.Screen
        name="OrderDetail"
        component={OrderDetailScreen}
        options={{ headerShown: true, title: 'Order Details', headerTintColor: '#2563eb' }}
      />
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ headerShown: true, title: 'Edit Profile', headerTintColor: '#2563eb' }}
      />
      <Stack.Screen
        name="MitraDashboard"
        component={MitraDashboardScreen}
        options={{ headerShown: true, title: 'Mitra Affiliate', headerTintColor: '#2563eb' }}
      />
      <Stack.Screen
        name="AddressBook"
        component={AddressBookScreen}
        options={{ headerShown: true, title: 'Address Book', headerTintColor: '#2563eb' }}
      />
      <Stack.Screen
        name="AddAddress"
        component={AddAddressScreen}
        options={({ route }) => ({
          headerShown: true,
          title: route.params?.addressId ? 'Edit Address' : 'Add Address',
          headerTintColor: '#2563eb',
        })}
      />
      <Stack.Screen
        name="ChangePassword"
        component={ChangePasswordScreen}
        options={{ headerShown: true, title: 'Change Password', headerTintColor: '#2563eb' }}
      />
      <Stack.Screen
        name="BuybackGuarantee"
        component={BuybackGuaranteeScreen}
        options={{ headerShown: true, title: 'Buyback Guarantee', headerTintColor: '#2563eb' }}
      />
      <Stack.Screen
        name="Terms"
        component={TermsScreen}
        options={{ headerShown: true, title: 'Terms & Conditions', headerTintColor: '#2563eb' }}
      />
      <Stack.Screen
        name="Privacy"
        component={PrivacyScreen}
        options={{ headerShown: true, title: 'Privacy Policy', headerTintColor: '#2563eb' }}
      />
      <Stack.Screen
        name="About"
        component={AboutScreen}
        options={{ headerShown: true, title: 'About Us', headerTintColor: '#2563eb' }}
      />
      <Stack.Screen
        name="HelpHome"
        component={HelpHomeScreen}
        options={{ headerShown: true, title: 'Help & Customer Support', headerTintColor: '#2563eb' }}
      />
      <Stack.Screen
        name="HelpArticleDetail"
        component={HelpArticleDetailScreen}
        options={({ route }) => ({
          headerShown: true,
          title: route.params?.title || 'Support Article',
          headerTintColor: '#2563eb',
        })}
      />
      <Stack.Screen
        name="GuidedSupportFlow"
        component={GuidedSupportFlowScreen}
        options={{ headerShown: true, title: 'Guided Resolution', headerTintColor: '#2563eb' }}
      />
      <Stack.Screen
        name="TicketList"
        component={TicketListScreen}
        options={{ headerShown: true, title: 'My Support Tickets', headerTintColor: '#2563eb' }}
      />
      <Stack.Screen
        name="TicketDetail"
        component={TicketDetailScreen}
        options={{
          headerShown: true,
          title: 'Ticket Details',
          headerTintColor: '#2563eb',
        }}
      />
      <Stack.Screen
        name="MyCoupons"
        component={MyCouponsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ReturnDetail"
        component={ReturnDetailScreen}
        options={{ headerShown: true, title: 'Return & Inspection Tracker', headerTintColor: '#2563eb' }}
      />
      <Stack.Screen
        name="MyLaptops"
        component={MyLaptopsScreen}
        options={{ headerShown: true, title: 'My Laptops & Service', headerTintColor: '#2563eb' }}
      />
      <Stack.Screen
        name="ServiceJobDetail"
        component={ServiceJobDetailScreen}
        options={{ headerShown: true, title: 'Service Tracking', headerTintColor: '#2563eb' }}
      />
      <Stack.Screen
        name="PaymentHistory"
        component={PaymentHistoryScreen}
        options={{ headerShown: true, title: 'Payment History', headerTintColor: '#2563eb' }}
      />
      <Stack.Screen
        name="NotificationPreferences"
        component={NotificationPreferencesScreen}
        options={{ headerShown: true, title: 'Notification Settings', headerTintColor: '#2563eb' }}
      />
      <Stack.Screen
        name="ReturnsList"
        component={ReturnsListScreen}
        options={{ headerShown: true, title: 'My Returns & Refunds', headerTintColor: '#2563eb' }}
      />
      <Stack.Screen
        name="ServiceJobsList"
        component={ServiceJobsListScreen}
        options={{ headerShown: true, title: 'Service Bookings', headerTintColor: '#2563eb' }}
      />
    </Stack.Navigator>
  );
}
