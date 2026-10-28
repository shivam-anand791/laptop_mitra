import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import {
  useCart,
  useUpdateCartItemQuantity,
  useUpdateCartItem,
  useRemoveCartItem,
  useClearCart,
  useValidateDiscount,
} from '../../hooks/useApi';
import { useAuth } from '../../providers/AuthProvider';
import { CartItem } from '@laptopmitra/types';
import { MainStackNavigationProp } from '../../navigation/types';
import Button from '../../components/ui/Button';
import { colors, radius, shadows, spacing, typography } from '../../theme/tokens';

export default function CartScreen() {
  const navigation = useNavigation<MainStackNavigationProp>();
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useAuth();
  const { data: cart, isLoading } = useCart();
  const updateQuantity = useUpdateCartItemQuantity();
  const updateCartItem = useUpdateCartItem();
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
    return `₹${Math.round(num).toLocaleString('en-IN')}`;
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

  const handleToggleWarranty = (item: CartItem) => {
    if (item.purchaseMode === 'lease') return;
    setUpdatingItemId(item.id);
    updateCartItem.mutate(
      {
        itemId: item.id,
        hasWarranty: !item.hasWarranty,
      },
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
            Alert.alert('Invalid Promo Code', result.message || 'The code entered is invalid or expired.');
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

  const items = cart?.items ?? [];

  // Calculate Option A Commercial Totals
  const oneTimeTotal = items
    .filter((it: CartItem) => it.purchaseMode !== 'lease')
    .reduce((sum: number, it: CartItem) => {
      const p = typeof it.priceAtAdd === 'string' ? parseFloat(it.priceAtAdd) : (it.priceAtAdd || 0);
      const w = it.hasWarranty ? (typeof it.warrantyPrice === 'string' ? parseFloat(it.warrantyPrice) : (it.warrantyPrice || 1999)) : 0;
      return sum + (p + w) * (it.quantity || 1);
    }, 0);

  const monthlyTotal = items
    .filter((it: CartItem) => it.purchaseMode === 'lease')
    .reduce((sum: number, it: CartItem) => {
      const p = typeof it.priceAtAdd === 'string' ? parseFloat(it.priceAtAdd) : (it.priceAtAdd || 0);
      return sum + p * (it.quantity || 1);
    }, 0);

  const subtotal = oneTimeTotal + monthlyTotal;

  const itemCount =
    cart?.itemCount ??
    items.reduce((sum: number, item: CartItem) => sum + (item.quantity || 1), 0);

  const finalAmount = appliedDiscount ? Math.max(0, subtotal - appliedDiscount.discountAmount) : subtotal;

  if (!isAuthenticated) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <View style={styles.emptyIconCircle}>
          <Ionicons name="lock-closed-outline" size={40} color={colors.primary} />
        </View>
        <Text style={styles.emptyTitle}>Login to View Your Cart</Text>
        <Text style={styles.emptySubtitle}>
          Sign in to access your saved items, discounts, and checkout securely.
        </Text>
        <Button
          title="Login / Register"
          onPress={() => navigation.navigate('MainTabs')}
          variant="primary"
          size="md"
          style={{ marginTop: spacing.md }}
        />
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading your cart...</Text>
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <View style={styles.emptyIconCircle}>
          <Ionicons name="cart-outline" size={44} color={colors.primary} />
        </View>
        <Text style={styles.emptyTitle}>Your Cart is Empty</Text>
        <Text style={styles.emptySubtitle}>
          Discover certified enterprise laptops with 1-year warranty and high discounts.
        </Text>
        <Button
          title="Explore Laptops"
          onPress={() => navigation.navigate('MainTabs')}
          variant="primary"
          size="md"
          style={{ marginTop: spacing.md }}
        />
      </View>
    );
  }

  const renderItem = ({ item }: { item: CartItem }) => {
    const product = item.product;
    const primaryImage = product?.images?.find((img) => img.isPrimary) ?? product?.images?.[0];
    const isUpdating = updatingItemId === item.id;
    const meta = product?.metadata || {};
    const specs = [meta.ram, meta.storage].filter(Boolean).join(' • ');
    const isLease = item.purchaseMode === 'lease';
    const itemUnitPrice = typeof item.priceAtAdd === 'string' ? parseFloat(item.priceAtAdd) : (item.priceAtAdd || 0);
    const warrantyCost = item.hasWarranty && !isLease ? (typeof item.warrantyPrice === 'string' ? parseFloat(item.warrantyPrice) : (item.warrantyPrice || 1999)) : 0;
    const totalLinePrice = (itemUnitPrice + warrantyCost) * item.quantity;

    return (
      <View style={styles.cartCard}>
        {/* Thumbnail */}
        <View style={styles.imageWrap}>
          {primaryImage ? (
            <Image
              source={{ uri: primaryImage.url }}
              style={styles.image}
              contentFit="contain"
              transition={200}
            />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons name="laptop-outline" size={28} color={colors.textMuted} />
            </View>
          )}
        </View>

        {/* Info */}
        <View style={styles.cardInfo}>
          {/* Mode & Config Badges */}
          <View style={styles.itemBadgeRow}>
            <View style={[styles.modeBadge, isLease ? styles.modeBadgeLease : styles.modeBadgeBuy]}>
              <Text style={[styles.modeBadgeText, isLease ? styles.modeBadgeTextLease : styles.modeBadgeTextBuy]}>
                {isLease ? 'Rent / mo' : 'Buy'}
              </Text>
            </View>
            {item.configuration === 'ram-16gb' && (
              <View style={styles.configBadge}>
                <Text style={styles.configBadgeText}>16GB RAM</Text>
              </View>
            )}
          </View>

          <Text style={styles.itemName} numberOfLines={2}>
            {product?.name ?? 'Laptop Item'}
          </Text>

          {specs ? (
            <Text style={styles.itemSpecs} numberOfLines={1}>
              {specs}
            </Text>
          ) : null}

          {/* Pricing */}
          <View style={styles.cardPriceRow}>
            <Text style={styles.itemPrice}>
              {formatPrice(itemUnitPrice)}
              {isLease && <Text style={styles.perMoNote}> / mo</Text>}
            </Text>
            {item.quantity > 1 && (
              <Text style={styles.subtotalText}>
                Total: {formatPrice(totalLinePrice)}
              </Text>
            )}
          </View>

          {/* Lease Option A Notice */}
          {isLease ? (
            <Text style={styles.leaseNoticeText}>
              Month 1 advance, {formatPrice(itemUnitPrice)}/mo thereafter. Later months are invoiced separately.
            </Text>
          ) : (
            /* Warranty Toggle for Buy */
            <TouchableOpacity
              style={styles.warrantyToggleRow}
              onPress={() => handleToggleWarranty(item)}
              activeOpacity={0.8}
            >
              <Ionicons
                name={item.hasWarranty ? 'checkbox' : 'square-outline'}
                size={16}
                color={item.hasWarranty ? colors.primary : colors.textMuted}
              />
              <Text style={styles.warrantyToggleText}>
                +1-Year Warranty ({formatPrice(item.warrantyPrice || 1999)})
              </Text>
            </TouchableOpacity>
          )}

          {/* Stepper and Delete */}
          <View style={styles.cardActionsRow}>
            <View style={styles.stepper}>
              <TouchableOpacity
                style={[styles.stepperBtn, isUpdating && styles.btnDisabled]}
                onPress={() => handleQuantityChange(item, -1)}
                disabled={isUpdating}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Ionicons name="remove" size={14} color={colors.navy} />
              </TouchableOpacity>
              <Text style={styles.stepperCount}>{item.quantity}</Text>
              <TouchableOpacity
                style={[styles.stepperBtn, isUpdating && styles.btnDisabled]}
                onPress={() => handleQuantityChange(item, 1)}
                disabled={isUpdating}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Ionicons name="add" size={14} color={colors.navy} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={() => handleRemoveItem(item)}
              style={styles.deleteBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="trash-outline" size={18} color={colors.danger} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 12) }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>Shopping Cart</Text>
          <View style={styles.countPill}>
            <Text style={styles.countPillText}>{itemCount}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={handleClearCart} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.clearText}>Clear All</Text>
        </TouchableOpacity>
      </View>

      {/* Cart items list */}
      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: Math.max(insets.bottom + 180, 200) },
        ]}
        showsVerticalScrollIndicator={false}
        ListFooterComponent={
          <View style={styles.footerSection}>
            {/* Promo / Discount code section */}
            <View style={styles.promoCard}>
              <Text style={styles.promoCardTitle}>Have a Coupon or Referral Code?</Text>
              {appliedDiscount ? (
                <View style={styles.appliedPromoPill}>
                  <View style={styles.appliedPromoLeft}>
                    <Ionicons name="checkmark-circle" size={16} color={colors.green} />
                    <Text style={styles.appliedPromoCode}>{appliedDiscount.code.toUpperCase()}</Text>
                    <Text style={styles.appliedPromoAmount}>
                      (-{formatPrice(appliedDiscount.discountAmount)})
                    </Text>
                  </View>
                  <TouchableOpacity onPress={handleRemoveDiscount} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                    <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.promoInputRow}>
                  <TextInput
                    style={styles.promoInput}
                    placeholder="e.g. MITRA500"
                    placeholderTextColor={colors.textMuted}
                    value={discountCode}
                    onChangeText={setDiscountCode}
                    autoCapitalize="characters"
                    returnKeyType="done"
                  />
                  <Button
                    title="Apply"
                    onPress={handleApplyDiscount}
                    variant="navy"
                    size="sm"
                    loading={validateDiscount.isPending}
                    disabled={!discountCode.trim()}
                  />
                </View>
              )}
            </View>

            {/* Price Breakdown Card */}
            <View style={styles.breakdownCard}>
              <Text style={styles.breakdownTitle}>Order Summary</Text>

              {oneTimeTotal > 0 && (
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Direct Purchases</Text>
                  <Text style={styles.breakdownValue}>{formatPrice(oneTimeTotal)}</Text>
                </View>
              )}

              {monthlyTotal > 0 && (
                <View style={styles.breakdownRow}>
                  <View>
                    <Text style={styles.breakdownLabel}>Month 1 Advance Rentals</Text>
                    <Text style={styles.breakdownSubLabel}>(Later months billed separately)</Text>
                  </View>
                  <Text style={styles.breakdownValue}>{formatPrice(monthlyTotal)}</Text>
                </View>
              )}

              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Subtotal Due Now</Text>
                <Text style={styles.breakdownValue}>{formatPrice(subtotal)}</Text>
              </View>

              {appliedDiscount && (
                <View style={styles.breakdownRow}>
                  <Text style={styles.discountLabel}>Coupon Discount</Text>
                  <Text style={styles.discountValue}>- {formatPrice(appliedDiscount.discountAmount)}</Text>
                </View>
              )}

              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Shipping</Text>
                <Text style={styles.freeShippingBadge}>FREE</Text>
              </View>

              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Estimated GST (18%)</Text>
                <Text style={styles.includedLabel}>Included</Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total Due Now</Text>
                <Text style={styles.totalValue}>{formatPrice(finalAmount)}</Text>
              </View>
            </View>
          </View>
        }
      />

      {/* Sticky Bottom Bar */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <View style={styles.bottomPriceWrap}>
          <Text style={styles.bottomPriceLabel}>Total Amount</Text>
          <Text style={styles.bottomPriceValue}>{formatPrice(finalAmount)}</Text>
        </View>
        <Button
          title="Proceed to Checkout"
          onPress={() => navigation.navigate('Checkout')}
          variant="primary"
          size="lg"
          icon={<Ionicons name="arrow-forward" size={16} color="#FFF" />}
          iconPosition="right"
          style={styles.checkoutBtn}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.pageBg,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.pageBg,
    padding: spacing.xxl,
    gap: spacing.sm,
  },
  loadingText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  emptyTitle: {
    ...typography.h2,
    color: colors.navy,
  },
  emptySubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
    maxWidth: 280,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    marginBottom: spacing.xs,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    ...typography.h2,
    color: colors.navy,
  },
  countPill: {
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  countPillText: {
    color: colors.textWhite,
    fontSize: 11,
    fontWeight: '800',
  },
  clearText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.danger,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  cartCard: {
    flexDirection: 'row',
    backgroundColor: colors.cardBg,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    gap: spacing.md,
    ...shadows.sm,
  },
  imageWrap: {
    width: 84,
    height: 84,
    borderRadius: radius.md,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorderLight,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: {
    flex: 1,
    gap: 3,
  },
  itemName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    lineHeight: 18,
  },
  itemSpecs: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  cardPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
    marginTop: 2,
  },
  itemPrice: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.navy,
  },
  subtotalText: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '500',
  },
  cardActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.sm,
  },
  stepperBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: {
    opacity: 0.4,
  },
  stepperCount: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.navy,
    minWidth: 24,
    textAlign: 'center',
  },
  deleteBtn: {
    padding: 4,
  },
  footerSection: {
    gap: spacing.md,
    marginTop: spacing.md,
  },
  promoCard: {
    backgroundColor: colors.cardBg,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    ...shadows.sm,
  },
  promoCardTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.navy,
    marginBottom: spacing.sm,
  },
  promoInputRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  promoInput: {
    flex: 1,
    height: 40,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  appliedPromoPill: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.greenLight,
    borderWidth: 1,
    borderColor: colors.greenBorder,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
  appliedPromoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
  },
  appliedPromoCode: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.greenText,
  },
  appliedPromoAmount: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.greenText,
  },
  breakdownCard: {
    backgroundColor: colors.cardBg,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    gap: spacing.xs + 2,
    ...shadows.sm,
  },
  breakdownTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.navy,
    marginBottom: spacing.xs,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  breakdownLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  breakdownValue: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.navy,
  },
  discountLabel: {
    fontSize: 12,
    color: colors.greenText,
    fontWeight: '600',
  },
  discountValue: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.greenText,
  },
  freeShippingBadge: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.greenText,
  },
  includedLabel: {
    fontSize: 11,
    color: colors.textMuted,
  },
  divider: {
    height: 1,
    backgroundColor: colors.cardBorderLight,
    marginVertical: spacing.xs,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: spacing.xxs,
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.navy,
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.navy,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.cardBg,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.md,
    ...shadows.lg,
  },
  bottomPriceWrap: {
    flex: 1,
  },
  bottomPriceLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  bottomPriceValue: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.navy,
  },
  checkoutBtn: {
    flex: 1.5,
  },
  itemBadgeRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    marginBottom: 2,
  },
  modeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: radius.xs,
  },
  modeBadgeBuy: {
    backgroundColor: '#DCFCE7',
  },
  modeBadgeLease: {
    backgroundColor: '#FEF3C7',
  },
  modeBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  modeBadgeTextBuy: {
    color: '#15803D',
  },
  modeBadgeTextLease: {
    color: '#92400E',
  },
  configBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: radius.xs,
  },
  configBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  perMoNote: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  leaseNoticeText: {
    fontSize: 10,
    color: '#92400E',
    fontWeight: '600',
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: radius.xs,
    marginTop: 2,
  },
  warrantyToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  warrantyToggleText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
  },
  breakdownSubLabel: {
    fontSize: 10,
    color: '#92400E',
    fontWeight: '500',
  },
});
