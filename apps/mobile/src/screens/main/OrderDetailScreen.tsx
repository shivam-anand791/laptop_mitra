import { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Modal, TextInput, RefreshControl } from 'react-native';
import { useRoute, useNavigation, RouteProp, useFocusEffect } from '@react-navigation/native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import {
  useOrder,
  useCancelOrder,
  useReturnOrder,
  useReorder,
  useOrderInvoice,
  useOrderTracking,
  useSupportConfig,
  useCreateRazorpayOrder,
  useVerifyRazorpayPayment,
  useCreateRazorpaySubscription,
  useVerifyRentalSubscription,
  useRequestRentalTermination,
  useProfile,
} from '../../hooks/useApi';
import { useAuth } from '../../providers/AuthProvider';
import { isAuthGuard401 } from '@laptopmitra/api-client';
import RazorpayCheckoutModal, { RazorpayCheckoutData } from '../../components/RazorpayCheckoutModal';
import { nativePaymentsSupported } from '../../utils/capabilities';
import { formatPaymentStartError, PAYMENT_CONFIRMING_MESSAGE } from '../../utils/checkout-helpers';
import ItemSituationHelpModal from '../../components/ItemSituationHelpModal';
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
  const { isAuthenticated, isGuest, logout } = useAuth();
  const { data: supportConfig } = useSupportConfig();

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
  const createRazorpayOrder = useCreateRazorpayOrder();
  const verifyRazorpayPayment = useVerifyRazorpayPayment();
  const createRazorpaySubscription = useCreateRazorpaySubscription();
  const verifyRentalSubscription = useVerifyRentalSubscription();
  const requestRentalTermination = useRequestRentalTermination();
  const { data: profile } = useProfile();

  // Return modal state
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [returnReason, setReturnReason] = useState('');

  // Invoice modal state
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [selectedHelpItem, setSelectedHelpItem] = useState<any | null>(null);

  // Razorpay retry & verifying state
  const [checkoutModalVisible, setCheckoutModalVisible] = useState(false);
  const [checkoutData, setCheckoutData] = useState<RazorpayCheckoutData | null>(null);
  const [isRetryingPayment, setIsRetryingPayment] = useState(false);
  const [paymentStartError, setPaymentStartError] = useState<string | null>(null);
  const [isConfirmingPayment, setIsConfirmingPayment] = useState(false);

  useEffect(() => {
    if (!isConfirmingPayment) return;
    if (order?.paymentStatus === 'PAID' || order?.status === 'CONFIRMED') {
      setIsConfirmingPayment(false);
      return;
    }
    let cancelled = false;
    let polls = 0;
    const timer = setInterval(() => {
      if (cancelled || polls >= 5) {
        clearInterval(timer);
        return;
      }
      polls += 1;
      void refetchOrder();
    }, 3000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [isConfirmingPayment, order?.paymentStatus, order?.status, refetchOrder]);

  const handleStartRazorpayPayment = async () => {
    if (!order || isRetryingPayment) return;
    if (!nativePaymentsSupported) {
      Alert.alert(
        'Development Build Required',
        'Push notifications and in-app payments need the full app build.',
      );
      return;
    }
    if (!isAuthenticated || isGuest || profile?.isGuest) {
      Alert.alert(
        'Sign In Required',
        'Please sign in with a customer account before making a payment.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign In', onPress: () => { void logout(); } },
        ],
      );
      return;
    }
    setIsRetryingPayment(true);
    setPaymentStartError(null);
    let modalOpened = false;
    try {
      const shipping = order.shippingAddress as Record<string, string> | null;
      const customerName = shipping?.fullName || profile?.name || 'Valued Customer';
      const customerEmail = profile?.email || '';
      const customerPhone = shipping?.phone || profile?.phone || '';

      const isLease = order.items?.some((it: any) => it.purchaseMode === 'lease');
      if (isLease) {
        const subscription = await createRazorpaySubscription.mutateAsync(order.id);
        if (!subscription.keyId) throw new Error('Payment gateway key is unavailable');
        setCheckoutData({
          orderId: order.id,
          orderNumber: order.orderNumber,
          type: 'rental',
          razorpaySubscriptionId: subscription.subscriptionId,
          amountInPaise: subscription.amount,
          currency: subscription.currency || 'INR',
          keyId: subscription.keyId,
          customer: { name: customerName, email: customerEmail, phone: customerPhone },
          description: `Rental authorization for order #${order.orderNumber || order.id.slice(-8)}`,
        });
      } else {
        const rzpOrder = await createRazorpayOrder.mutateAsync(order.id);
        if (!rzpOrder.keyId) throw new Error('Payment gateway key is unavailable');
        setCheckoutData({
          orderId: order.id,
          orderNumber: order.orderNumber,
          type: 'purchase',
          razorpayOrderId: rzpOrder.id,
          amountInPaise: rzpOrder.amount,
          currency: rzpOrder.currency || 'INR',
          keyId: rzpOrder.keyId,
          customer: { name: customerName, email: customerEmail, phone: customerPhone },
          description: `Order #${order.orderNumber || order.id.slice(-8)} - Certified Refurbished`,
        });
      }
      modalOpened = true;
      setCheckoutModalVisible(true);
    } catch (err: any) {
      const { message, orderWasReleased } = formatPaymentStartError(err);
      setPaymentStartError(message);
      if (orderWasReleased) {
        void refetchOrder();
      }
      Alert.alert('Payment Could Not Be Started', message, [
        { text: 'Try Again', onPress: () => { void handleStartRazorpayPayment(); } },
        { text: 'OK', style: 'cancel' },
      ]);
    } finally {
      if (!modalOpened) {
        setIsRetryingPayment(false);
      }
    }
  };

  const handlePaymentSuccess = async (result: {
    orderId: string;
    razorpayOrderId?: string;
    razorpaySubscriptionId?: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
  }) => {
    setCheckoutModalVisible(false);
    setIsRetryingPayment(true);
    try {
      if (result.razorpaySubscriptionId) {
        await verifyRentalSubscription.mutateAsync({
          orderId: result.orderId,
          razorpaySubscriptionId: result.razorpaySubscriptionId,
          razorpayPaymentId: result.razorpayPaymentId,
          razorpaySignature: result.razorpaySignature,
        });
      } else if (result.razorpayOrderId) {
        await verifyRazorpayPayment.mutateAsync({
          orderId: result.orderId,
          razorpayOrderId: result.razorpayOrderId,
          razorpayPaymentId: result.razorpayPaymentId,
          razorpaySignature: result.razorpaySignature,
        });
      } else {
        throw new Error('Payment response did not include a valid order or subscription');
      }
      setIsConfirmingPayment(false);
      Alert.alert('Payment Verified!', 'Your payment was confirmed successfully.');
      void refetchOrder();
    } catch (err: any) {
      const status = Number(err?.status || err?.data?.statusCode || 0);
      if (!isAuthGuard401(status, err?.data)) {
        setIsConfirmingPayment(true);
      }
      void refetchOrder();
    } finally {
      setIsRetryingPayment(false);
    }
  };

  const handlePaymentFailure = (error: { description?: string }) => {
    setCheckoutModalVisible(false);
    setIsRetryingPayment(false);
    Alert.alert('Payment Failed', error.description || 'Payment could not be completed. You can try again.');
  };

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

  const handleRequestRentalTermination = () => {
    if (!order?.rentalSubscription) return;
    Alert.alert(
      'Request Rental Termination',
      'This request will be reviewed by our team. Your AutoPay mandate remains active until the request is approved.',
      [
        { text: 'Keep Rental', style: 'cancel' },
        {
          text: 'Submit Request',
          onPress: () => requestRentalTermination.mutate(order.rentalSubscription!.id, {
            onSuccess: () => {
              Alert.alert('Request Submitted', 'Your rental termination request is awaiting admin review.');
              void refetchOrder();
            },
            onError: (error) => Alert.alert('Request Failed', error.message),
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
          Alert.alert(
            'Return Request Submitted',
            res.message || (supportConfig?.firstResponseSlaHours
              ? `Our team aims to review your request within ${supportConfig.firstResponseSlaHours} hours.`
              : 'Our team will review your request.'),
          );
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
  const isLeaseOrder = order.items?.some((it: any) => it.purchaseMode === 'lease') ?? false;
  const canCancel = !isLeaseOrder && canCancelOrder(order.status);
  const isCancelled = order.status === 'CANCELLED';
  const isPendingRazorpay =
    order.status === 'PENDING' &&
    ['PENDING', 'FAILED'].includes(order.paymentStatus) &&
    ['razorpay', 'razorpay_subscription'].includes(order.paymentMethod || '');

  const returnEligibility = canReturnOrder({
    status: order.status,
    deliveredAt: (order as any).deliveredAt ?? null,
    returnWindowDays: supportConfig?.returnWindowDays ?? 0,
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

        {/* Payment Verification in Progress Banner */}
        {isConfirmingPayment && (
          <View style={styles.confirmingCard}>
            <View style={styles.pendingPaymentHeader}>
              <ActivityIndicator size="small" color="#1d4ed8" />
              <Text style={styles.confirmingTitle}>We&apos;re confirming your payment</Text>
            </View>
            <Text style={styles.confirmingText}>{PAYMENT_CONFIRMING_MESSAGE}</Text>
            <TouchableOpacity
              style={styles.payNowButton}
              onPress={() => void refetchOrder()}
              activeOpacity={0.8}
            >
              <Text style={styles.payNowButtonText}>Check Order Status</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Payment Initialization Error Banner */}
        {paymentStartError && !isConfirmingPayment && (
          <View style={styles.paymentErrorCard}>
            <Text style={styles.paymentErrorText}>{paymentStartError}</Text>
            <TouchableOpacity
              style={styles.paymentErrorRetryButton}
              onPress={handleStartRazorpayPayment}
              disabled={isRetryingPayment}
            >
              <Text style={styles.paymentErrorRetryText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Razorpay Pending Payment Retry Banner */}
        {isPendingRazorpay && !isConfirmingPayment && (
          <View style={styles.pendingPaymentCard}>
            <View style={styles.pendingPaymentHeader}>
              <Ionicons name="card" size={18} color="#b45309" />
              <Text style={styles.pendingPaymentTitle}>Payment Incomplete</Text>
            </View>
            <Text style={styles.pendingPaymentText}>
            {isLeaseOrder
              ? 'Your rental item is reserved. Authorize the AutoPay mandate and pay the first month to confirm it.'
              : 'Your order items are reserved. Complete your online payment via Razorpay to confirm the order.'}
            </Text>
            <TouchableOpacity
              style={styles.payNowButton}
              onPress={handleStartRazorpayPayment}
              disabled={isRetryingPayment}
              activeOpacity={0.8}
            >
              {isRetryingPayment ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="shield-checkmark" size={16} color="#fff" />
                  <Text style={styles.payNowButtonText}>
                    {isLeaseOrder ? 'Authorize & Pay' : 'Complete Payment'} ({formatIndianRupees(order.finalAmount)})
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
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
          onPress={() => {
            if (order.items && order.items.length > 0) {
              setSelectedHelpItem(order.items[0]);
            } else {
              navigation.navigate('GuidedSupportFlow', { orderId: order.id });
            }
          }}
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
                    First month charged now; subsequent monthly payments follow the AutoPay mandate.
                  </Text>
                )}
                <Text style={styles.itemTotal}>{formatIndianRupees(lineUnitTotal * (item.quantity ?? 1))}</Text>
                <TouchableOpacity
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                    alignSelf: 'flex-start',
                    marginTop: 8,
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 6,
                    borderWidth: 1,
                    borderColor: '#BFDBFE',
                    backgroundColor: '#EFF6FF',
                  }}
                  onPress={() => setSelectedHelpItem(item)}
                >
                  <Ionicons name="help-circle-outline" size={14} color="#2563EB" />
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#2563EB' }}>
                    Need Help?
                  </Text>
                </TouchableOpacity>
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
            <Text style={styles.summaryTotalLabel}>Grand Total</Text>
            <Text style={styles.summaryTotalValue}>{formatIndianRupees(order.finalAmount)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>
              {order.taxRate
                ? `Tax (${order.taxRate}%)${order.taxInclusive ? ' · included' : ''}`
                : 'Tax not charged'}
            </Text>
            <Text style={styles.summaryValue}>{formatIndianRupees(order.taxAmount || 0)}</Text>
          </View>
        </View>
      </View>

      {isLeaseOrder && order.rentalSubscription && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Rental AutoPay</Text>
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Rental term</Text>
              <Text style={styles.summaryValue}>{order.rentalSubscription.tenureMonths} months</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Monthly charge</Text>
              <Text style={styles.summaryValue}>{formatIndianRupees(order.rentalSubscription.monthlyAmount)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total commitment</Text>
              <Text style={styles.summaryValue}>{formatIndianRupees(order.rentalSubscription.totalCommitment)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Mandate / rental status</Text>
              <Text style={styles.summaryValue}>{order.rentalSubscription.status}</Text>
            </View>
            {order.rentalSubscription.payments?.map((payment) => (
              <View key={payment.id} style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Cycle {payment.cycleNumber ?? '—'}</Text>
                <Text style={styles.summaryValue}>
                  {formatIndianRupees(payment.amount)} · {payment.status}
                </Text>
              </View>
            ))}
            {order.rentalSubscription.status === 'TERMINATION_REQUESTED' && (
              <Text style={styles.pendingPaymentText}>Your termination request is awaiting admin review.</Text>
            )}
          </View>
        </View>
      )}

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
            Track delivery, review return eligibility, or connect with a specialist.
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
          {isLeaseOrder && order.rentalSubscription?.status === 'ACTIVE' && (
            <TouchableOpacity
              style={[styles.cancelButton, requestRentalTermination.isPending && styles.cancelButtonDisabled]}
              onPress={handleRequestRentalTermination}
              disabled={requestRentalTermination.isPending}
              activeOpacity={0.8}
            >
              {requestRentalTermination.isPending ? (
                <ActivityIndicator size="small" color="#ef4444" />
              ) : (
                <Text style={styles.cancelButtonText}>Request Rental Termination</Text>
              )}
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      )}

      {/* Return Request Modal */}
      <Modal visible={isReturnModalOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Request Return / Replacement</Text>
            <Text style={styles.modalSubtitle}>
              {supportConfig?.returnWindowDays
                ? `Submit your request within ${supportConfig.returnWindowDays} days of delivery. Our inspection team will review it.`
                : 'Return eligibility follows the current policy. Our inspection team will review your request.'}
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
            <Text style={styles.modalTitle}>Invoice</Text>
            <Text style={styles.modalSubtitle}>
              Invoice #{invoiceData?.invoiceNumber || `INV-${order.orderNumber}`}
            </Text>

            <View style={styles.invoiceBreakdown}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Base Amount</Text>
                <Text style={styles.summaryValue}>{formatIndianRupees(order.finalAmount - (order.taxAmount || 0))}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>
                  {order.taxRate
                    ? `Tax (${order.taxRate}%)${order.taxInclusive ? ' · included' : ''}`
                    : 'Tax not charged'}
                </Text>
                <Text style={styles.summaryValue}>{formatIndianRupees(order.taxAmount || 0)}</Text>
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

      {/* Item Situation Help Modal */}
      {selectedHelpItem && (
        <ItemSituationHelpModal
          visible={!!selectedHelpItem}
          onClose={() => setSelectedHelpItem(null)}
          orderId={order.id}
          orderNumber={order.orderNumber}
          orderItemId={selectedHelpItem.id}
          item={selectedHelpItem}
          order={order}
          onOpenReturn={() => setIsReturnModalOpen(true)}
          onNavigateToTicket={(prefill) => {
            navigation.navigate('GuidedSupportFlow', {
              orderId: order.id,
              orderItemId: prefill.orderItemId,
              category: prefill.category,
              subject: prefill.subject,
            } as any);
          }}
        />
      )}

      {/* Razorpay Checkout Modal */}
      <RazorpayCheckoutModal
        visible={checkoutModalVisible}
        checkoutData={checkoutData}
        onSuccess={handlePaymentSuccess}
        onFailure={handlePaymentFailure}
        onClose={() => {
          setCheckoutModalVisible(false);
          setIsRetryingPayment(false);
        }}
      />
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
  pendingPaymentCard: {
    backgroundColor: '#fffbeb',
    borderWidth: 1.5,
    borderColor: '#fde68a',
    borderRadius: 12,
    padding: 14,
    marginTop: 10,
    gap: 8,
  },
  pendingPaymentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pendingPaymentTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#92400e',
  },
  pendingPaymentText: {
    fontSize: 12,
    color: '#78350f',
    lineHeight: 17,
  },
  payNowButton: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    height: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
  },
  payNowButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  confirmingCard: {
    backgroundColor: '#eff6ff',
    borderWidth: 1.5,
    borderColor: '#bfdbfe',
    borderRadius: 12,
    padding: 14,
    marginTop: 10,
    gap: 8,
  },
  confirmingTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e3a8a',
  },
  confirmingText: {
    fontSize: 12,
    color: '#1e40af',
    lineHeight: 17,
  },
  paymentErrorCard: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
    gap: 8,
  },
  paymentErrorText: {
    fontSize: 12,
    color: '#991b1b',
    fontWeight: '600',
    lineHeight: 17,
  },
  paymentErrorRetryButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#dc2626',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  paymentErrorRetryText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
});
