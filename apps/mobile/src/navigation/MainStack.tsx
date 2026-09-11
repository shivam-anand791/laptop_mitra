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
    </Stack.Navigator>
  );
}
