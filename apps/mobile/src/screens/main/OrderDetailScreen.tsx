import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useOrder, useCancelOrder } from '../../hooks/useApi';
import { MainStackParamList } from '../../navigation/types';

type OrderDetailRouteProp = RouteProp<MainStackParamList, 'OrderDetail'>;

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  PENDING: { bg: '#fef3c7', text: '#92400e' },
  CONFIRMED: { bg: '#dbeafe', text: '#1e40af' },
  PROCESSING: { bg: '#ede9fe', text: '#5b21b6' },
  SHIPPING: { bg: '#e0e7ff', text: '#3730a3' },
  SHIPPED: { bg: '#e0e7ff', text: '#3730a3' },
  DELIVERED: { bg: '#dcfce7', text: '#166534' },
  CANCELLED: { bg: '#fee2e2', text: '#991b1b' },
};

const TIMELINE_STATUSES = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'];

const getDefaultStatus = () => ({ bg: '#f1f5f9', text: '#64748b' });

const formatPrice = (price: number | string) => {
  const num = typeof price === 'string' ? parseFloat(price) : price;
  return `₹${num.toLocaleString('en-IN')}`;
};

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

export default function OrderDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute<OrderDetailRouteProp>();
  const { orderId } = route.params;
  const { data: order, isLoading } = useOrder(orderId);
  const cancelOrder = useCancelOrder();

  const handleCancel = () => {
    Alert.alert(
      'Cancel Order',
      'Are you sure you want to cancel this order?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: () =>
            cancelOrder.mutate(orderId, {
              onSuccess: () => {
                Alert.alert('Cancelled', 'Order has been cancelled');
                navigation.goBack();
              },
              onError: (err) => Alert.alert('Error', err.message),
            }),
        },
      ],
    );
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>Order not found</Text>
      </View>
    );
  }

  const status = STATUS_COLORS[order.status] ?? getDefaultStatus();
  const canCancel = order.status === 'PENDING' || order.status === 'CONFIRMED';
  const timelineIndex = TIMELINE_STATUSES.indexOf(order.status);
  const isCancelled = order.status === 'CANCELLED';

  const shippingAddress = order.shippingAddress as Record<string, string> | null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Order Header */}
      <View style={styles.headerSection}>
        <Text style={styles.orderNumber}>#{order.orderNumber}</Text>
        <Text style={styles.orderDate}>{formatDate(order.createdAt)}</Text>
        <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
          <Text style={[styles.statusBadgeText, { color: status.text }]}>{order.status}</Text>
        </View>
      </View>

      {/* Status Timeline */}
      {!isCancelled && (
        <View style={styles.timeline}>
          {TIMELINE_STATUSES.map((step, index) => {
            const isActive = index <= timelineIndex;
            const isCurrent = index === timelineIndex;
            return (
              <View key={step} style={styles.timelineStep}>
                <View style={styles.timelineDotRow}>
                  <View style={[styles.timelineDot, isActive && styles.timelineDotActive, isCurrent && styles.timelineDotCurrent]}>
                    {isActive && <Ionicons name="checkmark" size={12} color="#fff" />}
                  </View>
                  {index < TIMELINE_STATUSES.length - 1 && (
                    <View style={[styles.timelineLine, index < timelineIndex && styles.timelineLineActive]} />
                  )}
                </View>
                <Text style={[styles.timelineLabel, isActive && styles.timelineLabelActive]}>
                  {step.charAt(0) + step.slice(1).toLowerCase()}
                </Text>
              </View>
            );
          })}
        </View>
      )}

      {/* Order Items */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Items</Text>
        {order.items?.map((item) => {
          const product = item.product;
          const primaryImage = product?.images?.find((img) => img.isPrimary) ?? product?.images?.[0];
          return (
            <View key={item.id} style={styles.orderItem}>
              <View style={styles.itemImage}>
                {primaryImage ? (
                  <Image source={{ uri: primaryImage.url }} style={styles.image} contentFit="cover" transition={200} />
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <Ionicons name="image-outline" size={20} color="#cbd5e1" />
                  </View>
                )}
              </View>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName} numberOfLines={2}>{product?.name ?? 'Product'}</Text>
                <Text style={styles.itemDetail}>Qty: {item.quantity} × {formatPrice(item.price)}</Text>
                <Text style={styles.itemTotal}>{formatPrice(Number(item.price) * (item.quantity ?? 1))}</Text>
              </View>
            </View>
          );
        })}
      </View>

      {/* Order Summary */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Summary</Text>
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>{formatPrice(order.subtotal)}</Text>
          </View>
          {Number(order.discountAmount) > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryDiscountLabel}>Discount</Text>
              <Text style={styles.summaryDiscountValue}>- {formatPrice(order.discountAmount)}</Text>
            </View>
          )}
          {Number(order.referralDiscount ?? 0) > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryDiscountLabel}>Referral Discount</Text>
              <Text style={styles.summaryDiscountValue}>- {formatPrice(order.referralDiscount ?? 0)}</Text>
            </View>
          )}
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryTotalLabel}>Total</Text>
            <Text style={styles.summaryTotalValue}>{formatPrice(order.finalAmount)}</Text>
          </View>
        </View>
      </View>

      {/* Shipping Address */}
      {shippingAddress && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Shipping Address</Text>
          <View style={styles.addressCard}>
            {shippingAddress.fullName && <Text style={styles.addressName}>{shippingAddress.fullName}</Text>}
            {shippingAddress.phone && <Text style={styles.addressPhone}>{shippingAddress.phone}</Text>}
            <Text style={styles.addressText}>{shippingAddress.address || ''}</Text>
            <Text style={styles.addressText}>
              {[shippingAddress.city, shippingAddress.state, shippingAddress.pincode].filter(Boolean).join(', ')}
            </Text>
          </View>
        </View>
      )}

      {/* Payment Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Payment</Text>
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Status</Text>
            <Text style={styles.summaryValue}>{order.paymentStatus}</Text>
          </View>
          {order.paymentMethod && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Method</Text>
              <Text style={styles.summaryValue}>{order.paymentMethod}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Cancel Button */}
      {canCancel && (
        <TouchableOpacity
          style={[styles.cancelButton, cancelOrder.isPending && styles.cancelButtonDisabled]}
          onPress={handleCancel}
          disabled={cancelOrder.isPending}
          activeOpacity={0.8}
        >
          {cancelOrder.isPending ? (
            <ActivityIndicator size="small" color="#ef4444" />
          ) : (
            <Text style={styles.cancelButtonText}>Cancel Order</Text>
          )}
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  headerSection: {
    marginBottom: 20,
  },
  orderNumber: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
  },
  orderDate: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    marginTop: 8,
  },
  statusBadgeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  timeline: {
    marginBottom: 24,
    paddingLeft: 4,
  },
  timelineStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  timelineDotRow: {
    alignItems: 'center',
    width: 24,
  },
  timelineDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timelineDotActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  timelineDotCurrent: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  timelineLine: {
    width: 2,
    height: 24,
    backgroundColor: '#e2e8f0',
    marginTop: 4,
  },
  timelineLineActive: {
    backgroundColor: '#2563eb',
  },
  timelineLabel: {
    fontSize: 14,
    color: '#94a3b8',
    paddingVertical: 6,
  },
  timelineLabelActive: {
    color: '#0f172a',
    fontWeight: '600',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 10,
  },
  orderItem: {
    flexDirection: 'row',
    gap: 12,
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    marginBottom: 8,
  },
  itemImage: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: '#e2e8f0',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  itemDetail: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  itemTotal: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 2,
  },
  summaryCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 14,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#64748b',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1e293b',
  },
  summaryDiscountLabel: {
    fontSize: 14,
    color: '#22c55e',
  },
  summaryDiscountValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#22c55e',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 8,
  },
  summaryTotalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  summaryTotalValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  addressCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 14,
  },
  addressName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e293b',
  },
  addressPhone: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 2,
  },
  addressText: {
    fontSize: 14,
    color: '#374151',
    marginTop: 4,
  },
  cancelButton: {
    height: 50,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  cancelButtonDisabled: {
    opacity: 0.5,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ef4444',
  },
  emptyText: {
    fontSize: 16,
    color: '#64748b',
  },
});
