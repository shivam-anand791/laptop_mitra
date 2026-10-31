import { useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useOrders } from '../../hooks/useApi';
import { Order } from '@laptopmitra/types';
import { MainStackNavigationProp } from '../../navigation/types';
import { getMobileStatusLabel, formatIndianRupees, getDeliveryEstimateText } from '../../utils/account-helpers';

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

export default function OrderHistoryScreen() {
  const navigation = useNavigation<MainStackNavigationProp>();
  const { data: orders, isLoading, refetch, isRefetching } = useOrders();

  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch]),
  );

  const renderOrder = ({ item }: { item: Order }) => {
    const statusCfg = getMobileStatusLabel(item.status, item.paymentStatus, item.returnStatus);
    const itemCount = item.items?.length ?? 0;
    const firstItem = item.items?.[0];
    const estimateText = getDeliveryEstimateText((item as any).estimatedDelivery);

    return (
      <TouchableOpacity
        style={styles.orderCard}
        onPress={() => navigation.navigate('OrderDetail', { orderId: item.id })}
        activeOpacity={0.7}
      >
        <View style={styles.orderHeader}>
          <View>
            <Text style={styles.orderNumber}>#{item.orderNumber}</Text>
            <Text style={styles.orderDate}>{formatDate(item.createdAt)}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusCfg.bg }]}>
            <Ionicons name={statusCfg.icon as any} size={12} color={statusCfg.text} />
            <Text style={[styles.statusBadgeText, { color: statusCfg.text }]}>{statusCfg.label}</Text>
          </View>
        </View>

        {firstItem && (
          <View style={styles.itemSummary}>
            <Text style={styles.itemTitle} numberOfLines={1}>
              {firstItem.product?.name || firstItem.variantName || 'Laptop Item'}
            </Text>
            {itemCount > 1 && (
              <Text style={styles.itemExtra}>+{itemCount - 1} more item{itemCount - 1 !== 1 ? 's' : ''}</Text>
            )}
          </View>
        )}

        <View style={styles.estimateRow}>
          <Ionicons name="calendar-outline" size={13} color="#64748b" />
          <Text style={styles.estimateText}>{estimateText}</Text>
        </View>

        <View style={styles.orderFooter}>
          <Text style={styles.orderItems}>
            {itemCount} item{itemCount !== 1 ? 's' : ''}
          </Text>
          <Text style={styles.orderTotal}>{formatIndianRupees(item.finalAmount)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  const items = (orders ?? []) as Order[];

  if (items.length === 0) {
    return (
      <View style={styles.centered}>
        <Ionicons name="receipt-outline" size={64} color="#cbd5e1" />
        <Text style={styles.emptyTitle}>No orders yet</Text>
        <Text style={styles.emptySubtitle}>Your order history will appear here</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={items}
      renderItem={renderOrder}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={refetch}
          tintColor="#2563eb"
        />
      }
    />
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 24,
    gap: 8,
  },
  list: {
    padding: 16,
    gap: 12,
  },
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 10,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  orderNumber: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  orderDate: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  itemSummary: {
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e293b',
  },
  itemExtra: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  estimateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  estimateText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  orderItems: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  orderTotal: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748b',
  },
});
