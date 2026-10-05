import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Modal, TextInput } from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useOrder, useCancelOrder, useReturnOrder, useReorder, useOrderInvoice, useOrderTracking } from '../../hooks/useApi';
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
  return `₹${(num || 0).toLocaleString('en-IN')}`;
};

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

export default function OrderDetailScreen() {
  const route = useRoute<OrderDetailRouteProp>();
  const { orderId } = route.params;

  const { data: order, isLoading } = useOrder(orderId);
  const { data: invoiceData } = useOrderInvoice(orderId);
  const { data: trackData } = useOrderTracking(orderId);

  const cancelOrder = useCancelOrder();
  const returnOrder = useReturnOrder();
  const reorder = useReorder();

  // Return modal state
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [returnReason, setReturnReason] = useState('');

  // Invoice modal state
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);

  const handleCancel = () => {
    Alert.alert(
      'Cancel Order',
      'Are you sure you want to cancel this order? This action cannot be undone.',
      [
        { text: 'Keep Order', style: 'cancel' },
        {
          text: 'Yes, Cancel Order',
          style: 'destructive',
          onPress: () =>
            cancelOrder.mutate(orderId, {
              onSuccess: () => {
                Alert.alert('Order Cancelled', 'Your order has been cancelled successfully.');
              },
              onError: (err) => Alert.alert('Error', err.message),
            }),
        },
      ],
    );
  };

  const handleReturnSubmit = () => {
    if (!returnReason.trim()) {
      Alert.alert('Validation Error', 'Please provide a reason for the return / replacement request.');
      return;
    }

    returnOrder.mutate(
      { orderId, reason: returnReason.trim() },
      {
        onSuccess: (res) => {
          setIsReturnModalOpen(false);
          setReturnReason('');
          Alert.alert('Return Request Submitted', res.message || 'Our team will review your request within 24 hours.');
        },
        onError: (err) => Alert.alert('Error', err.message),
      },
    );
  };

  const handleReorder = () => {
    reorder.mutate(orderId, {
      onSuccess: (res) => {
        Alert.alert('Reordered', `${res.itemsAdded} item(s) added to your cart.`);
      },
      onError: (err) => Alert.alert('Error', err.message),
    });
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
  const canReturn = order.status === 'DELIVERED';
  const timelineIndex = TIMELINE_STATUSES.indexOf(order.status);
  const isCancelled = order.status === 'CANCELLED';

  const shippingAddress = order.shippingAddress as Record<string, string> | null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Order Header */}
      <View style={styles.headerSection}>
        <View style={styles.headerTopRow}>
          <Text style={styles.orderNumber}>#{order.orderNumber || order.id.slice(-8)}</Text>
          <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
            <Text style={[styles.statusBadgeText, { color: status.text }]}>{order.status}</Text>
          </View>
        </View>
        <Text style={styles.orderDate}>Placed on {formatDate(order.createdAt)}</Text>
      </View>

      {/* Quick Action Buttons */}
      <View style={styles.actionButtonRow}>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => setIsInvoiceModalOpen(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="document-text-outline" size={16} color="#2563eb" />
          <Text style={styles.secondaryButtonText}>Tax Invoice</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={handleReorder}
          disabled={reorder.isPending}
          activeOpacity={0.7}
        >
          {reorder.isPending ? (
            <ActivityIndicator size="small" color="#2563eb" />
          ) : (
            <>
              <Ionicons name="repeat-outline" size={16} color="#2563eb" />
              <Text style={styles.secondaryButtonText}>Reorder</Text>
            </>
          )}
        </TouchableOpacity>

        {canReturn && (
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => setIsReturnModalOpen(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="return-up-back-outline" size={16} color="#475569" />
            <Text style={styles.secondaryButtonText}>Return</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Status Timeline */}
      {!isCancelled && (
        <View style={styles.timelineCard}>
          <Text style={styles.sectionTitle}>Delivery Progress</Text>
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
          {trackData?.carrier && (
            <View style={styles.trackInfo}>
              <Ionicons name="airplane-outline" size={16} color="#2563eb" />
              <Text style={styles.trackInfoText}>
                Shipped via {trackData.carrier} (AWB: {trackData.trackingNumber})
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Order Items */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Ordered Laptops & Items</Text>
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
                    <Ionicons name="laptop-outline" size={24} color="#cbd5e1" />
                  </View>
                )}
              </View>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName} numberOfLines={2}>{product?.name ?? 'Laptop Item'}</Text>
                <Text style={styles.itemDetail}>Qty: {item.quantity} × {formatPrice(item.price)}</Text>
                <Text style={styles.itemTotal}>{formatPrice(Number(item.price) * (item.quantity ?? 1))}</Text>
              </View>
            </View>
          );
        })}
      </View>

      {/* Order Summary */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Price Breakdown</Text>
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>{formatPrice(order.subtotal)}</Text>
          </View>
          {Number(order.discountAmount) > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryDiscountLabel}>Discount Coupon</Text>
              <Text style={styles.summaryDiscountValue}>- {formatPrice(order.discountAmount)}</Text>
            </View>
          )}
          {Number(order.referralDiscount ?? 0) > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryDiscountLabel}>Mitra Referral Discount</Text>
              <Text style={styles.summaryDiscountValue}>- {formatPrice(order.referralDiscount ?? 0)}</Text>
            </View>
          )}
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryTotalLabel}>Grand Total (Incl. GST)</Text>
            <Text style={styles.summaryTotalValue}>{formatPrice(order.finalAmount)}</Text>
          </View>
        </View>
      </View>

      {/* Shipping Address */}
      {shippingAddress && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Delivery Destination</Text>
          <View style={styles.addressCard}>
            {shippingAddress.fullName && <Text style={styles.addressName}>{shippingAddress.fullName}</Text>}
            {shippingAddress.phone && <Text style={styles.addressPhone}>Phone: {shippingAddress.phone}</Text>}
            <Text style={styles.addressText}>{shippingAddress.address || ''}</Text>
            <Text style={styles.addressText}>
              {[shippingAddress.city, shippingAddress.state, shippingAddress.pincode].filter(Boolean).join(', ')}
            </Text>
            {shippingAddress.landmark ? (
              <Text style={styles.addressLandmark}>Landmark: {shippingAddress.landmark}</Text>
            ) : null}
          </View>
        </View>
      )}

      {/* Payment Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Payment Details</Text>
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Payment Status</Text>
            <Text style={[styles.summaryValue, { fontWeight: '700', color: order.paymentStatus === 'PAID' ? '#16a34a' : '#1e293b' }]}>
              {order.paymentStatus}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Gateway</Text>
            <Text style={styles.summaryValue}>{order.paymentMethod || 'Razorpay Secure'}</Text>
          </View>
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

      {/* Return Request Modal */}
      <Modal visible={isReturnModalOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Request Return / Replacement</Text>
            <Text style={styles.modalSubtitle}>
              Please describe the functional issue or reason for return. Our inspection team will review it under the 7-day Mitra Guarantee.
            </Text>

            <TextInput
              style={styles.modalInput}
              value={returnReason}
              onChangeText={setReturnReason}
              placeholder="e.g. Screen flickering or battery issue..."
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setIsReturnModalOpen(false)}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSubmitButton}
                onPress={handleReturnSubmit}
                disabled={returnOrder.isPending}
              >
                {returnOrder.isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalSubmitButtonText}>Submit Request</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Tax Invoice Modal */}
      <Modal visible={isInvoiceModalOpen} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>GST Tax Invoice</Text>
            <Text style={styles.modalSubtitle}>
              Invoice #{invoiceData?.invoiceNumber || `INV-${order.orderNumber}`}
            </Text>

            <View style={styles.invoiceBreakdown}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Base Amount</Text>
                <Text style={styles.summaryValue}>{formatPrice((invoiceData as any)?.taxBreakdown?.taxableAmount || (order.subtotal * 0.82))}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>CGST (9%)</Text>
                <Text style={styles.summaryValue}>{formatPrice((invoiceData as any)?.taxBreakdown?.cgst || (order.subtotal * 0.09))}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>SGST (9%)</Text>
                <Text style={styles.summaryValue}>{formatPrice((invoiceData as any)?.taxBreakdown?.sgst || (order.subtotal * 0.09))}</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryRow}>
                <Text style={styles.summaryTotalLabel}>Total Paid</Text>
                <Text style={styles.summaryTotalValue}>{formatPrice(order.finalAmount)}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.modalSubmitButton}
              onPress={() => setIsInvoiceModalOpen(false)}
            >
              <Text style={styles.modalSubmitButtonText}>Close Invoice</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    marginBottom: 16,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  orderNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
  },
  orderDate: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  actionButtonRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#f8fafc',
  },
  secondaryButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e293b',
  },
  timelineCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  timeline: {
    marginTop: 10,
    marginBottom: 10,
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
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  timelineLine: {
    width: 2,
    height: 20,
    backgroundColor: '#e2e8f0',
    marginTop: 2,
  },
  timelineLineActive: {
    backgroundColor: '#2563eb',
  },
  timelineLabel: {
    fontSize: 13,
    color: '#94a3b8',
    paddingVertical: 4,
  },
  timelineLabelActive: {
    color: '#0f172a',
    fontWeight: '600',
  },
  trackInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  trackInfoText: {
    fontSize: 12,
    color: '#2563eb',
    fontWeight: '600',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 15,
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
    fontSize: 13,
    fontWeight: '600',
    color: '#1e293b',
  },
  itemDetail: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  itemTotal: {
    fontSize: 13,
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
    fontSize: 13,
    color: '#64748b',
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1e293b',
  },
  summaryDiscountLabel: {
    fontSize: 13,
    color: '#22c55e',
  },
  summaryDiscountValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#22c55e',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 8,
  },
  summaryTotalLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  summaryTotalValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  addressCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 14,
  },
  addressName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
  },
  addressPhone: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  addressText: {
    fontSize: 13,
    color: '#374151',
    marginTop: 4,
  },
  addressLandmark: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  cancelButton: {
    height: 48,
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
    fontSize: 15,
    fontWeight: '700',
    color: '#ef4444',
  },
  emptyText: {
    fontSize: 16,
    color: '#64748b',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 14,
    lineHeight: 18,
  },
  modalInput: {
    height: 100,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: '#1e293b',
    backgroundColor: '#f8fafc',
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
  },
  modalCancelButton: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  modalSubmitButton: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalSubmitButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  invoiceBreakdown: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
  },
});
