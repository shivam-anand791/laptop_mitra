import { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useReturns } from '../../hooks/useApi';
import { useAuth } from '../../providers/AuthProvider';
import { MainStackNavigationProp } from '../../navigation/types';
import { formatIndianRupees } from '../../utils/account-helpers';
import { colors, radius, spacing, shadows } from '../../theme/tokens';

type ReturnFilterTab = 'ALL' | 'ACTIVE' | 'COMPLETED' | 'CLOSED';

const TABS: { id: ReturnFilterTab; label: string }[] = [
  { id: 'ALL', label: 'All' },
  { id: 'ACTIVE', label: 'Active' },
  { id: 'COMPLETED', label: 'Completed' },
  { id: 'CLOSED', label: 'Closed' },
];

function getReturnStatusBadge(status?: string | null) {
  const s = (status || '').toUpperCase();
  if (s === 'REFUNDED' || s === 'REPLACED') {
    return {
      label: s === 'REPLACED' ? 'Replaced' : 'Refunded',
      bg: '#f0fdf4',
      text: '#16a34a',
      icon: 'checkmark-circle' as const,
    };
  }
  if (s === 'REJECTED' || s === 'CANCELLED' || s === 'INSPECTION_FAILED') {
    return {
      label: s === 'REJECTED' ? 'Rejected' : s === 'CANCELLED' ? 'Cancelled' : 'Failed Inspection',
      bg: '#fef2f2',
      text: '#dc2626',
      icon: 'close-circle' as const,
    };
  }
  if (s === 'APPROVED' || s === 'PICKUP_SCHEDULED' || s === 'IN_TRANSIT') {
    return {
      label: s === 'PICKUP_SCHEDULED' ? 'Pickup Scheduled' : s === 'IN_TRANSIT' ? 'In Transit' : 'Approved',
      bg: '#eff6ff',
      text: '#2563eb',
      icon: 'car-outline' as const,
    };
  }
  if (s === 'INSPECTED' || s === 'REFUND_INITIATED') {
    return {
      label: s === 'REFUND_INITIATED' ? 'Refund Initiated' : 'Inspected',
      bg: '#fef3c7',
      text: '#d97706',
      icon: 'shield-checkmark-outline' as const,
    };
  }
  return {
    label: 'Under Review',
    bg: '#f8fafc',
    text: '#475569',
    icon: 'time-outline' as const,
  };
}

export default function ReturnsListScreen() {
  const navigation = useNavigation<MainStackNavigationProp>();
  const { isAuthenticated, isGuest } = useAuth();
  const [selectedTab, setSelectedTab] = useState<ReturnFilterTab>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: returnsData = [], isLoading, refetch, isRefetching } = useReturns();

  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch]),
  );

  const returns = Array.isArray(returnsData) ? returnsData : [];

  const filteredReturns = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return returns.filter((r: any) => {
      const s = (r.status || '').toUpperCase();
      if (selectedTab === 'ACTIVE') {
        if (['REFUNDED', 'REPLACED', 'REJECTED', 'CANCELLED', 'INSPECTION_FAILED'].includes(s)) return false;
      } else if (selectedTab === 'COMPLETED') {
        if (!['REFUNDED', 'REPLACED'].includes(s)) return false;
      } else if (selectedTab === 'CLOSED') {
        if (!['REJECTED', 'CANCELLED', 'INSPECTION_FAILED'].includes(s)) return false;
      }

      if (q) {
        const retNum = (r.returnNumber || r.id || '').toLowerCase();
        const ordNum = (r.order?.orderNumber || '').toLowerCase();
        const reason = (r.reason || '').toLowerCase();
        const matchItem = r.items?.some((it: any) =>
          (it.orderItem?.product?.name || '').toLowerCase().includes(q)
        );
        if (!retNum.includes(q) && !ordNum.includes(q) && !reason.includes(q) && !matchItem) {
          return false;
        }
      }

      return true;
    });
  }, [returns, selectedTab, searchQuery]);

  if (!isAuthenticated || isGuest) {
    return (
      <View style={styles.centered}>
        <Ionicons name="repeat-outline" size={56} color="#94a3b8" />
        <Text style={styles.emptyTitle}>Sign in to view returns</Text>
        <Text style={styles.emptySubtitle}>Log in to track your device return and refund progress.</Text>
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

  const renderReturnItem = ({ item }: { item: any }) => {
    const badge = getReturnStatusBadge(item.status);
    const returnNumber = item.returnNumber || item.id?.slice(0, 8);
    const orderNumber = item.order?.orderNumber;
    const firstItem = item.items?.[0]?.orderItem?.product;
    const refundAmount = item.refundAmount ? formatIndianRupees(item.refundAmount) : null;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('ReturnDetail', { returnId: item.id })}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.returnNumber}>Return #{returnNumber}</Text>
            {orderNumber ? <Text style={styles.orderRef}>For Order #{orderNumber}</Text> : null}
          </View>
          <View style={[styles.badge, { backgroundColor: badge.bg }]}>
            <Ionicons name={badge.icon} size={12} color={badge.text} />
            <Text style={[styles.badgeText, { color: badge.text }]}>{badge.label}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {firstItem ? (
          <Text style={styles.productName} numberOfLines={1}>
            {firstItem.name}
          </Text>
        ) : null}

        <Text style={styles.reasonText} numberOfLines={2}>
          Reason: {item.reason || 'General hardware / quality concern'}
        </Text>

        <View style={styles.cardFooter}>
          {refundAmount ? (
            <Text style={styles.refundText}>Refund: {refundAmount}</Text>
          ) : (
            <Text style={styles.dateText}>
              {new Date(item.createdAt).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </Text>
          )}

          <View style={styles.viewDetailBtn}>
            <Text style={styles.viewDetailText}>Track Return</Text>
            <Ionicons name="arrow-forward" size={12} color={colors.primary} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color="#94a3b8" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by return #, order #, reason..."
          placeholderTextColor="#94a3b8"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color="#94a3b8" />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabsRow}>
        {TABS.map((tab) => {
          const isActive = selectedTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tab, isActive && styles.tabActive]}
              onPress={() => setSelectedTab(tab.id)}
            >
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Return Cards List */}
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading return requests...</Text>
        </View>
      ) : filteredReturns.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="repeat-outline" size={56} color="#cbd5e1" />
          <Text style={styles.emptyTitle}>No returns found</Text>
          <Text style={styles.emptySubtitle}>
            {searchQuery
              ? 'Try modifying your search keywords'
              : 'You do not have any return requests in this category'}
          </Text>
          <TouchableOpacity
            style={styles.newReturnBtn}
            onPress={() => navigation.navigate('GuidedSupportFlow', {})}
          >
            <Ionicons name="add" size={16} color="#fff" />
            <Text style={styles.newReturnBtnText}>Need Help / Return Device</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredReturns}
          renderItem={renderReturnItem}
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
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: spacing.md,
    height: 42,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0f172a',
  },
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: '#f1f5f9',
  },
  tabActive: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  tabTextActive: {
    color: '#ffffff',
  },
  listContent: {
    padding: spacing.md,
    gap: spacing.md,
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
  returnNumber: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  orderRef: {
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
  productName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  reasonText: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 16,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingTop: spacing.xs + 2,
    borderTopWidth: 1,
    borderTopColor: '#f8fafc',
  },
  refundText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#16a34a',
  },
  dateText: {
    fontSize: 11,
    color: '#94a3b8',
  },
  viewDetailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewDetailText: {
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
    maxWidth: 240,
  },
  newReturnBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.lg,
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radius.md,
  },
  newReturnBtnText: {
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
