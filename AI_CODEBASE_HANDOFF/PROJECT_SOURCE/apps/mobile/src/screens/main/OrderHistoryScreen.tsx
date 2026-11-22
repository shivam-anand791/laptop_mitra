import { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useOrders, useOrderCounts, useCancelOrder, useReorder } from '../../hooks/useApi';
import { Order } from '@laptopmitra/types';
import { MainStackNavigationProp } from '../../navigation/types';
import {
  getMobileStatusLabel,
  formatIndianRupees,
  getDeliveryEstimateText,
  canCancelOrder,
  canDownloadInvoice,
  StatusTabId,
  filterOrdersByStatus,
  filterOrdersBySearch,
} from '../../utils/account-helpers';
import { colors, radius, spacing, shadows } from '../../theme/tokens';

const STATUS_TABS: { id: StatusTabId; label: string }[] = [
  { id: 'ALL', label: 'All' },
  { id: 'IN_PROGRESS', label: 'In Progress' },
  { id: 'DELIVERED', label: 'Delivered' },
  { id: 'CANCELLED', label: 'Cancelled' },
  { id: 'RETURNS', label: 'Returns' },
];

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

export default function OrderHistoryScreen() {
  const navigation = useNavigation<MainStackNavigationProp>();
  const { data: orders, isLoading, refetch, isRefetching } = useOrders();
  const { data: serverCounts, refetch: refetchCounts } = useOrderCounts();
  const cancelMutation = useCancelOrder();
  const reorderMutation = useReorder();

  const [selectedStatus, setSelectedStatus] = useState<StatusTabId>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedOrderId, setCopiedOrderId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      void refetch();
      void refetchCounts();
    }, [refetch, refetchCounts]),
  );

  const rawOrders = useMemo(() => (orders ?? []) as Order[], [orders]);

  // Derived counts for tabs
  const tabCounts = useMemo(() => {
    if (serverCounts) {
      return serverCounts;
    }
    const counts: Record<StatusTabId, number> = {
      ALL: rawOrders.length,
      IN_PROGRESS: 0,
      DELIVERED: 0,
      CANCELLED: 0,
      RETURNS: 0,
    };
    for (const o of rawOrders) {
      const norm = (o.status || '').toUpperCase();
      if (['PENDING', 'CONFIRMED', 'SHIPPING', 'SHIPPED'].includes(norm)) {
        counts.IN_PROGRESS += 1;
      } else if (norm === 'DELIVERED') {
        counts.DELIVERED += 1;
      } else if (norm === 'CANCELLED') {
        counts.CANCELLED += 1;
      }
      if ((o.returnStatus && o.returnStatus.toUpperCase() !== 'NONE') || norm === 'REFUNDED') {
        counts.RETURNS += 1;
      }
    }
    return counts;
  }, [serverCounts, rawOrders]);

  // Filtered orders based on selected tab and search query
  const filteredOrders = useMemo(() => {
    let result = filterOrdersByStatus(rawOrders, selectedStatus);
    result = filterOrdersBySearch(result, searchQuery);
    return result;
  }, [rawOrders, selectedStatus, searchQuery]);

  const handleCopyOrderNumber = (orderNumber: string, orderId: string) => {
    setCopiedOrderId(orderId);
    setTimeout(() => {
      setCopiedOrderId((prev) => (prev === orderId ? null : prev));
    }, 2000);
    Alert.alert('Order Number Copied', `#${orderNumber}`);
  };

  const handleCancel = (order: Order) => {
    Alert.alert(
      'Cancel Order',
      `Are you sure you want to cancel order #${order.orderNumber}?`,
      [
        { text: 'Keep Order', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: () => {
            cancelMutation.mutate(order.id, {
              onSuccess: () => {
                Alert.alert('Order Cancelled', `Order #${order.orderNumber} has been successfully cancelled.`);
                void refetch();
                void refetchCounts();
              },
              onError: (err: any) => {
                Alert.alert('Cancellation Failed', err?.message || 'Unable to cancel this order.');
              },
            });
          },
        },
      ],
    );
  };

  const handleBuyAgain = (order: Order) => {
    reorderMutation.mutate(order.id, {
      onSuccess: () => {
        Alert.alert('Items Added', 'Order items have been re-added to your cart.', [
          { text: 'View Cart', onPress: () => navigation.navigate('MainTabs', { screen: 'Cart' }) },
          { text: 'OK', style: 'cancel' },
        ]);
      },
      onError: () => {
        const firstProductId = order.items?.[0]?.productId;
        if (firstProductId) {
          navigation.navigate('ProductDetail', { productId: firstProductId });
        } else {
          navigation.navigate('MainTabs', { screen: 'Store' });
        }
      },
    });
  };

  const renderOrder = ({ item }: { item: Order }) => {
    const statusCfg = getMobileStatusLabel(item.status, item.paymentStatus, item.returnStatus);
    const itemCount = item.items?.length ?? 0;
    const firstItem = item.items?.[0];
    const estimateText = getDeliveryEstimateText((item as any).estimatedDelivery);
    const canCancel = canCancelOrder(item.status);
    const canInvoice = canDownloadInvoice(item).canDownload;
    const isCopied = copiedOrderId === item.id;

    const primaryImage =
      firstItem?.product?.images?.find((img: any) => img.isPrimary)?.url ||
      firstItem?.product?.images?.[0]?.url;

    return (
      <View style={styles.orderCard}>
        {/* Card Header */}
        <View style={styles.orderHeader}>
          <View style={styles.orderMeta}>
            <View style={styles.orderNumberRow}>
              <Text style={styles.orderNumber}>#{item.orderNumber}</Text>
              <TouchableOpacity
                onPress={() => handleCopyOrderNumber(item.orderNumber, item.id)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={styles.copyBtn}
              >
                <Ionicons
                  name={isCopied ? 'checkmark' : 'copy-outline'}
                  size={14}
                  color={isCopied ? colors.green : '#64748b'}
                />
              </TouchableOpacity>
            </View>
            <Text style={styles.orderDate}>{formatDate(item.createdAt)}</Text>
          </View>

          <View style={[styles.statusBadge, { backgroundColor: statusCfg.bg }]}>
            <Ionicons name={statusCfg.icon as any} size={12} color={statusCfg.text} />
            <Text style={[styles.statusBadgeText, { color: statusCfg.text }]}>{statusCfg.label}</Text>
          </View>
        </View>

        {/* Product Row */}
        <TouchableOpacity
          style={styles.productRow}
          onPress={() => navigation.navigate('OrderDetail', { orderId: item.id })}
          activeOpacity={0.7}
        >
          <View style={styles.thumbnailContainer}>
            {primaryImage ? (
              <Image source={{ uri: primaryImage }} style={styles.thumbnail} contentFit="contain" />
            ) : (
              <Ionicons name="laptop-outline" size={28} color="#94a3b8" />
            )}
            {itemCount > 1 ? (
              <View style={styles.itemCountBadge}>
                <Text style={styles.itemCountText}>+{itemCount - 1}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.productInfo}>
            <Text style={styles.productTitle} numberOfLines={2}>
              {firstItem?.product?.name || firstItem?.variantName || 'Certified Enterprise Laptop'}
            </Text>
            {firstItem?.variantName ? (
              <Text style={styles.variantSpecs} numberOfLines={1}>
                {firstItem.variantName}
                {firstItem.quantity ? ` • Qty: ${firstItem.quantity}` : ''}
              </Text>
            ) : null}
            <View style={styles.estimateRow}>
              <Ionicons name="car-outline" size={13} color="#64748b" />
              <Text style={styles.estimateText} numberOfLines={1}>
                {item.trackingNumber ? `Tracking: ${item.trackingNumber}` : estimateText}
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Price & Summary */}
        <View style={styles.priceRow}>
          <View>
            <Text style={styles.paymentMethodText}>
              {item.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Online Prepaid'}
              {item.paymentStatus === 'COMPLETED' ? ' (Paid)' : ''}
            </Text>
          </View>
          <Text style={styles.orderTotal}>{formatIndianRupees(item.finalAmount)}</Text>
        </View>

        {/* Quick Actions Row */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.primaryActionBtn}
            onPress={() => navigation.navigate('OrderDetail', { orderId: item.id })}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryActionBtnText}>Track & Details</Text>
            <Ionicons name="arrow-forward" size={13} color="#fff" />
          </TouchableOpacity>

          {canInvoice ? (
            <TouchableOpacity
              style={styles.secondaryActionBtn}
              onPress={() => navigation.navigate('OrderDetail', { orderId: item.id })}
              activeOpacity={0.8}
            >
              <Ionicons name="document-text-outline" size={14} color="#334155" />
              <Text style={styles.secondaryActionBtnText}>Invoice</Text>
            </TouchableOpacity>
          ) : null}

          {canCancel ? (
            <TouchableOpacity
              style={styles.cancelActionBtn}
              onPress={() => handleCancel(item)}
              activeOpacity={0.8}
              disabled={cancelMutation.isPending}
            >
              <Ionicons name="close-circle-outline" size={14} color="#dc2626" />
              <Text style={styles.cancelActionBtnText}>Cancel</Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            style={styles.reorderActionBtn}
            onPress={() => handleBuyAgain(item)}
            activeOpacity={0.8}
            disabled={reorderMutation.isPending}
          >
            <Ionicons name="cart-outline" size={14} color={colors.primary} />
            <Text style={styles.reorderActionBtnText}>Buy Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (isLoading && rawOrders.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading your orders...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search Header */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color="#94a3b8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by order # or laptop..."
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            autoCorrect={false}
          />
          {searchQuery.length > 0 ? (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={18} color="#94a3b8" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabBarWrapper}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={STATUS_TABS}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.tabBar}
          renderItem={({ item }) => {
            const isActive = selectedStatus === item.id;
            const count = tabCounts[item.id] ?? 0;
            return (
              <TouchableOpacity
                style={[styles.tabChip, isActive && styles.tabChipActive]}
                onPress={() => setSelectedStatus(item.id)}
                activeOpacity={0.7}
              >
                <Text style={[styles.tabChipText, isActive && styles.tabChipTextActive]}>
                  {item.label}
                </Text>
                {count > 0 ? (
                  <View style={[styles.tabBadge, isActive && styles.tabBadgeActive]}>
                    <Text style={[styles.tabBadgeText, isActive && styles.tabBadgeTextActive]}>
                      {count}
                    </Text>
                  </View>
                ) : null}
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Orders List / Empty State */}
      {filteredOrders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons
            name={searchQuery ? 'search-outline' : 'receipt-outline'}
            size={56}
            color="#cbd5e1"
          />
          <Text style={styles.emptyTitle}>
            {searchQuery ? 'No matching orders found' : 'No orders in this category'}
          </Text>
          <Text style={styles.emptySubtitle}>
            {searchQuery
              ? `No results for "${searchQuery}". Try searching with a different order number or model.`
              : 'Browse our catalog of certified enterprise refurbished laptops.'}
          </Text>
          {searchQuery ? (
            <TouchableOpacity
              style={styles.emptyActionBtn}
              onPress={() => {
                setSearchQuery('');
                setSelectedStatus('ALL');
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.emptyActionBtnText}>Clear Search & Filters</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.emptyActionBtn}
              onPress={() => navigation.navigate('MainTabs', { screen: 'Store' })}
              activeOpacity={0.8}
            >
              <Text style={styles.emptyActionBtnText}>Explore Laptops</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredOrders}
          renderItem={renderOrder}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => {
                void refetch();
                void refetchCounts();
              }}
              tintColor={colors.primary}
            />
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
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 24,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 8,
  },
  searchContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: radius.md,
    paddingHorizontal: 12,
    height: 40,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0f172a',
    paddingVertical: 0,
  },
  tabBarWrapper: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  tabBar: {
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    gap: 8,
  },
  tabChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radius.full,
    gap: 6,
  },
  tabChipActive: {
    backgroundColor: colors.primary,
  },
  tabChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  tabChipTextActive: {
    color: '#fff',
  },
  tabBadge: {
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.full,
  },
  tabBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  tabBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  tabBadgeTextActive: {
    color: '#fff',
  },
  list: {
    padding: spacing.md,
    paddingBottom: 40,
    gap: 14,
  },
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    ...shadows.sm,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  orderMeta: {
    gap: 2,
  },
  orderNumberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  orderNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    fontFamily: 'monospace',
  },
  copyBtn: {
    padding: 2,
  },
  orderDate: {
    fontSize: 11,
    color: '#64748b',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  productRow: {
    flexDirection: 'row',
    padding: 14,
    gap: 12,
    alignItems: 'center',
  },
  thumbnailContainer: {
    width: 60,
    height: 60,
    borderRadius: radius.md,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    borderRadius: radius.md,
  },
  itemCountBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: '#0f172a',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  itemCountText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  productInfo: {
    flex: 1,
    gap: 3,
  },
  productTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
    lineHeight: 18,
  },
  variantSpecs: {
    fontSize: 12,
    color: '#64748b',
  },
  estimateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  estimateText: {
    fontSize: 11,
    color: '#64748b',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    backgroundColor: '#fff',
  },
  paymentMethodText: {
    fontSize: 12,
    color: '#64748b',
  },
  orderTotal: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#fafbfc',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.md,
  },
  primaryActionBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  secondaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.md,
  },
  secondaryActionBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  cancelActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.md,
  },
  cancelActionBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#dc2626',
  },
  reorderActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.md,
  },
  reorderActionBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 8,
  },
  emptyActionBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: radius.md,
  },
  emptyActionBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
});
