import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MainStackParamList } from './types';
import MainTabs from './MainTabs';
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
        name="ReturnDetail"
        component={ReturnDetailScreen}
        options={{ headerShown: true, title: 'Return & Inspection Tracker', headerTintColor: '#2563eb' }}
      />
    </Stack.Navigator>
  );
}
