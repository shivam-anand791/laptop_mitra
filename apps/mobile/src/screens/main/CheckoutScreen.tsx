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
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useCart, useCreateOrder, useValidateDiscount, useAddresses } from '../../hooks/useApi';
import { Address } from '@laptopmitra/types';
import { MainStackNavigationProp } from '../../navigation/types';

type PaymentMethod = 'razorpay' | 'cod';

export default function CheckoutScreen() {
  const navigation = useNavigation<MainStackNavigationProp>();
  const { data: cart } = useCart();
  const { data: addresses } = useAddresses();
  const createOrder = useCreateOrder();
  const validateDiscount = useValidateDiscount();

  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cod');
  const [discountCode, setDiscountCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState<{
    code: string;
    amount: number;
    message: string;
    type: string;
  } | null>(null);
  const [referralCode, setReferralCode] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const items = cart?.items ?? [];
  const subtotal = items.reduce((sum, item) => {
    const price = typeof item.priceAtAdd === 'string' ? parseFloat(item.priceAtAdd) : (item.priceAtAdd as number);
    return sum + price * item.quantity;
  }, 0);

  const discountAmount = appliedDiscount?.amount ?? 0;
  const referralDiscount = 0; // Referral discount applied server-side
  const total = subtotal - discountAmount - referralDiscount;

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

  const formatPrice = (price: number) => `₹${price.toLocaleString('en-IN')}`;

  const handleApplyDiscount = () => {
    if (!discountCode.trim()) return;
    validateDiscount.mutate(
      { code: discountCode.trim(), cartTotal: subtotal },
      {
        onSuccess: (result) => {
          if (result.valid) {
            setAppliedDiscount({
              code: discountCode.trim(),
              amount: result.discountAmount,
              message: result.message,
              type: result.discountType ?? 'fixed',
            });
          } else {
            Alert.alert('Invalid Code', result.message);
          }
        },
        onError: (err) => Alert.alert('Error', err.message),
      },
    );
  };

  const handleRemoveDiscount = () => {
    setAppliedDiscount(null);
    setDiscountCode('');
  };

  const handlePlaceOrder = async () => {
    if (!selectedAddressId) {
      Alert.alert('Address Required', 'Please select a shipping address.');
      return;
    }

    if (items.length === 0) {
      Alert.alert('Empty Cart', 'Your cart is empty.');
      return;
    }

    const selectedAddress = addresses?.find((a) => a.id === selectedAddressId);
    if (!selectedAddress) return;

    setIsSubmitting(true);

    try {
      // In sandbox mode, we skip Razorpay and just create the order with COD
      // For Razorpay integration, you would use the razorpay-react-native SDK
      const payload: {
        discountCode?: string;
        referralCode?: string;
        shippingAddress?: any;
        phone?: string;
        notes?: string;
      } = {
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

      const order = await createOrder.mutateAsync(payload);

      // Navigate to order detail
      navigation.navigate('OrderDetail', { orderId: order.id });

      Alert.alert('Order Placed!', `Order #${order.orderNumber} has been placed successfully.`);
    } catch (error: any) {
      Alert.alert('Order Failed', error.message || 'Failed to place order. Please try again.');
    } finally {
      setIsSubmitting(false);
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
        </View>

        {/* Payment Method */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Method</Text>
          <TouchableOpacity
            style={[styles.paymentOption, paymentMethod === 'cod' && styles.paymentOptionSelected]}
            onPress={() => setPaymentMethod('cod')}
          >
            <View style={styles.paymentRadio}>
              <View style={[styles.radioOuter, paymentMethod === 'cod' && styles.radioOuterSelected]}>
                {paymentMethod === 'cod' && <View style={styles.radioInner} />}
              </View>
            </View>
            <View>
              <Text style={styles.paymentLabel}>Cash on Delivery</Text>
              <Text style={styles.paymentSubtext}>Pay when you receive</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.paymentOption, paymentMethod === 'razorpay' && styles.paymentOptionSelected]}
            onPress={() => setPaymentMethod('razorpay')}
          >
            <View style={styles.paymentRadio}>
              <View style={[styles.radioOuter, paymentMethod === 'razorpay' && styles.radioOuterSelected]}>
                {paymentMethod === 'razorpay' && <View style={styles.radioInner} />}
              </View>
            </View>
            <View>
              <Text style={styles.paymentLabel}>Razorpay</Text>
              <Text style={styles.paymentSubtext}>Credit/Debit Card, UPI, Netbanking</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Discount & Referral Codes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Discount Code</Text>
          {appliedDiscount ? (
            <View style={styles.appliedRow}>
              <View style={styles.appliedInfo}>
                <Ionicons name="pricetag" size={16} color="#22c55e" />
                <Text style={styles.appliedText}>{appliedDiscount.code.toUpperCase()} applied</Text>
                <Text style={styles.appliedAmount}>- {formatPrice(appliedDiscount.amount)}</Text>
              </View>
              <TouchableOpacity onPress={handleRemoveDiscount}>
                <Ionicons name="close-circle" size={20} color="#ef4444" />
              </TouchableOpacity>
            </View>
          ) : (
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
                style={[styles.applyButton, validateDiscount.isPending && styles.applyButtonDisabled]}
                onPress={handleApplyDiscount}
                disabled={validateDiscount.isPending || !discountCode.trim()}
              >
                {validateDiscount.isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.applyButtonText}>Apply</Text>
                )}
              </TouchableOpacity>
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
        </View>

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
              <Text style={styles.summaryItemName} numberOfLines={1}>
                {item.product?.name ?? 'Product'} × {item.quantity}
              </Text>
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
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{formatPrice(total)}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Place Order Button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.placeOrderButton, isSubmitting && styles.placeOrderButtonDisabled]}
          onPress={handlePlaceOrder}
          disabled={isSubmitting}
          activeOpacity={0.8}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Text style={styles.placeOrderText}>Place Order</Text>
              <Text style={styles.placeOrderTotal}>{formatPrice(total)}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
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
  paymentRadio: {
    paddingTop: 2,
  },
  paymentLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
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
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#2563eb',
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
    flex: 1,
    marginRight: 12,
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
