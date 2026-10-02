import { View, Text, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MainTabParamList } from './types';
import HomeScreen from '../screens/main/HomeScreen';
import StoreScreen from '../screens/main/StoreScreen';
import WishlistScreen from '../screens/main/WishlistScreen';
import CartScreen from '../screens/main/CartScreen';
import AccountScreen from '../screens/main/AccountScreen';
import { Ionicons } from '@expo/vector-icons';
import { useCart } from '../hooks/useApi';
import { colors, shadows } from '../theme/tokens';

const Tab = createBottomTabNavigator<MainTabParamList>();

function CartIcon({ focused, color, size }: { focused: boolean; color: string; size: number }) {
  const { data: cart } = useCart();
  const itemCount =
    cart?.itemCount ?? cart?.items?.reduce((sum: number, item: { quantity?: number }) => sum + (item.quantity || 1), 0) ?? 0;

  return (
    <View>
      <Ionicons name={focused ? 'cart' : 'cart-outline'} size={size} color={color} />
      {itemCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{itemCount > 99 ? '99+' : itemCount}</Text>
        </View>
      )}
    </View>
  );
}

export default function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.cardBg,
          borderTopWidth: 1,
          borderTopColor: colors.cardBorder,
          height: Platform.OS === 'ios' ? 86 : 64,
          paddingBottom: Platform.OS === 'ios' ? 24 : 8,
          paddingTop: 8,
          ...shadows.md,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={size} color={color} />
          ),
          tabBarLabel: 'Home',
        }}
      />
      <Tab.Screen
        name="Store"
        component={StoreScreen}
        options={{
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? 'storefront' : 'storefront-outline'} size={size} color={color} />
          ),
          tabBarLabel: 'Store',
        }}
      />
      <Tab.Screen
        name="Wishlist"
        component={WishlistScreen}
        options={{
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? 'heart' : 'heart-outline'} size={size} color={color} />
          ),
          tabBarLabel: 'Wishlist',
        }}
      />
      <Tab.Screen
        name="Cart"
        component={CartScreen}
        options={{
          tabBarIcon: ({ focused, color, size }) => (
            <CartIcon focused={focused} color={color} size={size} />
          ),
          tabBarLabel: 'Cart',
        }}
      />
      <Tab.Screen
        name="Account"
        component={AccountScreen}
        options={{
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={size} color={color} />
          ),
          tabBarLabel: 'Account',
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: colors.danger,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textWhite,
  },
});
