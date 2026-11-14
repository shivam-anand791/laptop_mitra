import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useNotificationPreferences, useUpdateNotificationPreferences } from '../../hooks/useApi';
import { useAuth } from '../../providers/AuthProvider';
import { NotificationPreferences } from '@laptopmitra/types';
import { MainStackNavigationProp } from '../../navigation/types';
import { colors, radius, spacing, shadows } from '../../theme/tokens';
import { isExpoGo } from '../../utils/capabilities';

export default function NotificationPreferencesScreen() {
  const navigation = useNavigation<MainStackNavigationProp>();
  const { isAuthenticated, isGuest } = useAuth();
  const { data: serverPrefs, isLoading, refetch } = useNotificationPreferences();
  const updateMutation = useUpdateNotificationPreferences();

  const [preferences, setPreferences] = useState<NotificationPreferences>({
    emailOrderUpdates: true,
    emailPromotions: false,
    smsOrderUpdates: true,
    smsDeliveryTracking: true,
    pushNewArrivals: false,
    pushPriceDrops: true,
  });

  useEffect(() => {
    if (serverPrefs) {
      setPreferences((prev) => ({
        ...prev,
        ...serverPrefs,
      }));
    }
  }, [serverPrefs]);

  const handleToggle = (key: keyof NotificationPreferences) => {
    setPreferences((prev) => {
      const next = {
        ...prev,
        [key]: !prev[key],
      };
      updateMutation.mutate(next, {
        onError: (err: any) => {
          Alert.alert('Update Failed', err?.message || 'Could not update preference. Reverting.');
          refetch();
        },
      });
      return next;
    });
  };

  if (!isAuthenticated || isGuest) {
    return (
      <View style={styles.centered}>
        <Ionicons name="notifications-off-outline" size={56} color="#94a3b8" />
        <Text style={styles.emptyTitle}>Sign in for notifications</Text>
        <Text style={styles.emptySubtitle}>Log in to manage your order, deal, and SMS alerts.</Text>
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => navigation.navigate('Auth' as any)}
          activeOpacity={0.8}
        >
          <Text style={styles.primaryBtnText}>Log In / Register</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading preferences...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Informational Header */}
      <View style={styles.banner}>
        <Ionicons name="notifications-outline" size={24} color={colors.primary} />
        <View style={{ flex: 1 }}>
          <Text style={styles.bannerTitle}>Notification Channels</Text>
          <Text style={styles.bannerSubtitle}>
            Choose how you receive dispatch alerts, price drops, and special affiliate deals.
          </Text>
        </View>
      </View>

      {isExpoGo && (
        <View style={styles.expoGoBanner}>
          <Ionicons name="information-circle-outline" size={20} color="#0284c7" />
          <Text style={styles.expoGoBannerText}>
            Push notifications and in-app payments need the full app build.
          </Text>
        </View>
      )}

      {/* Group: Order & Delivery Updates */}
      <View style={styles.groupCard}>
        <View style={styles.groupHeader}>
          <Ionicons name="cube-outline" size={18} color="#0f172a" />
          <Text style={styles.groupTitle}>Orders &amp; Shipments</Text>
        </View>

        <View style={styles.row}>
          <View style={styles.rowInfo}>
            <Text style={styles.rowTitle}>Email Order Updates</Text>
            <Text style={styles.rowSubtitle}>Order confirmations and digital invoice receipts</Text>
          </View>
          <Switch
            value={preferences.emailOrderUpdates}
            onValueChange={() => handleToggle('emailOrderUpdates')}
            trackColor={{ false: '#e2e8f0', true: '#93c5fd' }}
            thumbColor={preferences.emailOrderUpdates ? colors.primary : '#f8fafc'}
          />
        </View>

        <View style={styles.divider} />

        <View style={styles.row}>
          <View style={styles.rowInfo}>
            <Text style={styles.rowTitle}>SMS Order Alerts</Text>
            <Text style={styles.rowSubtitle}>Critical OTP and delivery verification PINs</Text>
          </View>
          <Switch
            value={preferences.smsOrderUpdates}
            onValueChange={() => handleToggle('smsOrderUpdates')}
            trackColor={{ false: '#e2e8f0', true: '#93c5fd' }}
            thumbColor={preferences.smsOrderUpdates ? colors.primary : '#f8fafc'}
          />
        </View>

        <View style={styles.divider} />

        <View style={styles.row}>
          <View style={styles.rowInfo}>
            <Text style={styles.rowTitle}>SMS Delivery Tracking</Text>
            <Text style={styles.rowSubtitle}>Live courier out-for-delivery milestone SMS</Text>
          </View>
          <Switch
            value={preferences.smsDeliveryTracking}
            onValueChange={() => handleToggle('smsDeliveryTracking')}
            trackColor={{ false: '#e2e8f0', true: '#93c5fd' }}
            thumbColor={preferences.smsDeliveryTracking ? colors.primary : '#f8fafc'}
          />
        </View>
      </View>

      {/* Group: Alerts & Restocks */}
      <View style={styles.groupCard}>
        <View style={styles.groupHeader}>
          <Ionicons name="pricetag-outline" size={18} color="#0f172a" />
          <Text style={styles.groupTitle}>Wishlist &amp; Catalog Alerts</Text>
        </View>

        <View style={styles.row}>
          <View style={styles.rowInfo}>
            <Text style={styles.rowTitle}>Price Drop Alerts</Text>
            <Text style={styles.rowSubtitle}>
              {isExpoGo ? 'Push alerts require full app build (disabled in Expo Go)' : 'Push notification when a saved laptop gets discounted'}
            </Text>
          </View>
          <Switch
            disabled={isExpoGo}
            value={isExpoGo ? false : preferences.pushPriceDrops}
            onValueChange={() => handleToggle('pushPriceDrops')}
            trackColor={{ false: '#e2e8f0', true: '#93c5fd' }}
            thumbColor={!isExpoGo && preferences.pushPriceDrops ? colors.primary : '#f8fafc'}
          />
        </View>

        <View style={styles.divider} />

        <View style={styles.row}>
          <View style={styles.rowInfo}>
            <Text style={styles.rowTitle}>New Arrivals in Segment</Text>
            <Text style={styles.rowSubtitle}>
              {isExpoGo ? 'Push alerts require full app build (disabled in Expo Go)' : 'Push notification when enterprise laptops arrive in stock'}
            </Text>
          </View>
          <Switch
            disabled={isExpoGo}
            value={isExpoGo ? false : preferences.pushNewArrivals}
            onValueChange={() => handleToggle('pushNewArrivals')}
            trackColor={{ false: '#e2e8f0', true: '#93c5fd' }}
            thumbColor={!isExpoGo && preferences.pushNewArrivals ? colors.primary : '#f8fafc'}
          />
        </View>

        <View style={styles.divider} />

        <View style={styles.row}>
          <View style={styles.rowInfo}>
            <Text style={styles.rowTitle}>Email Promotional Deals</Text>
            <Text style={styles.rowSubtitle}>Occasional festive discount vouchers and Mitra bonuses</Text>
          </View>
          <Switch
            value={preferences.emailPromotions}
            onValueChange={() => handleToggle('emailPromotions')}
            trackColor={{ false: '#e2e8f0', true: '#93c5fd' }}
            thumbColor={preferences.emailPromotions ? colors.primary : '#f8fafc'}
          />
        </View>
      </View>

      <Text style={styles.footerNote}>
        Transactional SMS and critical account security alerts will always be sent regardless of preferences.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: 40,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: '#eff6ff',
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e3a8a',
  },
  bannerSubtitle: {
    fontSize: 12,
    color: '#3b82f6',
    marginTop: 2,
    lineHeight: 16,
  },
  groupCard: {
    backgroundColor: '#ffffff',
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    ...shadows.sm,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: spacing.sm,
  },
  groupTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs + 2,
  },
  rowInfo: {
    flex: 1,
    paddingRight: spacing.md,
  },
  rowTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e293b',
  },
  rowSubtitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 4,
  },
  footerNote: {
    fontSize: 11,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.lg,
    lineHeight: 16,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    marginTop: spacing.sm,
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginTop: spacing.md,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 240,
  },
  primaryBtn: {
    marginTop: spacing.lg,
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: radius.md,
  },
  primaryBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  expoGoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#bae6fd',
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  expoGoBannerText: {
    flex: 1,
    fontSize: 12,
    color: '#0369a1',
    fontWeight: '500',
    lineHeight: 17,
  },
});
