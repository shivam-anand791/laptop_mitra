import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useOrders } from '../../hooks/useApi';
import { Order } from '@laptopmitra/types';
import { MainStackNavigationProp } from '../../navigation/types';

const STATUS_COLORS: Record<string, { bg: string; text: string; icon: string }> = {
  PENDING: { bg: '#fef3c7', text: '#92400e', icon: 'time-outline' },
  CONFIRMED: { bg: '#dbeafe', text: '#1e40af', icon: 'checkmark-circle-outline' },
  PROCESSING: { bg: '#ede9fe', text: '#5b21b6', icon: 'cog-outline' },
  SHIPPING: { bg: '#e0e7ff', text: '#3730a3', icon: 'car-outline' },
  DELIVERED: { bg: '#dcfce7', text: '#166534', icon: 'checkmark-done-circle-outline' },
  CANCELLED: { bg: '#fee2e2', text: '#991b1b', icon: 'close-circle-outline' },
  REFUNDED: { bg: '#fef3c7', text: '#92400e', icon: 'return-down-back-outline' },
};

const getDefaultStatus = () => ({ bg: '#f1f5f9', text: '#64748b', icon: 'help-circle-outline' });

const formatPrice = (price: number | string) => {
  const num = typeof price === 'string' ? parseFloat(price) : price;
  return `₹${num.toLocaleString('en-IN')}`;
};

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

export default function OrderHistoryScreen() {
  const navigation = useNavigation<MainStackNavigationProp>();
  const { data: orders, isLoading, refetch, isRefetching } = useOrders();

  const renderOrder = ({ item }: { item: Order }) => {
    const status = STATUS_COLORS[item.status] ?? getDefaultStatus();
    const itemCount = item.items?.length ?? 0;

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
          <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
            <Ionicons name={status.icon as any} size={12} color={status.text} />
            <Text style={[styles.statusBadgeText, { color: status.text }]}>{item.status}</Text>
          </View>
        </View>
        <View style={styles.orderFooter}>
          <Text style={styles.orderItems}>
            {itemCount} item{itemCount !== 1 ? 's' : ''}
          </Text>
          <Text style={styles.orderTotal}>{formatPrice(item.finalAmount)}</Text>
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
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  orderDate: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  orderItems: {
    fontSize: 14,
    color: '#64748b',
  },
  orderTotal: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#94a3b8',
  },
});
