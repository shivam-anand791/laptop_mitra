import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import {
  useCart,
  useCreateOrder,
  useValidateDiscount,
  usePreviewCoupon,
  useAddresses,
  useVerifyPincode,
  useCreateRazorpayOrder,
  useVerifyRazorpayPayment,
  useCreateRazorpaySubscription,
  useVerifyRentalSubscription,
  useProfile,
} from '../../hooks/useApi';
import { Address, PincodeVerificationResult } from '@laptopmitra/types';
import { MainStackNavigationProp } from '../../navigation/types';
import RazorpayCheckoutModal, { RazorpayCheckoutData } from '../../components/RazorpayCheckoutModal';
import CouponOffersModal from '../../components/CouponOffersModal';

type PaymentMethod = 'razorpay' | 'cod';

export default function CheckoutScreen() {
  const navigation = useNavigation<MainStackNavigationProp>();
  const route = useRoute<any>();
  const initialCoupon = route.params?.initialCoupon as string | undefined;
  const { data: cart } = useCart();
  const { data: addresses } = useAddresses();
  const { data: profile } = useProfile();
  const createOrder = useCreateOrder();
  const createRazorpayOrder = useCreateRazorpayOrder();
  const verifyRazorpayPayment = useVerifyRazorpayPayment();
  const createRazorpaySubscription = useCreateRazorpaySubscription();
  const verifyRentalSubscription = useVerifyRentalSubscription();
  const validateDiscount = useValidateDiscount();
  const verifyPincode = useVerifyPincode();

  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('razorpay');
  const [discountCode, setDiscountCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState<{
    code: string;
    amount: number;
    message: string;
    type: string;
    badgeText?: string;
    allowedPaymentMethods?: string;
  } | null>(null);
  const [offersModalVisible, setOffersModalVisible] = useState(false);
  const previewCoupon = usePreviewCoupon();
  const [referralCode, setReferralCode] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pincode Verification State (Delhi NCR COD Enforcement)
  const [pincodeVerification, setPincodeVerification] = useState<PincodeVerificationResult | null>(null);
  const [isVerifyingPincode, setIsVerifyingPincode] = useState(false);
  const [pincodeError, setPincodeError] = useState<string | null>(null);

  // Razorpay Checkout Modal State
  const [checkoutModalVisible, setCheckoutModalVisible] = useState(false);
  const [checkoutData, setCheckoutData] = useState<RazorpayCheckoutData | null>(null);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);

  const items: any[] = cart?.items ?? [];
  const subtotal = items.reduce((sum: number, item: any) => {
    const price = typeof item.priceAtAdd === 'string' ? parseFloat(item.priceAtAdd) : (item.priceAtAdd as number);
    return sum + (price || 0) * (item.quantity || 1);
  }, 0);

  const discountAmount = appliedDiscount?.amount ?? 0;
  const referralDiscount = 0; // Referral discount applied server-side
  const total = Math.max(0, subtotal - discountAmount - referralDiscount);

  // Check if cart contains any rental items
  const hasLeaseItem = items.some((it: any) => it.purchaseMode === 'lease');
  const hasMixedCart = new Set(items.map((item: any) => item.purchaseMode === 'lease' ? 'lease' : 'sell')).size > 1;

  useEffect(() => {
    if (hasLeaseItem && paymentMethod === 'cod') setPaymentMethod('razorpay');
    if (hasLeaseItem) {
      setAppliedDiscount(null);
      setDiscountCode('');
      setReferralCode('');
    }
  }, [hasLeaseItem, paymentMethod]);

  // Auto-select default address
  useEffect(() => {
    if (addresses && addresses.length > 0 && !selectedAddressId) {
      const defaultAddr = addresses.find((a) => a.isDefault);
      if (defaultAddr) {
        setSelectedAddressId(defaultAddr.id);
      } else if (addresses[0]) {
        setSelectedAddressId(addresses[0].id);
      }
    }
  }, [addresses, selectedAddressId]);

  const selectedAddress = addresses?.find((a) => a.id === selectedAddressId);

  // Verify pincode and Delhi NCR eligibility when selected address changes
  useEffect(() => {
    const pin = selectedAddress?.pincode?.trim() || '';
    if (!pin || pin.length !== 6 || !/^\d{6}$/.test(pin)) {
      setPincodeVerification(null);
      setPincodeError(pin.length > 0 ? 'Please enter a valid 6-digit Indian postal PIN code.' : null);
      return;
    }

    let active = true;
    setIsVerifyingPincode(true);
    setPincodeError(null);

    verifyPincode.mutate(pin, {
      onSuccess: (res) => {
        if (!active) return;
        setIsVerifyingPincode(false);
        setPincodeVerification(res);

        if (!res.valid) {
          setPincodeError(res.message || 'Invalid postal PIN code.');
          if (paymentMethod === 'cod') setPaymentMethod('razorpay');
        } else if (!res.serviceable) {
          setPincodeError('Delivery is currently unavailable to this PIN code.');
          if (paymentMethod === 'cod') setPaymentMethod('razorpay');
        } else if (!res.isDelhiNcr && paymentMethod === 'cod') {
          // Auto-switch to prepaid for locations outside Delhi NCR
          setPaymentMethod('razorpay');
        }
      },
      onError: () => {
        if (!active) return;
        setIsVerifyingPincode(false);
        setPincodeError('Pincode service check failed. Online payment is available.');
      },
    });

    return () => {
      active = false;
    };
  }, [selectedAddressId, selectedAddress?.pincode]);

  const isDelhiNcr = !!(pincodeVerification?.valid && pincodeVerification.serviceable && pincodeVerification.isDelhiNcr);
  const codAvailable = isDelhiNcr;

  const formatPrice = (price: number) => `₹${price.toLocaleString('en-IN')}`;

  const apiItems = items.map((it: any) => ({
    productId: it.productId,
    variantId: it.variantId || undefined,
    categoryId: it.product?.categoryId || undefined,
    quantity: it.quantity || 1,
    price: Number(it.priceAtAdd || 0),
    purchaseMode: it.purchaseMode || 'sell',
    hasWarranty: it.hasWarranty,
    warrantyPrice: it.warrantyPrice,
  }));

  const applyCouponByCode = async (codeToApply: string) => {
    const clean = codeToApply.trim().toUpperCase();
    if (!clean || hasLeaseItem) return;

    try {
      const preview = await previewCoupon.mutateAsync({
        code: clean,
        items: apiItems,
        paymentMethod,
      });

      if (preview && preview.valid) {
        const allowed = preview.coupon?.allowedPaymentMethods;
        setAppliedDiscount({
          code: clean,
          amount: preview.savingsAmount,
          message: preview.message,
          type: 'coupon',
          badgeText: preview.coupon?.badgeText,
          allowedPaymentMethods: allowed,
        });
        if (allowed === 'ONLINE_ONLY' || allowed === 'PREPAID') {
          setPaymentMethod('razorpay');
        }
        setDiscountCode('');
        return;
      }
      Alert.alert('Ineligible Coupon', preview?.message || 'This coupon cannot be applied.');
    } catch (err: any) {
      try {
        const refRes = await validateDiscount.mutateAsync({
          code: clean,
          cartTotal: subtotal,
        });
        if (refRes && refRes.valid) {
          setAppliedDiscount({
            code: clean,
            amount: refRes.discountAmount,
            message: refRes.message,
            type: 'referral',
          });
          setDiscountCode('');
          return;
        }
      } catch {}
      Alert.alert('Invalid Code', err?.message || 'Invalid or expired coupon code.');
    }
  };

  const handleApplyDiscount = async () => {
    if (!discountCode.trim()) return;
    await applyCouponByCode(discountCode);
  };

  useEffect(() => {
    if (initialCoupon && !appliedDiscount && !hasLeaseItem && items.length > 0) {
      applyCouponByCode(initialCoupon);
    }
  }, [initialCoupon, hasLeaseItem, items.length]);

  const handleRemoveDiscount = () => {
    setAppliedDiscount(null);
    setDiscountCode('');
  };

  const handlePlaceOrder = async () => {
    if (hasMixedCart) {
      Alert.alert('Separate Checkout Required', 'Buy and rent items must be checked out separately. Your cart has not been changed.');
      return;
    }

    if (!selectedAddressId || !selectedAddress) {
      Alert.alert('Address Required', 'Please select a delivery address.');
      return;
    }

    if (items.length === 0) {
      Alert.alert('Empty Cart', 'Your cart is empty.');
      return;
    }

    if (pincodeError) {
      Alert.alert('Invalid Delivery Address', pincodeError);
      return;
    }

    if (paymentMethod === 'cod' && !codAvailable) {
      Alert.alert(
        'COD Unavailable Outside Delhi NCR',
        'Cash on Delivery is available exclusively within Delhi NCR. Please select Online Payment (Razorpay) to proceed.',
      );
      setPaymentMethod('razorpay');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: {
        discountCode?: string;
        referralCode?: string;
        shippingAddress?: any;
        phone?: string;
        notes?: string;
        paymentMethod?: 'razorpay' | 'cod';
        idempotencyKey?: string;
      } = {
        paymentMethod,
        idempotencyKey: `lm-mob-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        shippingAddress: {
          fullName: selectedAddress.fullName ?? '',
          phone: selectedAddress.phone ?? '',
          address: selectedAddress.address,
          city: selectedAddress.city ?? '',
          state: selectedAddress.state ?? '',
          pincode: selectedAddress.pincode ?? '',
          landmark: selectedAddress.landmark ?? '',
        },
      };

      if (appliedDiscount) {
        payload.discountCode = appliedDiscount.code;
      }
      if (referralCode.trim().length > 0) {
        payload.referralCode = referralCode.trim();
      }
      if (selectedAddress.phone) {
        payload.phone = selectedAddress.phone;
      }
      if (notes.trim().length > 0) {
        payload.notes = notes.trim();
      }

      // Step 1: Create backend order
      const order = await createOrder.mutateAsync(payload);
      setActiveOrderId(order.id);

      // Step 2: Handle payment method flow
      if (paymentMethod === 'cod') {
        setIsSubmitting(false);
        navigation.navigate('OrderDetail', { orderId: order.id });
        Alert.alert('Order Placed!', `Order #${order.orderNumber || order.id.slice(-8)} has been placed successfully.`);
        return;
      }

      // Step 3: Initialize the provider flow for the order type.
      try {
        const customerName = selectedAddress.fullName || profile?.name || 'Valued Customer';
        const customerEmail = profile?.email || '';
        const customerPhone = selectedAddress.phone || profile?.phone || '';
        if (hasLeaseItem) {
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

        setIsSubmitting(false);
        setCheckoutModalVisible(true);
      } catch (err: any) {
        setIsSubmitting(false);
        Alert.alert(
          'Payment Gateway Error',
          err.message || 'Could not initiate Razorpay checkout. Your order is pending in your order history.',
          [
            {
              text: 'View Order',
              onPress: () => navigation.navigate('OrderDetail', { orderId: order.id }),
            },
            { text: 'OK' },
          ],
        );
      }
    } catch (error: any) {
      setIsSubmitting(false);
      Alert.alert('Order Failed', error.message || 'Failed to place order. Please try again.');
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
    setIsSubmitting(true);

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
      setIsSubmitting(false);
      navigation.navigate('OrderDetail', { orderId: result.orderId });
      Alert.alert('Payment Successful!', 'Your payment has been verified and your order is confirmed.');
    } catch (err: any) {
      setIsSubmitting(false);
      // Backend status is authoritative
      navigation.navigate('OrderDetail', { orderId: result.orderId });
      Alert.alert(
        'Payment Under Verification',
        err.message || 'We received your payment details. Order confirmation will update shortly.',
      );
    }
  };

  const handlePaymentFailure = (error: { code?: string | number; description?: string }) => {
    setCheckoutModalVisible(false);
    Alert.alert(
      'Payment Not Completed',
      `${error.description || 'The payment attempt was not completed.'} Your order items remain reserved. You can retry payment anytime.`,
      [
        {
          text: 'Retry Payment',
          onPress: () => setCheckoutModalVisible(true),
        },
        {
          text: 'View Order',
          onPress: () => {
            if (activeOrderId) navigation.navigate('OrderDetail', { orderId: activeOrderId });
          },
        },
      ],
    );
  };

  const handlePaymentClose = () => {
    setCheckoutModalVisible(false);
    if (activeOrderId) {
      Alert.alert(
        'Checkout Paused',
        'Your order has been created and your items are reserved for 15 minutes. You can complete your payment from Order Details.',
        [
          {
            text: 'View Order',
            onPress: () => navigation.navigate('OrderDetail', { orderId: activeOrderId }),
          },
          { text: 'Keep Here', style: 'cancel' },
        ],
      );
    }
  };

  const renderAddressItem = (address: Address) => (
    <TouchableOpacity
      key={address.id}
      style={[styles.addressCard, selectedAddressId === address.id && styles.addressCardSelected]}
      onPress={() => setSelectedAddressId(address.id)}
    >
      <View style={styles.addressRadio}>
        <View style={[styles.radioOuter, selectedAddressId === address.id && styles.radioOuterSelected]}>
          {selectedAddressId === address.id && <View style={styles.radioInner} />}
        </View>
      </View>
      <View style={styles.addressInfo}>
        <Text style={styles.addressName}>{address.fullName || 'No name'}</Text>
        <Text style={styles.addressText}>{address.address}</Text>
        {address.city && address.state && (
          <Text style={styles.addressText}>
            {address.city}, {address.state} {address.pincode}
          </Text>
        )}
        {address.phone && <Text style={styles.addressPhone}>{address.phone}</Text>}
      </View>
    </TouchableOpacity>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Shipping Address */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Shipping Address</Text>
          {addresses && addresses.length > 0 ? (
            addresses.map(renderAddressItem)
          ) : (
            <TouchableOpacity
              style={styles.addAddressButton}
              onPress={() => navigation.navigate('AddAddress', {})}
            >
              <Ionicons name="add-circle-outline" size={20} color="#2563eb" />
              <Text style={styles.addAddressText}>Add New Address</Text>
            </TouchableOpacity>
          )}

          {/* Delivery Region & Serviceability Badge */}
          {selectedAddress && (
            <View style={styles.pincodeStatusContainer}>
              {isVerifyingPincode ? (
                <View style={styles.pincodeVerifyingRow}>
                  <ActivityIndicator size="small" color="#2563eb" />
                  <Text style={styles.pincodeVerifyingText}>Checking pincode delivery coverage...</Text>
                </View>
              ) : pincodeError ? (
                <View style={styles.pincodeErrorRow}>
                  <Ionicons name="alert-circle" size={16} color="#ef4444" />
                  <Text style={styles.pincodeErrorText}>{pincodeError}</Text>
                </View>
              ) : pincodeVerification ? (
                <View style={styles.pincodeSuccessRow}>
                  <Ionicons
                    name={isDelhiNcr ? 'checkmark-circle' : 'information-circle'}
                    size={16}
                    color={isDelhiNcr ? '#16a34a' : '#0284c7'}
                  />
                  <Text style={styles.pincodeSuccessText}>
                    {isDelhiNcr
                      ? 'Delhi NCR: COD and Razorpay Prepaid available'
                      : 'Outside Delhi NCR: Prepaid via Razorpay only'}
                  </Text>
                </View>
              ) : null}
            </View>
          )}
        </View>

        {/* Rental Subscription Details (AutoPay) */}
        {hasLeaseItem && (
          <View style={styles.rentalNoticeCard}>
            <View style={styles.rentalNoticeHeader}>
              <Ionicons name="repeat" size={18} color="#2563eb" />
              <Text style={styles.rentalNoticeTitle}>Rental AutoPay Subscription</Text>
            </View>
            <Text style={styles.rentalNoticeBody}>
              • First month&apos;s rent is collected today at checkout.{'\n'}
              • No security deposit required (₹0 deposit).{'\n'}
              • Subsequent monthly rental will be charged via Razorpay AutoPay mandate.{'\n'}
              • Cancel anytime with hassle-free device return.
            </Text>
          </View>
        )}

        {/* Payment Method */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Method</Text>

          {/* Razorpay Online Payment */}
          <TouchableOpacity
            style={[styles.paymentOption, paymentMethod === 'razorpay' && styles.paymentOptionSelected]}
            onPress={() => setPaymentMethod('razorpay')}
          >
            <View style={styles.paymentRadio}>
              <View style={[styles.radioOuter, paymentMethod === 'razorpay' && styles.radioOuterSelected]}>
                {paymentMethod === 'razorpay' && <View style={styles.radioInner} />}
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.paymentLabel}>Online Payment</Text>
                <View style={styles.secureBadge}>
                  <Ionicons name="shield-checkmark" size={12} color="#16a34a" />
                  <Text style={styles.secureBadgeText}>Razorpay Secure</Text>
                </View>
              </View>
              <Text style={styles.paymentSubtext}>
                {hasLeaseItem
                  ? 'First Month Rent + AutoPay Mandate (UPI, Cards, Netbanking)'
                  : 'UPI, Debit/Credit Card, Netbanking'}
              </Text>
            </View>
          </TouchableOpacity>

          {!hasLeaseItem && (() => {
            const isCouponOnlineOnly = appliedDiscount?.allowedPaymentMethods === 'ONLINE_ONLY' || appliedDiscount?.allowedPaymentMethods === 'PREPAID';
            const isCodAllowed = codAvailable && !isCouponOnlineOnly;

            return (
              <TouchableOpacity
                style={[
                  styles.paymentOption,
                  paymentMethod === 'cod' && styles.paymentOptionSelected,
                  !isCodAllowed && styles.paymentOptionDisabled,
                ]}
                onPress={() => {
                  if (isCouponOnlineOnly) {
                    Alert.alert(
                      'Prepaid Only Coupon',
                      `Coupon ${appliedDiscount.code} is valid on online prepaid payments only. Remove the coupon to select Cash on Delivery.`
                    );
                    return;
                  }
                  if (!codAvailable) {
                    Alert.alert(
                      'COD Unavailable Outside Delhi NCR',
                      'Cash on Delivery is available exclusively within Delhi NCR. For deliveries outside Delhi NCR, please select Online Payment (Razorpay).',
                    );
                    return;
                  }
                  setPaymentMethod('cod');
                }}
              >
            <View style={styles.paymentRadio}>
              <View
                style={[
                  styles.radioOuter,
                  paymentMethod === 'cod' && styles.radioOuterSelected,
                  !codAvailable && styles.radioOuterDisabled,
                ]}
              >
                {paymentMethod === 'cod' && <View style={styles.radioInner} />}
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[styles.paymentLabel, !codAvailable && styles.paymentLabelDisabled]}>
                  Cash on Delivery
                </Text>
                <View style={codAvailable ? styles.ncrBadge : styles.disabledBadge}>
                  <Text style={codAvailable ? styles.ncrBadgeText : styles.disabledBadgeText}>
                    {codAvailable ? 'Delhi NCR' : 'Delhi NCR Only'}
                  </Text>
                </View>
              </View>
              <Text style={styles.paymentSubtext}>
                {isCouponOnlineOnly
                  ? `Coupon ${appliedDiscount.code} requires prepaid payment`
                  : codAvailable
                  ? 'Pay cash upon receiving your order at your doorstep'
                  : 'Unavailable for this pincode. Please select Online Payment.'}
              </Text>
            </View>
          </TouchableOpacity>
            );
          })()}
        </View>

        {/* Discount & Referral Codes */}
        {!hasLeaseItem && <View style={styles.section}>
          <Text style={styles.sectionTitle}>Discount Code</Text>
          {appliedDiscount ? (
            <View style={styles.appliedRow}>
              <View style={styles.appliedInfo}>
                <Ionicons name="pricetag" size={16} color="#22c55e" />
                <Text style={styles.appliedText}>{appliedDiscount.code.toUpperCase()} applied</Text>
                {appliedDiscount.badgeText && (
                  <View style={{ backgroundColor: '#dcfce7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                    <Text style={{ fontSize: 9, fontWeight: '800', color: '#15803d' }}>{appliedDiscount.badgeText}</Text>
                  </View>
                )}
                <Text style={styles.appliedAmount}>- {formatPrice(appliedDiscount.amount)}</Text>
              </View>
              <TouchableOpacity onPress={handleRemoveDiscount}>
                <Ionicons name="close-circle" size={20} color="#ef4444" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ gap: 8 }}>
              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: 10,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderStyle: 'dashed',
                  borderColor: '#93c5fd',
                  backgroundColor: '#eff6ff',
                }}
                onPress={() => setOffersModalVisible(true)}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="sparkles" size={16} color="#2563eb" />
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#1d4ed8' }}>View Available Offers &amp; Coupons</Text>
                </View>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#2563eb' }}>Select →</Text>
              </TouchableOpacity>

              <View style={styles.inputRow}>
                <TextInput
                  style={styles.codeInput}
                  placeholder="Enter code"
                  value={discountCode}
                  onChangeText={setDiscountCode}
                  autoCapitalize="characters"
                  returnKeyType="done"
                />
                <TouchableOpacity
                  style={[styles.applyButton, (previewCoupon.isPending || validateDiscount.isPending) && styles.applyButtonDisabled]}
                  onPress={handleApplyDiscount}
                  disabled={previewCoupon.isPending || validateDiscount.isPending || !discountCode.trim()}
                >
                  {previewCoupon.isPending || validateDiscount.isPending ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.applyButtonText}>Apply</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}

          <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Referral Code</Text>
          <TextInput
            style={styles.codeInputFull}
            placeholder="Enter referral code (optional)"
            value={referralCode}
            onChangeText={setReferralCode}
            autoCapitalize="characters"
            returnKeyType="done"
          />
        </View>}

        {/* Notes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Notes (optional)</Text>
          <TextInput
            style={styles.notesInput}
            placeholder="Any special instructions..."
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        {/* Order Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Summary</Text>
          {items.map((item) => (
            <View key={item.id} style={styles.summaryItem}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={styles.summaryItemName} numberOfLines={1}>
                  {item.product?.name ?? 'Product'} × {item.quantity}
                </Text>
                {item.purchaseMode === 'lease' && (
                  <Text style={styles.summaryItemBadge}>Rental Plan (Monthly)</Text>
                )}
              </View>
              <Text style={styles.summaryItemPrice}>
                {formatPrice(
                  (typeof item.priceAtAdd === 'string' ? parseFloat(item.priceAtAdd) : item.priceAtAdd) *
                    item.quantity,
                )}
              </Text>
            </View>
          ))}
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>{formatPrice(subtotal)}</Text>
          </View>
          {appliedDiscount && (
            <View style={styles.summaryRow}>
              <Text style={styles.discountLabel}>Discount</Text>
              <Text style={styles.discountValue}>- {formatPrice(discountAmount)}</Text>
            </View>
          )}
          {hasLeaseItem && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Security Deposit</Text>
              <Text style={[styles.summaryValue, { color: '#16a34a' }]}>₹0 (Zero Deposit)</Text>
            </View>
          )}
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <Text style={styles.totalLabel}>{hasLeaseItem ? 'First month payment' : 'Estimated total'}</Text>
            {!hasLeaseItem && <Text style={styles.totalValue}>{formatPrice(total)}</Text>}
          </View>
          <Text style={{ color: '#64748b', fontSize: 11 }}>
            Applicable tax is calculated by the server before payment.
          </Text>

          {/* Legal and Buyback Links */}
          <View style={{ marginTop: 14, paddingHorizontal: 4 }}>
            <Text style={{ fontSize: 11, color: '#64748b', textAlign: 'center', lineHeight: 16 }}>
              By placing this order, you agree to LaptopMitra&apos;s{' '}
              <Text
                style={{ color: '#2563eb', fontWeight: '700' }}
                onPress={() => navigation.navigate('Terms')}
              >
                Terms
              </Text>
              ,{' '}
              <Text
                style={{ color: '#2563eb', fontWeight: '700' }}
                onPress={() => navigation.navigate('Privacy')}
              >
                Privacy Policy
              </Text>
              , and{' '}
              <Text
                style={{ color: '#0284c7', fontWeight: '700' }}
                onPress={() => navigation.navigate('BuybackGuarantee')}
              >
                36-Month Buyback Guarantee
              </Text>
              .
            </Text>
          </View>
        </View>
      </ScrollView>

      <CouponOffersModal
        visible={offersModalVisible}
        onClose={() => setOffersModalVisible(false)}
        items={apiItems}
        paymentMethod={paymentMethod}
        appliedCode={appliedDiscount?.code ?? null}
        onApplyCoupon={(code, preview) => {
          const allowed = preview.coupon?.allowedPaymentMethods;
          setAppliedDiscount({
            code,
            amount: preview.savingsAmount,
            message: preview.message,
            type: 'coupon',
            badgeText: preview.coupon?.badgeText,
            allowedPaymentMethods: allowed,
          });
          if (allowed === 'ONLINE_ONLY' || allowed === 'PREPAID') {
            setPaymentMethod('razorpay');
          }
          setDiscountCode('');
        }}
      />

      {/* Place Order Button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.placeOrderButton, (isSubmitting || hasMixedCart) && styles.placeOrderButtonDisabled]}
          onPress={handlePlaceOrder}
          disabled={isSubmitting || hasMixedCart}
          activeOpacity={0.8}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Text style={styles.placeOrderText}>
                {hasLeaseItem
                  ? 'Continue to AutoPay Setup'
                  : paymentMethod === 'razorpay' ? 'Continue to Payment' : 'Place Order'}
              </Text>
              {!hasLeaseItem && <Text style={styles.placeOrderTotal}>{formatPrice(total)}</Text>}
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Razorpay Secure Checkout Modal */}
      <RazorpayCheckoutModal
        visible={checkoutModalVisible}
        checkoutData={checkoutData}
        onSuccess={handlePaymentSuccess}
        onFailure={handlePaymentFailure}
        onClose={handlePaymentClose}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 12,
  },
  addressCard: {
    flexDirection: 'row',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    marginBottom: 8,
    gap: 12,
  },
  addressCardSelected: {
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
  },
  addressRadio: {
    paddingTop: 2,
  },
  addressInfo: {
    flex: 1,
    gap: 2,
  },
  addressName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
  },
  addressText: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
  },
  addressPhone: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  addAddressButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#2563eb',
    borderStyle: 'dashed',
    gap: 8,
  },
  addAddressText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563eb',
  },
  pincodeStatusContainer: {
    marginTop: 6,
    paddingHorizontal: 4,
  },
  pincodeVerifyingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pincodeVerifyingText: {
    fontSize: 12,
    color: '#64748b',
  },
  pincodeErrorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pincodeErrorText: {
    fontSize: 12,
    color: '#ef4444',
    fontWeight: '500',
  },
  pincodeSuccessRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pincodeSuccessText: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '500',
  },
  rentalNoticeCard: {
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#bae6fd',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    gap: 6,
  },
  rentalNoticeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rentalNoticeTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0369a1',
  },
  rentalNoticeBody: {
    fontSize: 12,
    color: '#0c4a6e',
    lineHeight: 18,
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    marginBottom: 8,
    gap: 12,
  },
  paymentOptionSelected: {
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
  },
  paymentOptionDisabled: {
    opacity: 0.6,
    backgroundColor: '#f8fafc',
  },
  paymentRadio: {
    paddingTop: 2,
  },
  paymentLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
  },
  paymentLabelDisabled: {
    color: '#94a3b8',
  },
  paymentSubtext: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioOuterSelected: {
    borderColor: '#2563eb',
  },
  radioOuterDisabled: {
    borderColor: '#e2e8f0',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#2563eb',
  },
  secureBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#dcfce7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  secureBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#15803d',
  },
  ncrBadge: {
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  ncrBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0369a1',
  },
  disabledBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  disabledBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  codeInput: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 14,
    color: '#1e293b',
    backgroundColor: '#f8fafc',
  },
  codeInputFull: {
    height: 44,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 14,
    color: '#1e293b',
    backgroundColor: '#f8fafc',
  },
  applyButton: {
    height: 44,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  applyButtonDisabled: {
    backgroundColor: '#93c5fd',
  },
  applyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  appliedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f0fdf4',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  appliedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  appliedText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#16a34a',
  },
  appliedAmount: {
    fontSize: 13,
    fontWeight: '700',
    color: '#16a34a',
  },
  notesInput: {
    height: 80,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingTop: 12,
    fontSize: 14,
    color: '#1e293b',
    backgroundColor: '#f8fafc',
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryItemName: {
    fontSize: 13,
    color: '#64748b',
  },
  summaryItemBadge: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0284c7',
    marginTop: 2,
  },
  summaryItemPrice: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e293b',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  discountLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#22c55e',
  },
  discountValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#22c55e',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  bottomBar: {
    padding: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    backgroundColor: '#fff',
  },
  placeOrderButton: {
    height: 52,
    borderRadius: 12,
    backgroundColor: '#2563eb',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  placeOrderButtonDisabled: {
    backgroundColor: '#93c5fd',
  },
  placeOrderText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  placeOrderTotal: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    opacity: 0.9,
  },
});
