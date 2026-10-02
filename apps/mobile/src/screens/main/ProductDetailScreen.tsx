import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useProduct, useAddToCart, useAddToWishlist, useWishlist, useRemoveWishlistItem } from '../../hooks/useApi';
import { useAuth } from '../../providers/AuthProvider';
import { MainStackParamList, MainStackNavigationProp } from '../../navigation/types';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { colors, radius, shadows, spacing, typography } from '../../theme/tokens';

type ProductDetailRouteProp = RouteProp<MainStackParamList, 'ProductDetail'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function ProductDetailScreen() {
  const route = useRoute<ProductDetailRouteProp>();
  const navigation = useNavigation<MainStackNavigationProp>();
  const insets = useSafeAreaInsets();
  const { productId } = route.params;
  const { isAuthenticated } = useAuth();

  const { data: product, isLoading, error } = useProduct(productId);
  const addToCart = useAddToCart();
  const addToWishlist = useAddToWishlist();
  const removeFromWishlist = useRemoveWishlistItem();
  const { data: wishlist } = useWishlist();

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<'specs' | 'overview' | 'warranty'>('specs');

  const isWishlisted = wishlist?.some((item: { productId: string; id: string }) => item.productId === productId);
  const wishlistItem = wishlist?.find((item: { productId: string; id: string }) => item.productId === productId);

  const formatPrice = (price: number | string) => {
    const num = typeof price === 'string' ? parseFloat(price) : price;
    return `₹${Math.round(num).toLocaleString('en-IN')}`;
  };

  const handleAddToCart = (onSuccess?: () => void) => {
    if (!isAuthenticated) {
      Alert.alert('Login Required', 'Please login to add items to your cart.');
      return;
    }
    addToCart.mutate(
      { productId, quantity: 1 },
      {
        onSuccess: () => {
          if (onSuccess) {
            onSuccess();
          } else {
            Alert.alert('Added to Cart', `${product?.name ?? 'Item'} added to your cart.`);
          }
        },
        onError: (err) => Alert.alert('Error', err.message),
      },
    );
  };

  const handleBuyNow = () => {
    handleAddToCart(() => {
      navigation.navigate('MainTabs');
    });
  };

  const handleToggleWishlist = () => {
    if (!isAuthenticated) {
      Alert.alert('Login Required', 'Please login to manage your wishlist.');
      return;
    }
    if (isWishlisted && wishlistItem) {
      removeFromWishlist.mutate(wishlistItem.id, {
        onSuccess: () => Alert.alert('Removed', 'Item removed from wishlist'),
      });
    } else {
      addToWishlist.mutate(productId, {
        onSuccess: () => Alert.alert('Added', 'Item saved to your wishlist'),
      });
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading laptop details...</Text>
      </View>
    );
  }

  if (error || !product) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.danger} />
        <Text style={styles.errorText}>Product not found or unavailable</Text>
        <Button
          title="Go Back"
          onPress={() => navigation.goBack()}
          variant="primary"
          size="md"
          style={{ marginTop: spacing.md }}
        />
      </View>
    );
  }

  const images = product.images && product.images.length > 0
    ? product.images
    : [{ id: 'placeholder', productId: product.id, url: '', isPrimary: true }];

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

  const meta = product.metadata || {};
  const condition = meta.condition || meta.grade || 'Grade A+ (Like New)';
  const bulkPrice = meta.bulkPrice || meta.wholesalePrice;

  // Build spec sheet
  const specItems: { label: string; value: string }[] = [];
  if (meta.processor || meta.cpu) specItems.push({ label: 'Processor', value: String(meta.processor || meta.cpu) });
  if (meta.ram) specItems.push({ label: 'RAM', value: String(meta.ram) });
  if (meta.storage) specItems.push({ label: 'Storage', value: String(meta.storage) });
  if (meta.display || meta.screen) specItems.push({ label: 'Display Size', value: String(meta.display || meta.screen) });
  if (meta.graphics || meta.gpu) specItems.push({ label: 'Graphics', value: String(meta.graphics || meta.gpu) });
  if (meta.os || meta.operatingSystem) specItems.push({ label: 'Operating System', value: String(meta.os || meta.operatingSystem) });
  specItems.push({ label: 'Condition', value: String(condition) });
  specItems.push({ label: 'Warranty', value: String(meta.warranty || '1-Year Pan-India Warranty') });
  specItems.push({ label: 'SKU / Model ID', value: product.sku || product.id.slice(0, 8).toUpperCase() });

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 90, 110) }}
      >
        {/* Image Gallery Swiper */}
        <View style={styles.galleryContainer}>
          <FlatList
            data={images}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item, index) => item.id || String(index)}
            onMomentumScrollEnd={(e) => {
              const newIndex = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
              setActiveImageIndex(newIndex);
            }}
            renderItem={({ item }) => (
              <View style={styles.imageSlide}>
                {item.url ? (
                  <Image
                    source={{ uri: item.url }}
                    style={styles.productImage}
                    contentFit="contain"
                    transition={200}
                  />
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <Ionicons name="laptop-outline" size={72} color={colors.textMuted} />
                  </View>
                )}
              </View>
            )}
          />

          {/* Top Badges Overlay */}
          <View style={styles.galleryBadges}>
            <Badge variant="refurb" label="REFURB" />
            {product.isFeatured && <Badge variant="bestSeller" label="Best Seller" />}
            {product.isNewArrival && !product.isFeatured && <Badge variant="newArrival" label="New" />}
          </View>

          {/* Dots Indicator */}
          {images.length > 1 && (
            <View style={styles.dotsContainer}>
              {images.map((_, idx) => (
                <View
                  key={idx}
                  style={[styles.dot, activeImageIndex === idx && styles.activeDot]}
                />
              ))}
            </View>
          )}
        </View>

        {/* Product Info Block */}
        <View style={styles.infoBlock}>
          {/* Category & Condition */}
          <View style={styles.metaRow}>
            {product.category && (
              <Text style={styles.categoryName}>
                {product.category.name.toUpperCase()}
              </Text>
            )}
            <Badge variant="grade" label={String(condition)} />
          </View>

          {/* Title */}
          <Text style={styles.productTitle}>{product.name}</Text>

          {/* Ready for Dispatch chip if stock > 0 */}
          {product.stock > 0 ? (
            <View style={styles.stockChip}>
              <View style={styles.greenDot} />
              <Text style={styles.stockChipText}>
                Ready for Dispatch • {product.stock} units available
              </Text>
            </View>
          ) : (
            <View style={styles.outOfStockChip}>
              <Text style={styles.outOfStockText}>Currently Out of Stock</Text>
            </View>
          )}

          {/* Price Section */}
          <View style={styles.priceContainer}>
            <View style={styles.priceRow}>
              <Text style={styles.mainPrice}>{formatPrice(product.price)}</Text>
              {hasDiscount && (
                <>
                  <Text style={styles.comparePrice}>{formatPrice(comparePriceNum!)}</Text>
                  <Badge variant="discount" discountPercent={discountPercent} />
                </>
              )}
            </View>
            <Text style={styles.taxNote}>
              Inclusive of 18% GST • Free express delivery across India
            </Text>

            {/* Bulk Pricing Callout */}
            {bulkPrice && (
              <View style={styles.bulkCallout}>
                <Ionicons name="cube-outline" size={16} color={colors.primary} />
                <Text style={styles.bulkCalloutText}>
                  Wholesale Rate: <Text style={styles.boldText}>{formatPrice(bulkPrice)}</Text> per unit on 5+ orders
                </Text>
              </View>
            )}
          </View>

          {/* 32-Point Quality Inspection Box */}
          <View style={styles.inspectionCard}>
            <View style={styles.inspectionHeader}>
              <View style={styles.inspectionIconCircle}>
                <Ionicons name="shield-checkmark" size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inspectionTitle}>32-Point Quality Inspected</Text>
                <Text style={styles.inspectionSubtitle}>Certified by senior hardware technicians</Text>
              </View>
            </View>

            <View style={styles.checkGrid}>
              <View style={styles.checkItem}>
                <Ionicons name="checkmark-circle" size={15} color={colors.green} />
                <Text style={styles.checkText}>Screen & GPU Stress-Tested</Text>
              </View>
              <View style={styles.checkItem}>
                <Ionicons name="checkmark-circle" size={15} color={colors.green} />
                <Text style={styles.checkText}>Battery Health Tested (&gt;80%)</Text>
              </View>
              <View style={styles.checkItem}>
                <Ionicons name="checkmark-circle" size={15} color={colors.green} />
                <Text style={styles.checkText}>Keyboard, Trackpad & Ports</Text>
              </View>
              <View style={styles.checkItem}>
                <Ionicons name="checkmark-circle" size={15} color={colors.green} />
                <Text style={styles.checkText}>Genuine Fresh OS Clean Install</Text>
              </View>
            </View>
          </View>

          {/* Tab Selector */}
          <View style={styles.tabBar}>
            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'specs' && styles.tabButtonActive]}
              onPress={() => setActiveTab('specs')}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, activeTab === 'specs' && styles.tabTextActive]}>
                Specifications
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'overview' && styles.tabButtonActive]}
              onPress={() => setActiveTab('overview')}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, activeTab === 'overview' && styles.tabTextActive]}>
                Overview
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'warranty' && styles.tabButtonActive]}
              onPress={() => setActiveTab('warranty')}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, activeTab === 'warranty' && styles.tabTextActive]}>
                Warranty & Returns
              </Text>
            </TouchableOpacity>
          </View>

          {/* Tab Content */}
          {activeTab === 'specs' && (
            <View style={styles.tabContent}>
              {specItems.map((spec, index) => (
                <View key={index} style={styles.specRow}>
                  <Text style={styles.specLabel}>{spec.label}</Text>
                  <Text style={styles.specValue}>{spec.value}</Text>
                </View>
              ))}
            </View>
          )}

          {activeTab === 'overview' && (
            <View style={styles.tabContent}>
              <Text style={styles.descriptionText}>
                {product.description ||
                  product.shortDescription ||
                  `${product.name} is a high-performance certified refurbished machine thoroughly inspected and optimized for business, coding, design, and enterprise everyday use.`}
              </Text>
            </View>
          )}

          {activeTab === 'warranty' && (
            <View style={styles.tabContent}>
              <View style={styles.warrantyItem}>
                <Ionicons name="ribbon-outline" size={20} color={colors.primary} />
                <View style={styles.warrantyTextWrap}>
                  <Text style={styles.warrantyTitle}>1-Year Pan-India Warranty</Text>
                  <Text style={styles.warrantyDesc}>
                    Full hardware and component coverage with doorstep pick-up & repair assistance.
                  </Text>
                </View>
              </View>

              <View style={styles.warrantyItem}>
                <Ionicons name="swap-horizontal-outline" size={20} color={colors.primary} />
                <View style={styles.warrantyTextWrap}>
                  <Text style={styles.warrantyTitle}>7-Day Replacement Policy</Text>
                  <Text style={styles.warrantyDesc}>
                    Hassle-free replacement in the rare case of any technical defects upon unboxing.
                  </Text>
                </View>
              </View>

              <View style={styles.warrantyItem}>
                <Ionicons name="paper-plane-outline" size={20} color={colors.primary} />
                <View style={styles.warrantyTextWrap}>
                  <Text style={styles.warrantyTitle}>Insured Safe Shipping</Text>
                  <Text style={styles.warrantyDesc}>
                    Ships in tamper-proof cushioned protective packaging via blue-chip couriers.
                  </Text>
                </View>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Sticky Bottom Action Bar */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <TouchableOpacity
          style={[styles.wishlistBtn, isWishlisted && styles.wishlistBtnActive]}
          onPress={handleToggleWishlist}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
        >
          <Ionicons
            name={isWishlisted ? 'heart' : 'heart-outline'}
            size={22}
            color={isWishlisted ? colors.danger : colors.navy}
          />
        </TouchableOpacity>

        <Button
          title={addToCart.isPending ? 'Adding...' : 'Add to Cart'}
          onPress={() => handleAddToCart()}
          variant="secondary"
          size="md"
          loading={addToCart.isPending}
          disabled={product.stock <= 0}
          style={styles.bottomActionButton}
        />

        <Button
          title={product.stock > 0 ? 'Buy Now' : 'Out of Stock'}
          onPress={handleBuyNow}
          variant="navy"
          size="md"
          disabled={product.stock <= 0}
          style={styles.bottomActionButton}
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
    padding: spacing.xl,
    gap: spacing.sm,
  },
  loadingText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  errorText: {
    ...typography.h3,
    color: colors.navy,
    textAlign: 'center',
  },
  galleryContainer: {
    width: SCREEN_WIDTH,
    height: 300,
    backgroundColor: colors.cardBg,
    position: 'relative',
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorderLight,
  },
  imageSlide: {
    width: SCREEN_WIDTH,
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  galleryBadges: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.lg,
    gap: 4,
    alignItems: 'flex-start',
  },
  dotsContainer: {
    position: 'absolute',
    bottom: spacing.sm,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#CBD5E1',
  },
  activeDot: {
    width: 18,
    backgroundColor: colors.primary,
  },
  infoBlock: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryName: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.5,
  },
  productTitle: {
    ...typography.h1,
    color: colors.navy,
    lineHeight: 28,
  },
  stockChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.greenLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs + 1,
    borderRadius: radius.xs,
    alignSelf: 'flex-start',
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.green,
    marginRight: 6,
  },
  stockChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.greenText,
  },
  outOfStockChip: {
    backgroundColor: colors.dangerLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs + 1,
    borderRadius: radius.xs,
    alignSelf: 'flex-start',
  },
  outOfStockText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.dangerText,
  },
  priceContainer: {
    backgroundColor: colors.cardBg,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    ...shadows.sm,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  mainPrice: {
    fontSize: 26,
    fontWeight: '900',
    color: colors.navy,
  },
  comparePrice: {
    fontSize: 16,
    color: colors.textMuted,
    textDecorationLine: 'line-through',
  },
  taxNote: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  bulkCallout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    backgroundColor: colors.primaryLight,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    marginTop: spacing.md,
  },
  bulkCalloutText: {
    fontSize: 11,
    color: colors.navy,
  },
  boldText: {
    fontWeight: '700',
    color: colors.primary,
  },
  inspectionCard: {
    backgroundColor: colors.cardBg,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    ...shadows.sm,
  },
  inspectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorderLight,
  },
  inspectionIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inspectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.navy,
  },
  inspectionSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  checkGrid: {
    gap: spacing.xs + 2,
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
  },
  checkText: {
    fontSize: 12,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.cardBg,
    borderRadius: radius.md,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginTop: spacing.xs,
  },
  tabButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: radius.sm,
  },
  tabButtonActive: {
    backgroundColor: colors.primaryLight,
  },
  tabText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: '800',
  },
  tabContent: {
    backgroundColor: colors.cardBg,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    ...shadows.sm,
  },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorderLight,
  },
  specLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    flex: 1,
  },
  specValue: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.navy,
    flex: 1.2,
    textAlign: 'right',
  },
  descriptionText: {
    ...typography.body,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  warrantyItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  warrantyTextWrap: {
    flex: 1,
  },
  warrantyTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.navy,
    marginBottom: 2,
  },
  warrantyDesc: {
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 16,
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
    paddingTop: spacing.sm,
    gap: spacing.sm,
    ...shadows.lg,
  },
  wishlistBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wishlistBtnActive: {
    backgroundColor: colors.dangerLight,
    borderColor: colors.dangerBorder,
  },
  bottomActionButton: {
    flex: 1,
  },
});
