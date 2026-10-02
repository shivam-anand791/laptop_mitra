import { View, Text, TouchableOpacity, StyleSheet, ViewStyle, StyleProp, DimensionValue } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Product } from '@laptopmitra/types';
import { colors, radius, shadows, spacing, typography } from '../theme/tokens';
import Badge from './ui/Badge';

interface ProductCardProps {
  product: Product;
  onPress: () => void;
  onAddToCart?: () => void;
  width?: DimensionValue;
  style?: StyleProp<ViewStyle>;
}

export default function ProductCard({
  product,
  onPress,
  onAddToCart,
  width = '48%',
  style,
}: ProductCardProps) {
  const formatPrice = (price: number | string) => {
    const num = typeof price === 'string' ? parseFloat(price) : price;
    return `₹${Math.round(num).toLocaleString('en-IN')}`;
  };

  const primaryImage = product.images?.find((img) => img.isPrimary) ?? product.images?.[0];

  const priceNum = typeof product.price === 'string' ? parseFloat(product.price) : product.price;
  const comparePriceNum = product.compareAtPrice
    ? typeof product.compareAtPrice === 'string'
      ? parseFloat(product.compareAtPrice)
      : product.compareAtPrice
    : null;

  const hasDiscount = comparePriceNum !== null && comparePriceNum > priceNum;
  const discountPercent = hasDiscount
    ? Math.round(((comparePriceNum! - priceNum) / comparePriceNum!) * 100)
    : 0;

  // Extract specs snippet from metadata if available
  const meta = product.metadata || {};
  const specs = [meta.processor, meta.ram, meta.storage].filter(Boolean).join(' • ');

  const bulkPrice = meta.bulkPrice || meta.wholesalePrice;

  return (
    <TouchableOpacity
      style={[styles.card, { width }, style]}
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={`${product.name}, price ${formatPrice(product.price)}`}
    >
      {/* Image Area */}
      <View style={styles.imageContainer}>
        {primaryImage ? (
          <Image
            source={{ uri: primaryImage.url }}
            style={styles.image}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Ionicons name="laptop-outline" size={36} color={colors.textMuted} />
          </View>
        )}

        {/* Top Badges */}
        <View style={styles.topLeftBadges}>
          <Badge variant="refurb" label="REFURB" />
          {product.isFeatured && <Badge variant="bestSeller" label="Best Seller" />}
          {product.isNewArrival && !product.isFeatured && (
            <Badge variant="newArrival" label="New" />
          )}
        </View>

        {/* Discount Pill */}
        {hasDiscount && discountPercent > 0 && (
          <View style={styles.topRightBadge}>
            <Badge variant="discount" discountPercent={discountPercent} />
          </View>
        )}
      </View>

      {/* Info Area */}
      <View style={styles.info}>
        {/* Category */}
        {product.category && (
          <Text style={styles.category} numberOfLines={1}>
            {product.category.name.toUpperCase()}
          </Text>
        )}

        {/* Name */}
        <Text style={styles.name} numberOfLines={2}>
          {product.name}
        </Text>

        {/* Specs snippet if available */}
        {specs ? (
          <Text style={styles.specs} numberOfLines={1}>
            {specs}
          </Text>
        ) : null}

        {/* Ready for Dispatch chip if stock > 0 */}
        {product.stock > 0 ? (
          <View style={styles.dispatchChip}>
            <View style={styles.greenDot} />
            <Text style={styles.dispatchText} numberOfLines={1}>
              Ready for Dispatch • {product.stock} left
            </Text>
          </View>
        ) : (
          <View style={styles.outOfStockChip}>
            <Text style={styles.outOfStockText}>Out of Stock</Text>
          </View>
        )}

        {/* Price Row */}
        <View style={styles.priceContainer}>
          <View style={styles.priceRow}>
            <Text style={styles.price}>{formatPrice(product.price)}</Text>
            {hasDiscount && (
              <Text style={styles.compareAtPrice}>{formatPrice(comparePriceNum!)}</Text>
            )}
          </View>

          {/* Bulk Pricing line if available */}
          {bulkPrice && (
            <Text style={styles.bulkPrice}>
              Bulk: {formatPrice(bulkPrice)}/unit
            </Text>
          )}
        </View>

        {/* Quick Add Button */}
        {onAddToCart && product.stock > 0 && (
          <TouchableOpacity
            style={styles.quickAddButton}
            onPress={(e) => {
              e.stopPropagation?.();
              onAddToCart();
            }}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={`Add ${product.name} to cart`}
          >
            <Ionicons name="cart-outline" size={16} color={colors.primary} />
            <Text style={styles.quickAddText}>Add</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.cardBg,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    ...shadows.sm,
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 1.1,
    backgroundColor: '#F8FAFC',
    position: 'relative',
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorderLight,
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
    backgroundColor: '#F1F5F9',
  },
  topLeftBadges: {
    position: 'absolute',
    top: spacing.xs + 2,
    left: spacing.xs + 2,
    gap: 3,
    alignItems: 'flex-start',
  },
  topRightBadge: {
    position: 'absolute',
    top: spacing.xs + 2,
    right: spacing.xs + 2,
  },
  info: {
    padding: spacing.md,
    gap: 4,
  },
  category: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  name: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    minHeight: 36,
  },
  specs: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 10,
  },
  dispatchChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.greenLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.xs,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  greenDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.green,
    marginRight: 4,
  },
  dispatchText: {
    fontSize: 9,
    fontWeight: '600',
    color: colors.greenText,
  },
  outOfStockChip: {
    backgroundColor: colors.dangerLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.xs,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  outOfStockText: {
    fontSize: 9,
    fontWeight: '600',
    color: colors.dangerText,
  },
  priceContainer: {
    marginTop: 4,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  price: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.navy,
  },
  compareAtPrice: {
    fontSize: 11,
    color: colors.textMuted,
    textDecorationLine: 'line-through',
  },
  bulkPrice: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.primary,
    marginTop: 1,
  },
  quickAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    borderRadius: radius.sm,
    paddingVertical: 6,
    marginTop: 6,
  },
  quickAddText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
});
