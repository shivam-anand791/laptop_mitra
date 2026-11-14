import { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useUserServiceJobs } from '../../hooks/useApi';
import { useAuth } from '../../providers/AuthProvider';
import { MainStackNavigationProp } from '../../navigation/types';
import { colors, radius, spacing, shadows } from '../../theme/tokens';

const formatDate = (dateStr?: string | null) => {
  if (!dateStr) return 'Pending schedule';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

function getServiceJobBadge(status?: string | null) {
  const s = (status || '').toUpperCase();
  if (s === 'COMPLETED') {
    return {
      label: 'Completed',
      bg: '#f0fdf4',
      text: '#16a34a',
      icon: 'checkmark-circle' as const,
    };
  }
  if (s === 'CANCELLED') {
    return {
      label: 'Cancelled',
      bg: '#fef2f2',
      text: '#dc2626',
      icon: 'close-circle' as const,
    };
  }
  if (s === 'IN_PROGRESS' || s === 'TECHNICIAN_ASSIGNED') {
    return {
      label: s === 'IN_PROGRESS' ? 'In Progress' : 'Tech Assigned',
      bg: '#fef3c7',
      text: '#d97706',
      icon: 'construct' as const,
    };
  }
  return {
    label: 'Booked',
    bg: '#eff6ff',
    text: '#2563eb',
    icon: 'calendar-outline' as const,
  };
}

export default function ServiceJobsListScreen() {
  const navigation = useNavigation<MainStackNavigationProp>();
  const { isAuthenticated, isGuest } = useAuth();
  const { data: jobs = [], isLoading, refetch, isRefetching } = useUserServiceJobs();

  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch]),
  );

  if (!isAuthenticated || isGuest) {
    return (
      <View style={styles.centered}>
        <Ionicons name="construct-outline" size={56} color="#94a3b8" />
        <Text style={styles.emptyTitle}>Sign in to view service bookings</Text>
        <Text style={styles.emptySubtitle}>Log in to schedule and track doorstep maintenance for your laptops.</Text>
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

  const jobList = Array.isArray(jobs) ? jobs : [];

  const renderJobItem = ({ item }: { item: any }) => {
    const badge = getServiceJobBadge(item.status);
    const laptopTitle =
      item.soldUnit?.product?.name || item.soldUnit?.modelSnapshot || 'Registered Laptop';
    const serial = item.soldUnit?.serialNumber;
    const scheduledDate = formatDate(item.scheduledPickupAt || item.preferredDate);
    const slot = (item.preferredSlot || '').replace(/_/g, ' ');

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('ServiceJobDetail', { jobId: item.id })}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.jobNumber}>{item.jobNumber || 'SRV-JOB'}</Text>
            <Text style={styles.dateLabel}>Scheduled for {scheduledDate}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: badge.bg }]}>
            <Ionicons name={badge.icon} size={12} color={badge.text} />
            <Text style={[styles.badgeText, { color: badge.text }]}>{badge.label}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.laptopRow}>
          <View style={styles.laptopIconBox}>
            <Ionicons name="laptop-outline" size={20} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.laptopName} numberOfLines={1}>
              {laptopTitle}
            </Text>
            {serial ? <Text style={styles.serialText}>S/N: {serial}</Text> : null}
          </View>
        </View>

        {slot ? (
          <View style={styles.slotRow}>
            <Ionicons name="time-outline" size={13} color="#64748b" />
            <Text style={styles.slotText}>{slot}</Text>
          </View>
        ) : null}

        {item.technician ? (
          <View style={styles.techRow}>
            <Ionicons name="person-circle-outline" size={15} color="#2563eb" />
            <Text style={styles.techText}>
              Technician: {item.technician.name || 'Assigned'}
            </Text>
          </View>
        ) : null}

        <View style={styles.footerRow}>
          <Text style={styles.checklistHint}>Includes 4-point cleaning &amp; thermal repasting</Text>
          <View style={styles.trackLink}>
            <Text style={styles.trackLinkText}>View Status</Text>
            <Ionicons name="chevron-forward" size={14} color={colors.primary} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading service appointments...</Text>
        </View>
      ) : jobList.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="construct-outline" size={64} color="#cbd5e1" />
          <Text style={styles.emptyTitle}>No service bookings</Text>
          <Text style={styles.emptySubtitle}>
            Every laptop purchased includes 1 complimentary general service in the first 6 months.
          </Text>
          <TouchableOpacity
            style={styles.bookBtn}
            onPress={() => navigation.navigate('MyLaptops')}
            activeOpacity={0.8}
          >
            <Ionicons name="calendar-outline" size={16} color="#fff" />
            <Text style={styles.bookBtnText}>Book Service on My Laptops</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={jobList}
          renderItem={renderJobItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={colors.primary}
            />
          }
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={styles.headerInfo}>
              <View style={styles.headerTextWrap}>
                <Text style={styles.headerTitle}>Doorstep Laptop Service</Text>
                <Text style={styles.headerSubtitle}>
                  Track your certified technician appointments and multi-point checkup reports.
                </Text>
              </View>
              <TouchableOpacity
                style={styles.headerBookBtn}
                onPress={() => navigation.navigate('MyLaptops')}
                activeOpacity={0.8}
              >
                <Ionicons name="add" size={16} color="#fff" />
                <Text style={styles.headerBookBtnText}>Book</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  listContent: {
    padding: spacing.md,
    gap: spacing.md,
  },
  headerInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    marginBottom: spacing.xs,
  },
  headerTextWrap: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e3a8a',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#3b82f6',
    marginTop: 2,
    lineHeight: 15,
  },
  headerBookBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.md,
  },
  headerBookBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    ...shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  jobNumber: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  dateLabel: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: spacing.sm,
  },
  laptopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  laptopIconBox: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  laptopName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
  },
  serialText: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  slotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: spacing.xs + 2,
  },
  slotText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '500',
  },
  techRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
  },
  techText: {
    fontSize: 11,
    color: '#2563eb',
    fontWeight: '600',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingTop: spacing.xs + 2,
    borderTopWidth: 1,
    borderTopColor: '#f8fafc',
  },
  checklistHint: {
    fontSize: 10,
    color: '#94a3b8',
    flex: 1,
  },
  trackLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  trackLinkText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
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
    maxWidth: 260,
    lineHeight: 18,
  },
  bookBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.lg,
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radius.md,
  },
  bookBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
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
});
