import { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator, TextInput } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useCart, useUpdateCartItemQuantity, useRemoveCartItem, useClearCart, useValidateDiscount } from '../../hooks/useApi';
import { useAuth } from '../../providers/AuthProvider';
import { CartItem } from '@laptopmitra/types';
import { MainStackNavigationProp } from '../../navigation/types';

export default function CartScreen() {
  const navigation = useNavigation<MainStackNavigationProp>();
  const { isAuthenticated } = useAuth();
  const { data: cart, isLoading } = useCart();
  const updateQuantity = useUpdateCartItemQuantity();
  const removeItem = useRemoveCartItem();
  const clearCart = useClearCart();

  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);
  const [discountCode, setDiscountCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState<{
    code: string;
    discountType: string;
    discountAmount: number;
    message: string;
  } | null>(null);
  const validateDiscount = useValidateDiscount();

  const formatPrice = (price: number | string) => {
    const num = typeof price === 'string' ? parseFloat(price) : price;
    return `₹${num.toLocaleString('en-IN')}`;
  };

  const handleQuantityChange = (item: CartItem, delta: number) => {
    const newQuantity = item.quantity + delta;
    if (newQuantity < 1) {
      handleRemoveItem(item);
      return;
    }
    setUpdatingItemId(item.id);
    updateQuantity.mutate(
      { itemId: item.id, quantity: newQuantity },
      {
        onSettled: () => setUpdatingItemId(null),
      },
    );
  };

  const handleRemoveItem = (item: CartItem) => {
    Alert.alert(
      'Remove Item',
      `Remove ${item.product?.name ?? 'this item'} from cart?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => removeItem.mutate(item.id),
        },
      ],
    );
  };

  const handleClearCart = () => {
    Alert.alert(
      'Clear Cart',
      'Remove all items from your cart?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: () => clearCart.mutate(),
        },
      ],
    );
  };

  const handleApplyDiscount = () => {
    if (!discountCode.trim()) return;
    validateDiscount.mutate(
      { code: discountCode.trim(), cartTotal: subtotal },
      {
        onSuccess: (result) => {
          if (result.valid) {
            setAppliedDiscount({
              code: discountCode.trim(),
              discountType: result.discountType ?? 'fixed',
              discountAmount: result.discountAmount,
              message: result.message,
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

  // Calculate totals
  const subtotal = cart?.items?.reduce((sum, item) => {
    const price = typeof item.priceAtAdd === 'string' ? parseFloat(item.priceAtAdd) : item.priceAtAdd;
    return sum + price * item.quantity;
  }, 0) ?? 0;

  const itemCount = cart?.items?.reduce((sum, item) => sum + item.quantity, 0) ?? 0;

  if (!isAuthenticated) {
    return (
      <View style={styles.center}>
        <Ionicons name="cart-outline" size={64} color="#cbd5e1" />
        <Text style={styles.emptyTitle}>Login to view your cart</Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  const items = cart?.items ?? [];

  if (items.length === 0) {
    return (
      <View style={styles.center}>
        <Ionicons name="cart-outline" size={64} color="#cbd5e1" />
        <Text style={styles.emptyTitle}>Your cart is empty</Text>
        <Text style={styles.emptySubtitle}>Browse our store to find your next laptop</Text>
        <TouchableOpacity style={styles.browseButton} onPress={() => navigation.navigate('MainTabs')}>
          <Text style={styles.browseButtonText}>Browse Store</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const renderItem = ({ item }: { item: CartItem }) => {
    const product = item.product;
    const primaryImage = product?.images?.find((img) => img.isPrimary) ?? product?.images?.[0];
    const isUpdating = updatingItemId === item.id;

    return (
      <View style={styles.cartItem}>
        {/* Image */}
        <View style={styles.itemImage}>
          {primaryImage ? (
            <Image
              source={{ uri: primaryImage.url }}
              style={styles.image}
              contentFit="cover"
              transition={200}
            />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons name="image-outline" size={24} color="#cbd5e1" />
            </View>
          )}
        </View>

        {/* Info */}
        <View style={styles.itemInfo}>
          <Text style={styles.itemName} numberOfLines={2}>
            {product?.name ?? 'Unknown Product'}
          </Text>
          <Text style={styles.itemPrice}>{formatPrice(item.priceAtAdd)}</Text>

          {/* Quantity controls */}
          <View style={styles.quantityRow}>
            <View style={styles.quantityControls}>
              <TouchableOpacity
                style={[styles.quantityButton, isUpdating && styles.quantityButtonDisabled]}
                onPress={() => handleQuantityChange(item, -1)}
                disabled={isUpdating}
              >
                <Ionicons name="remove" size={16} color="#64748b" />
              </TouchableOpacity>
              <Text style={styles.quantityText}>{item.quantity}</Text>
              <TouchableOpacity
                style={[styles.quantityButton, isUpdating && styles.quantityButtonDisabled]}
                onPress={() => handleQuantityChange(item, 1)}
                disabled={isUpdating}
              >
                <Ionicons name="add" size={16} color="#64748b" />
              </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={() => handleRemoveItem(item)}>
              <Ionicons name="trash-outline" size={18} color="#ef4444" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Cart ({itemCount})</Text>
        <TouchableOpacity onPress={handleClearCart}>
          <Text style={styles.clearText}>Clear All</Text>
        </TouchableOpacity>
      </View>

      {/* Cart items */}
      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />

      {/* Bottom summary */}
      <View style={styles.summary}>
        {/* Discount Code */}
        {appliedDiscount ? (
          <View style={styles.appliedDiscountRow}>
            <View style={styles.appliedDiscountInfo}>
              <Ionicons name="pricetag" size={16} color="#22c55e" />
              <Text style={styles.appliedDiscountText}>{appliedDiscount.code.toUpperCase()} applied</Text>
              <Text style={styles.appliedDiscountAmount}>- {formatPrice(appliedDiscount.discountAmount)}</Text>
            </View>
            <TouchableOpacity onPress={handleRemoveDiscount}>
              <Ionicons name="close-circle" size={20} color="#ef4444" />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.discountInputRow}>
            <TextInput
              style={styles.discountInput}
              placeholder="Enter discount code"
              value={discountCode}
              onChangeText={setDiscountCode}
              autoCapitalize="characters"
              returnKeyType="done"
            />
            <TouchableOpacity
              style={[styles.applyButton, (validateDiscount.isPending || !discountCode.trim()) && styles.applyButtonDisabled]}
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

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Subtotal</Text>
          <Text style={styles.summaryValue}>{formatPrice(subtotal)}</Text>
        </View>
        {appliedDiscount && (
          <View style={styles.summaryRow}>
            <Text style={styles.discountLabel}>Discount</Text>
            <Text style={styles.discountValue}>- {formatPrice(appliedDiscount.discountAmount)}</Text>
          </View>
        )}
        {appliedDiscount && <View style={styles.summaryDivider} />}
        <View style={styles.summaryRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>
            {formatPrice(appliedDiscount ? subtotal - appliedDiscount.discountAmount : subtotal)}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.checkoutButton}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('Checkout')}
        >
          <Text style={styles.checkoutText}>Proceed to Checkout</Text>
          <Ionicons name="arrow-forward" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 24,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
  },
  clearText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#ef4444',
  },
  list: {
    padding: 16,
    gap: 12,
  },
  cartItem: {
    flexDirection: 'row',
    gap: 12,
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
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
    gap: 4,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    lineHeight: 18,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  quantityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    overflow: 'hidden',
  },
  quantityButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  quantityButtonDisabled: {
    opacity: 0.5,
  },
  quantityText: {
    width: 36,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  summary: {
    padding: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    backgroundColor: '#fff',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#64748b',
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
  },
  checkoutButton: {
    height: 52,
    borderRadius: 12,
    backgroundColor: '#2563eb',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  checkoutText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#64748b',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
  },
  browseButton: {
    marginTop: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#2563eb',
    borderRadius: 10,
  },
  browseButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  discountInputRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  discountInput: {
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
  appliedDiscountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f0fdf4',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    marginBottom: 12,
  },
  appliedDiscountInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  appliedDiscountText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#16a34a',
  },
  appliedDiscountAmount: {
    fontSize: 13,
    fontWeight: '700',
    color: '#16a34a',
  },
  discountLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#22c55e',
  },
  discountValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#22c55e',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 8,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
  },
});
