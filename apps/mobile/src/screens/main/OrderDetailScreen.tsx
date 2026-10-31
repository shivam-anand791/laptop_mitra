import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Modal, TextInput, RefreshControl } from 'react-native';
import { useRoute, useNavigation, RouteProp, useFocusEffect } from '@react-navigation/native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useOrder, useCancelOrder, useReturnOrder, useReorder, useOrderInvoice, useOrderTracking } from '../../hooks/useApi';
import { MainStackParamList, MainStackNavigationProp } from '../../navigation/types';
import {
  getMobileStatusLabel,
  formatIndianRupees,
  canCancelOrder,
  canReturnOrder,
  canDownloadInvoice,
  getRealTrackingSteps,
  getDeliveryEstimateText,
  getWarrantyDisplayText,
} from '../../utils/account-helpers';

type OrderDetailRouteProp = RouteProp<MainStackParamList, 'OrderDetail'>;

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

export default function OrderDetailScreen() {
  const route = useRoute<OrderDetailRouteProp>();
  const navigation = useNavigation<MainStackNavigationProp>();
  const { orderId } = route.params;

  const { data: order, isLoading, refetch: refetchOrder, isRefetching: isRefetchingOrder } = useOrder(orderId);
  const { data: invoiceData, refetch: refetchInvoice } = useOrderInvoice(orderId);
  const { data: trackData, refetch: refetchTracking } = useOrderTracking(orderId);

  useFocusEffect(
    useCallback(() => {
      void refetchOrder();
      void refetchTracking();
    }, [refetchOrder, refetchTracking]),
  );

  const handleRefresh = useCallback(() => {
    void refetchOrder();
    void refetchInvoice();
    void refetchTracking();
  }, [refetchOrder, refetchInvoice, refetchTracking]);

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

  const statusCfg = getMobileStatusLabel(order.status, order.paymentStatus, order.returnStatus);
  const canCancel = canCancelOrder(order.status);
  const isCancelled = order.status === 'CANCELLED';

  const returnEligibility = canReturnOrder({
    status: order.status,
    deliveredAt: (order as any).deliveredAt ?? null,
    returnWindowDays: 7,
    returnStatus: order.returnStatus,
    isLease: order.items?.some((it: any) => it.purchaseMode === 'lease'),
  });

  const invoiceEligibility = canDownloadInvoice(order as any);
  const realSteps = getRealTrackingSteps(order as any);
  const estimateText = getDeliveryEstimateText((order as any).estimatedDelivery);
  const shippingAddress = order.shippingAddress as Record<string, string> | null;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={isRefetchingOrder}
          onRefresh={handleRefresh}
          tintColor="#2563eb"
        />
      }
    >
      {/* Order Header */}
      <View style={styles.headerSection}>
        <View style={styles.headerTopRow}>
          <Text style={styles.orderNumber}>#{order.orderNumber || order.id.slice(-8)}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusCfg.bg }]}>
            <Ionicons name={statusCfg.icon as any} size={12} color={statusCfg.text} />
            <Text style={[styles.statusBadgeText, { color: statusCfg.text }]}>{statusCfg.label}</Text>
          </View>
        </View>
        <Text style={styles.orderDate}>Placed on {formatDate(order.createdAt)}</Text>

        {/* Estimated Delivery Banner */}
        <View style={styles.estimateBanner}>
          <Ionicons name="calendar-outline" size={15} color="#2563eb" />
          <Text style={styles.estimateBannerText}>{estimateText}</Text>
        </View>
      </View>

      {/* Quick Action Buttons */}
      <View style={styles.actionButtonRow}>
        {invoiceEligibility.canDownload ? (
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => setIsInvoiceModalOpen(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="document-text-outline" size={16} color="#2563eb" />
            <Text style={styles.secondaryButtonText}>Tax Invoice</Text>
          </TouchableOpacity>
        ) : (
          <View style={[styles.secondaryButton, styles.buttonDisabled]}>
            <Ionicons name="document-text-outline" size={16} color="#94a3b8" />
            <Text style={[styles.secondaryButtonText, { color: '#94a3b8' }]}>Invoice</Text>
          </View>
        )}

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

        {returnEligibility.eligible && (
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => setIsReturnModalOpen(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="return-up-back-outline" size={16} color="#475569" />
            <Text style={styles.secondaryButtonText}>Return</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => navigation.navigate('GuidedSupportFlow', { orderId: order.id })}
          activeOpacity={0.7}
        >
          <Ionicons name="help-buoy-outline" size={16} color="#2563eb" />
          <Text style={styles.secondaryButtonText}>Need Help?</Text>
        </TouchableOpacity>
      </View>

      {/* Invoice note when disabled */}
      {!invoiceEligibility.canDownload && invoiceEligibility.note && (
        <View style={styles.noticeBox}>
          <Ionicons name="information-circle-outline" size={16} color="#64748b" />
          <Text style={styles.noticeBoxText}>{invoiceEligibility.note}</Text>
        </View>
      )}

      {/* Real Data-Backed Status Timeline */}
      {!isCancelled && (
        <View style={styles.timelineCard}>
          <Text style={styles.sectionTitle}>Delivery Progress</Text>
          <View style={styles.timeline}>
            {realSteps.map((step, index) => (
              <View key={step.key} style={styles.timelineStep}>
                <View style={styles.timelineDotRow}>
                  <View
                    style={[
                      styles.timelineDot,
                      step.isCompleted && styles.timelineDotActive,
                      step.isCurrent && styles.timelineDotCurrent,
                    ]}
                  >
                    {step.isCompleted && <Ionicons name="checkmark" size={12} color="#fff" />}
                  </View>
                  {index < realSteps.length - 1 && (
                    <View
                      style={[
                        styles.timelineLine,
                        realSteps[index + 1]?.isCompleted && styles.timelineLineActive,
                      ]}
                    />
                  )}
                </View>
                <View style={{ flex: 1, paddingVertical: 4 }}>
                  <Text style={[styles.timelineLabel, step.isCompleted && styles.timelineLabelActive]}>
                    {step.label}
                  </Text>
                  {step.timestamp && (
                    <Text style={styles.timelineTimestamp}>
                      {new Date(step.timestamp).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  )}
                </View>
              </View>
            ))}
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
        {order.items?.map((item: any) => {
          const product = item.product;
          const primaryImage = product?.images?.find((img: any) => img.isPrimary) ?? product?.images?.[0];
          const isLease = item.purchaseMode === 'lease';
          const lineUnitTotal = Number(item.price) + (item.hasWarranty && !isLease ? Number(item.warrantyPrice || 1999) : 0);
          const warrantyLabel = getWarrantyDisplayText(item.warrantyMonths, item.hasWarranty);

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
                <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center', marginBottom: 2 }}>
                  <View
                    style={{
                      paddingHorizontal: 5,
                      paddingVertical: 1,
                      borderRadius: 4,
                      backgroundColor: isLease ? '#FEF3C7' : '#DCFCE7',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 9,
                        fontWeight: '800',
                        textTransform: 'uppercase',
                        color: isLease ? '#92400E' : '#15803D',
                      }}
                    >
                      {isLease ? 'Rent / mo' : 'Buy'}
                    </Text>
                  </View>
                  {item.configuration === 'ram-16gb' && (
                    <View style={{ paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4, backgroundColor: '#EFF6FF' }}>
                      <Text style={{ fontSize: 9, fontWeight: '700', color: '#1D4ED8' }}>16GB RAM</Text>
                    </View>
                  )}
                  {!isLease && (
                    <View style={{ paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4, backgroundColor: '#F3E8FF' }}>
                      <Text style={{ fontSize: 9, fontWeight: '700', color: '#7E22CE' }}>{warrantyLabel}</Text>
                    </View>
                  )}
                </View>

                <Text style={styles.itemName} numberOfLines={2}>{product?.name ?? 'Laptop Item'}</Text>
                <Text style={styles.itemDetail}>
                  Qty: {item.quantity} × {formatIndianRupees(item.price)}
                  {isLease && <Text style={{ color: '#92400E', fontWeight: '600' }}> (1st Month)</Text>}
                </Text>
                {isLease && (
                  <Text style={{ fontSize: 10, color: '#92400E', fontWeight: '500', marginTop: 2 }}>
                    Month 1 advance, {formatIndianRupees(item.price)}/mo thereafter. Later months are invoiced separately.
                  </Text>
                )}
                <Text style={styles.itemTotal}>{formatIndianRupees(lineUnitTotal * (item.quantity ?? 1))}</Text>
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
            <Text style={styles.summaryValue}>{formatIndianRupees(order.subtotal)}</Text>
          </View>
          {Number(order.discountAmount) > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryDiscountLabel}>Discount Coupon</Text>
              <Text style={styles.summaryDiscountValue}>- {formatIndianRupees(order.discountAmount)}</Text>
            </View>
          )}
          {Number(order.referralDiscount ?? 0) > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryDiscountLabel}>Mitra Referral Discount</Text>
              <Text style={styles.summaryDiscountValue}>- {formatIndianRupees(order.referralDiscount ?? 0)}</Text>
            </View>
          )}
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryTotalLabel}>Grand Total (Incl. GST)</Text>
            <Text style={styles.summaryTotalValue}>{formatIndianRupees(order.finalAmount)}</Text>
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
            <Text style={[styles.summaryValue, { fontWeight: '700', color: order.paymentStatus === 'PAID' || order.paymentStatus === 'COMPLETED' ? '#16a34a' : '#1e293b' }]}>
              {order.paymentStatus === 'COMPLETED' ? 'Paid' : order.paymentStatus}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Payment Method</Text>
            <Text style={styles.summaryValue}>{order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Razorpay Secure'}</Text>
          </View>
        </View>
      </View>

      {/* Need Help With This Order Banner */}
      <View style={styles.helpBannerCard}>
        <Ionicons name="chatbubbles-outline" size={24} color="#2563eb" />
        <View style={styles.helpBannerContent}>
          <Text style={styles.helpBannerTitle}>Need help with this order?</Text>
          <Text style={styles.helpBannerDesc}>
            Track delivery, check 7-day return eligibility, or connect with a specialist.
          </Text>
        </View>
        <TouchableOpacity
          style={styles.helpBannerButton}
          onPress={() => navigation.navigate('GuidedSupportFlow', { orderId: order.id })}
          activeOpacity={0.8}
        >
          <Text style={styles.helpBannerButtonText}>Get Help</Text>
        </TouchableOpacity>
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
                <Text style={styles.summaryValue}>{formatIndianRupees((invoiceData as any)?.taxBreakdown?.taxableAmount || (order.subtotal * 0.82))}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>CGST (9%)</Text>
                <Text style={styles.summaryValue}>{formatIndianRupees((invoiceData as any)?.taxBreakdown?.cgst || (order.subtotal * 0.09))}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>SGST (9%)</Text>
                <Text style={styles.summaryValue}>{formatIndianRupees((invoiceData as any)?.taxBreakdown?.sgst || (order.subtotal * 0.09))}</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryRow}>
                <Text style={styles.summaryTotalLabel}>Total Paid</Text>
                <Text style={styles.summaryTotalValue}>{formatIndianRupees(order.finalAmount)}</Text>
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
  estimateBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#dbeafe',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 10,
  },
  estimateBannerText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1d4ed8',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  actionButtonRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
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
  buttonDisabled: {
    opacity: 0.5,
    backgroundColor: '#f1f5f9',
  },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16,
  },
  noticeBoxText: {
    fontSize: 12,
    color: '#64748b',
    flex: 1,
  },
  timelineCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  timeline: {
    marginTop: 10,
    marginBottom: 10,
    paddingLeft: 4,
  },
  timelineStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
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
    height: 24,
    backgroundColor: '#e2e8f0',
    marginVertical: 2,
  },
  timelineLineActive: {
    backgroundColor: '#2563eb',
  },
  timelineLabel: {
    fontSize: 13,
    color: '#94a3b8',
  },
  timelineLabelActive: {
    color: '#0f172a',
    fontWeight: '700',
  },
  timelineTimestamp: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
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
  helpBannerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#bfdbfe',
    marginBottom: 16,
    gap: 12,
  },
  helpBannerContent: {
    flex: 1,
  },
  helpBannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
  },
  helpBannerDesc: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
    lineHeight: 15,
  },
  helpBannerButton: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  helpBannerButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
});
