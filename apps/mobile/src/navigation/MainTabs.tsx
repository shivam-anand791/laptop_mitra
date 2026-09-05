import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MainTabParamList } from './types';
import HomeScreen from '../screens/main/HomeScreen';
import StoreScreen from '../screens/main/StoreScreen';
import WishlistScreen from '../screens/main/WishlistScreen';
import CartScreen from '../screens/main/CartScreen';
import AccountScreen from '../screens/main/AccountScreen';
import { Ionicons } from '@expo/vector-icons';

const Tab = createBottomTabNavigator<MainTabParamList>();

export default function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route: _route }) => ({
        tabBarActiveTintColor: '#2563eb',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#e5e7eb',
          height: 64,
          paddingBottom: 8,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarIconStyle: { marginBottom: 2 },
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={24} color={focused ? '#2563eb' : '#9ca3af'} />
          ),
          tabBarLabel: 'Home',
        }}
      />
      <Tab.Screen
        name="Store"
        component={StoreScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <Ionicons name={focused ? 'storefront' : 'storefront-outline'} size={24} color={focused ? '#2563eb' : '#9ca3af'} />
          ),
          tabBarLabel: 'Store',
        }}
      />
      <Tab.Screen
        name="Wishlist"
        component={WishlistScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <Ionicons name={focused ? 'heart' : 'heart-outline'} size={24} color={focused ? '#2563eb' : '#9ca3af'} />
          ),
          tabBarLabel: 'Wishlist',
        }}
      />
      <Tab.Screen
        name="Cart"
        component={CartScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <Ionicons name={focused ? 'cart' : 'cart-outline'} size={24} color={focused ? '#2563eb' : '#9ca3af'} />
          ),
          tabBarLabel: 'Cart',
        }}
      />
      <Tab.Screen
        name="Account"
        component={AccountScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={24} color={focused ? '#2563eb' : '#9ca3af'} />
          ),
          tabBarLabel: 'Account',
        }}
      />
    </Tab.Navigator>
  );
}