import { useEffect, useState } from 'react';
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
  Linking,
  TextInput,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import {
  useProduct,
  useAddToCart,
  useAddToWishlist,
  useWishlist,
  useRemoveWishlistItem,
  useSupportConfig,
  useCartSyncState,
  MOBILE_CART_ERROR_MESSAGE,
} from '../../hooks/useApi';
import { useAuth } from '../../providers/AuthProvider';
import { MainStackParamList, MainStackNavigationProp } from '../../navigation/types';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import CorporateQuoteModal from '../../components/CorporateQuoteModal';
import { DataErrorView } from '../../components/DataErrorView';
import { colors, radius, shadows, spacing, typography } from '../../theme/tokens';
import { RentalTenureMonths } from '@laptopmitra/types';

type ProductDetailRouteProp = RouteProp<MainStackParamList, 'ProductDetail'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function ProductDetailScreen() {
  const route = useRoute<ProductDetailRouteProp>();
  const navigation = useNavigation<MainStackNavigationProp>();
  const insets = useSafeAreaInsets();
  const { productId } = route.params;
  const { isAuthenticated, user } = useAuth();

  const { data: product, isLoading, error, refetch } = useProduct(productId);
  const { data: supportConfig } = useSupportConfig();
  const addToCart = useAddToCart();
  const { retryCartSync } = useCartSyncState();
  const addToWishlist = useAddToWishlist();
  const removeFromWishlist = useRemoveWishlistItem();
  const { data: wishlist } = useWishlist();

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<'specs' | 'overview' | 'warranty'>('specs');
  const [corporateModalVisible, setCorporateModalVisible] = useState(false);
  const [quoteModalMode, setQuoteModalMode] = useState<'sell' | 'lease'>('sell');

  // Phase R3 Commercial States
  const [purchaseMode, setPurchaseMode] = useState<'sell' | 'lease'>('sell');
  const [selectedVariantId, setSelectedVariantId] = useState('');
  const [selectedRentalTenure, setSelectedRentalTenure] = useState<RentalTenureMonths>(12);
  const [hasWarranty, setHasWarranty] = useState<boolean>(false);

  // Delivery Pincode State
  const [pincode, setPincode] = useState('');
  const [pincodeStatus, setPincodeStatus] = useState<{
    checked: boolean;
    valid: boolean;
    message?: string;
  } | null>(null);

  const handleCheckPincode = () => {
    const trimmed = pincode.trim();
    if (!/^\d{6}$/.test(trimmed)) {
      setPincodeStatus({
        checked: true,
        valid: false,
        message: 'Please enter a valid 6-digit Indian PIN code',
      });
      return;
    }
    const minDate = new Date();
    minDate.setDate(minDate.getDate() + 2);
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 4);
    const dateRangeStr = `${minDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} - ${maxDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`;

    setPincodeStatus({
      checked: true,
      valid: true,
      message: `Delivery by ${dateRangeStr} | Express Insured Delivery (Free)`,
    });
  };

  const isWishlisted = wishlist?.some(
    (item: { productId: string; id: string }) => item.productId === productId,
  );
  const wishlistItem = wishlist?.find(
    (item: { productId: string; id: string }) => item.productId === productId,
  );

  useEffect(() => {
    const variant =
      product?.variants?.find((item) => item.id === selectedVariantId) ??
      product?.variants?.find((item) => item.isDefault) ??
      product?.variants?.[0];
    const plans = variant?.rentalPlans ?? product?.rentalPlans ?? [];
    if (plans.length && !plans.some((plan) => plan.tenureMonths === selectedRentalTenure)) {
      setSelectedRentalTenure(plans[0]?.tenureMonths ?? 12);
    }
  }, [product, selectedVariantId, selectedRentalTenure]);

  const formatPrice = (price: number | string) => {
    const num = typeof price === 'string' ? parseFloat(price) : price;
    return `₹${Math.round(num).toLocaleString('en-IN')}`;
  };

  const handleAddToCart = (onSuccess?: () => void) => {
    if (!isAuthenticated) {
      Alert.alert('Login Required', 'Please login to add items to your cart.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Login', onPress: () => navigation.navigate('Auth' as any) },
      ]);
      return;
    }
    if (purchaseMode === 'lease' && !hasLeasePrice) {
      Alert.alert(
        'Quote Required',
        'This product does not have a fixed monthly lease price. Please request a quote.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Request Quote',
            onPress: () => {
              setQuoteModalMode('lease');
              setCorporateModalVisible(true);
            },
          },
        ],
      );
      return;
    }
    addToCart.mutate(
      {
        productId,
        quantity: 1,
        purchaseMode,
        ...(selectedVariant ? { variantId: selectedVariant.id } : {}),
        ...(purchaseMode === 'lease' ? { tenureMonths: selectedRentalTenure } : {}),
        hasWarranty: purchaseMode === 'sell' ? hasWarranty : false,
      },
      {
        onSuccess: () => {
          if (onSuccess) {
            onSuccess();
          } else {
            Alert.alert(
              'Added to Cart',
              `${product?.name ?? 'Item'} (${purchaseMode === 'lease' ? 'Rent / Lease' : 'Buy'}) added to your cart.`,
            );
          }
        },
        onError: () =>
          Alert.alert('Cart Update', MOBILE_CART_ERROR_MESSAGE, [
            { text: 'Dismiss', style: 'cancel' },
            { text: 'Retry', onPress: () => void retryCartSync() },
          ]),
      },
    );
  };

  const handleBuyNow = () => {
    handleAddToCart(() => {
      navigation.navigate('Checkout');
    });
  };

  const handleWhatsAppShare = () => {
    const rawPrice = Number(selectedVariant?.price ?? product?.price ?? 0);
    const isLease = purchaseMode === 'lease';
    const activePrice = isLease ? (activeRentalPlan?.monthlyPrice ?? null) : rawPrice;

    const priceText =
      activePrice !== null
        ? `Price: ₹${activePrice.toLocaleString('en-IN')}${isLease ? '/month' : ''}`
        : 'Price: On Request (Rent / Lease)';

    const referralText = user?.referralCode
      ? `\nUse my Mitra code *${user.referralCode}* at checkout to get flat ₹500 instant discount!`
      : '';
    const warrantyText = supportConfig
      ? `${Math.max(1, Math.round(supportConfig.standardWarrantyDays / 30))}-Month Warranty`
      : 'Warranty duration unavailable';
    const message = `Check out this certified refurbished laptop on LaptopMitra:\n*${product?.name || 'Laptop'}*\n${priceText}\nGrade A+ Inspected with ${warrantyText}.${referralText}\nhttps://laptopmitra.in/products/${productId}`;
    Linking.openURL(`https://wa.me/?text=${encodeURIComponent(message)}`).catch(() => {
      Alert.alert('Unable to open WhatsApp', 'Please ensure WhatsApp is installed on your device.');
    });
  };

  const handleToggleWishlist = () => {
    if (!isAuthenticated) {
      Alert.alert('Login Required', 'Please login to manage your wishlist.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Login', onPress: () => navigation.navigate('Auth' as any) },
      ]);
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

  if (error) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <DataErrorView
          error={error}
          onRetry={() => {
            void refetch();
          }}
        />
        <Button
          title="Go Back"
          onPress={() => navigation.goBack()}
          variant="outline"
          size="sm"
          style={{ marginTop: spacing.md }}
        />
      </View>
    );
  }

  if (!product) {
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

  const selectedVariant =
    product.variants?.find((variant) => variant.id === selectedVariantId) ??
    product.variants?.find((variant) => variant.isDefault) ??
    product.variants?.[0];
  const rentalPlans = selectedVariant?.rentalPlans ?? product.rentalPlans ?? [];
  const activeRentalPlan =
    rentalPlans.find((plan) => plan.tenureMonths === selectedRentalTenure) ?? rentalPlans[0];
  const hasLeasePrice = rentalPlans.length > 0;
  const availableStock = selectedVariant?.stock ?? product.stock;
  const allowBackorder = selectedVariant?.allowBackorder ?? product.allowBackorder ?? false;
  const images: Array<{
    id: string;
    url: string;
    isPrimary: boolean;
    altText?: string | null;
    sortOrder?: number;
  }> = selectedVariant?.images?.length
    ? selectedVariant.images
    : product.images && product.images.length > 0
      ? product.images
      : [{ id: 'placeholder', url: '', isPrimary: true }];

  const priceNum = Number(selectedVariant?.price ?? product.price);
  const comparePriceNum =
    selectedVariant?.compareAtPrice != null
      ? Number(selectedVariant.compareAtPrice)
      : product.compareAtPrice
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

  const isLease = purchaseMode === 'lease';
  const currentUnitPrice = isLease ? (activeRentalPlan?.monthlyPrice ?? null) : priceNum;

  const currentBulkPrice = isLease
    ? product.bulkLeasePrice
      ? typeof product.bulkLeasePrice === 'string'
        ? parseFloat(product.bulkLeasePrice)
        : product.bulkLeasePrice
      : null
    : product.bulkSellPrice
      ? typeof product.bulkSellPrice === 'string'
        ? parseFloat(product.bulkSellPrice)
        : product.bulkSellPrice
      : null;

  // Build spec sheet
  const specItems: { label: string; value: string }[] = [];
  if (meta.processor || meta.cpu)
    specItems.push({ label: 'Processor', value: String(meta.processor || meta.cpu) });
  if (meta.ram) specItems.push({ label: 'RAM', value: String(meta.ram) });
  if (meta.storage) specItems.push({ label: 'Storage', value: String(meta.storage) });
  if (meta.display || meta.screen)
    specItems.push({ label: 'Display Size', value: String(meta.display || meta.screen) });
  if (meta.graphics || meta.gpu)
    specItems.push({ label: 'Graphics', value: String(meta.graphics || meta.gpu) });
  if (meta.os || meta.operatingSystem)
    specItems.push({ label: 'Operating System', value: String(meta.os || meta.operatingSystem) });
  specItems.push({ label: 'Condition', value: String(condition) });
  specItems.push({
    label: 'Warranty',
    value: supportConfig
      ? `${Math.max(1, Math.round(supportConfig.standardWarrantyDays / 30))}-Month Pan-India Warranty`
      : 'Warranty duration unavailable',
  });
  specItems.push({
    label: 'SKU / Model ID',
    value: product.sku || product.id.slice(0, 8).toUpperCase(),
  });

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
            {product.isFeatured && <Badge variant="bestSeller" label="Best Seller" />}
            {product.isNewArrival && !product.isFeatured && (
              <Badge variant="newArrival" label="New" />
            )}
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
              <Text style={styles.categoryName}>{product.category.name.toUpperCase()}</Text>
            )}
            <Badge variant="grade" label={String(condition)} />
          </View>

          {/* Title */}
          <Text style={styles.productTitle}>{product.name}</Text>

          {/* Ready for Dispatch chip if stock > 0 */}
          {availableStock > 0 || allowBackorder ? (
            <View style={styles.stockChip}>
              <View style={styles.greenDot} />
              <Text style={styles.stockChipText}>
                Ready for Dispatch • {availableStock} units available
              </Text>
            </View>
          ) : (
            <View style={styles.outOfStockChip}>
              <Text style={styles.outOfStockText}>Currently Out of Stock</Text>
            </View>
          )}

          {/* Procurement Mode Selector */}
          <View style={styles.modeSelector}>
            <TouchableOpacity
              style={[styles.modeTab, purchaseMode === 'sell' && styles.modeTabActive]}
              onPress={() => setPurchaseMode('sell')}
              activeOpacity={0.8}
            >
              <Text
                style={[styles.modeTabText, purchaseMode === 'sell' && styles.modeTabTextActive]}
              >
                Buy Outright
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeTab, purchaseMode === 'lease' && styles.modeTabActiveLease]}
              onPress={() => {
                setPurchaseMode('lease');
                setHasWarranty(false); // strictly rejected on lease
              }}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.modeTabText,
                  purchaseMode === 'lease' && styles.modeTabTextActiveLease,
                ]}
              >
                Rent / Lease
              </Text>
            </TouchableOpacity>
          </View>

          {/* Price Section */}
          <View style={styles.priceContainer}>
            {purchaseMode === 'lease' && !hasLeasePrice ? (
              <View>
                <View style={styles.priceRow}>
                  <Text style={styles.mainPrice}>Price on request</Text>
                  <View style={styles.quoteBadge}>
                    <Text style={styles.quoteBadgeText}>Quote Required</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.requestQuoteInlineBtn}
                  onPress={() => {
                    setQuoteModalMode('lease');
                    setCorporateModalVisible(true);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.requestQuoteInlineBtnText}>Request a Quote →</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.priceRow}>
                <Text style={styles.mainPrice}>{formatPrice(currentUnitPrice!)}</Text>
                {purchaseMode === 'lease' && <Text style={styles.perMonthText}>/ month</Text>}
                {purchaseMode === 'sell' && hasDiscount && (
                  <>
                    <Text style={styles.comparePrice}>{formatPrice(comparePriceNum!)}</Text>
                    <Badge variant="discount" discountPercent={discountPercent} />
                  </>
                )}
              </View>
            )}

            {purchaseMode === 'lease' && activeRentalPlan ? (
              <View style={styles.leaseNoticeBox}>
                <Ionicons name="information-circle-outline" size={16} color="#B45309" />
                <Text style={styles.leaseNoticeText}>
                  Refundable deposit: {formatPrice(activeRentalPlan.securityDeposit ?? 0)}. One-time
                  delivery: {formatPrice(activeRentalPlan.deliveryCharge ?? 0)}. These are separate
                  from monthly rent.
                </Text>
              </View>
            ) : purchaseMode !== 'lease' ? (
              <Text style={styles.taxNote}>
                Taxes, if applicable, are calculated at checkout • Free express delivery across
                India
              </Text>
            ) : null}

            {/* Bulk Pricing Callout */}
            <View style={styles.bulkCallout}>
              <View
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}
              >
                <Ionicons name="cube-outline" size={16} color={colors.primary} />
                <Text style={styles.bulkCalloutText}>
                  {currentBulkPrice ? (
                    <>
                      Bulk Rate:{' '}
                      <Text style={styles.boldText}>{formatPrice(currentBulkPrice)}</Text>
                      {purchaseMode === 'lease' ? '/mo' : ''} per unit (5+ units, via quote)
                    </>
                  ) : (
                    <>Bulk / Fleet Procurement (5+ units, via quote)</>
                  )}
                </Text>
              </View>
              <TouchableOpacity
                style={{ marginTop: 6, alignSelf: 'flex-start' }}
                onPress={() => {
                  setQuoteModalMode(purchaseMode === 'lease' ? 'lease' : 'sell');
                  setCorporateModalVisible(true);
                }}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: 11, fontWeight: '700', color: colors.primary }}>
                  Request Fleet / Corporate Quote →
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {!!product.variants?.filter((variant) => variant.isActive).length && (
            <View style={styles.configContainer}>
              <Text style={styles.sectionHeaderTitle}>Select Configuration</Text>
              <View style={styles.configCardsRow}>
                {product.variants
                  .filter((variant) => variant.isActive)
                  .map((variant) => (
                    <TouchableOpacity
                      key={variant.id}
                      style={[
                        styles.configCard,
                        selectedVariant?.id === variant.id && styles.configCardActive,
                      ]}
                      onPress={() => setSelectedVariantId(variant.id)}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.configCardTitle,
                          selectedVariant?.id === variant.id && styles.configCardTitleActive,
                        ]}
                      >
                        {variant.name}
                      </Text>
                      <Text style={styles.configCardPrice}>{formatPrice(variant.price)}</Text>
                    </TouchableOpacity>
                  ))}
              </View>
            </View>
          )}

          {purchaseMode === 'lease' && hasLeasePrice && (
            <View style={styles.configContainer}>
              <Text style={styles.sectionHeaderTitle}>Rental Tenure</Text>
              <View style={styles.configCardsRow}>
                {rentalPlans.map((plan) => (
                  <TouchableOpacity
                    key={plan.tenureMonths}
                    style={[
                      styles.configCard,
                      selectedRentalTenure === plan.tenureMonths && styles.configCardActive,
                    ]}
                    onPress={() => setSelectedRentalTenure(plan.tenureMonths)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.configCardTitle,
                        selectedRentalTenure === plan.tenureMonths && styles.configCardTitleActive,
                      ]}
                    >
                      {plan.tenureMonths} months
                    </Text>
                    <Text style={styles.configCardPrice}>
                      {formatPrice(plan.monthlyPrice)}/month
                    </Text>
                    <Text style={styles.configCardDesc}>Total {formatPrice(plan.totalRent)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {!!activeRentalPlan && (
                <View style={styles.rentalBreakdown}>
                  <Text style={styles.rentalBreakdownText}>
                    Total rent: {formatPrice(activeRentalPlan.totalRent)}
                  </Text>
                  <Text style={styles.rentalBreakdownText}>
                    Refundable deposit: {formatPrice(activeRentalPlan.securityDeposit ?? 0)}
                  </Text>
                  <Text style={styles.rentalBreakdownText}>
                    One-time delivery: {formatPrice(activeRentalPlan.deliveryCharge ?? 0)}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Warranty Toggle Section */}
          <View style={styles.warrantyBox}>
            {purchaseMode === 'sell' ? (
              <TouchableOpacity
                style={[styles.warrantyToggleRow, hasWarranty && styles.warrantyToggleRowActive]}
                onPress={() => setHasWarranty(!hasWarranty)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={hasWarranty ? 'checkbox' : 'square-outline'}
                  size={20}
                  color={hasWarranty ? colors.primary : colors.textMuted}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.warrantyToggleTitle}>
                    {supportConfig
                      ? `${Math.max(1, Math.round(supportConfig.standardWarrantyDays / 30)) * 2}-Month Extended Hardware Warranty`
                      : 'Extended Hardware Warranty'}
                  </Text>
                  <Text style={styles.warrantyToggleSub}>
                    Full motherboard & part protection across India (+₹1,999)
                  </Text>
                </View>
                <Text style={styles.warrantyPriceTag}>₹1,999</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.leaseWarrantyRow}>
                <Ionicons name="shield-checkmark" size={18} color="#D97706" />
                <Text style={styles.leaseWarrantyText}>
                  Maintenance coverage is specified in the rental agreement.
                </Text>
              </View>
            )}
          </View>

          {/* WhatsApp Share Button */}
          <TouchableOpacity
            style={styles.whatsAppShareBtn}
            onPress={handleWhatsAppShare}
            activeOpacity={0.8}
          >
            <Ionicons name="logo-whatsapp" size={18} color="#15803D" />
            <Text style={styles.whatsAppShareText}>Share Deal on WhatsApp (Earn 10% Cash)</Text>
          </TouchableOpacity>

          {/* 36-Month Buyback Assurance Trust Block */}
          <TouchableOpacity
            style={styles.buybackCard}
            onPress={() => navigation.navigate('BuybackGuarantee')}
            activeOpacity={0.8}
          >
            <View style={styles.buybackIconCircle}>
              <Ionicons name="shield-checkmark" size={22} color="#0284C7" />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.buybackBadge}>LIFETIME</Text>
                <Text style={styles.buybackTag}>Up to 70% Value</Text>
              </View>
              <Text style={styles.buybackTitle}>Buyback Assurance</Text>
              <Text style={styles.buybackSubtitle}>
                Guaranteed return value up to 36 months (70% / 60% / 50% / 40%)
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#0284C7" />
          </TouchableOpacity>

          {/* 32-Point Quality Inspection Box */}
          <View style={styles.inspectionCard}>
            <View style={styles.inspectionHeader}>
              <View style={styles.inspectionIconCircle}>
                <Ionicons name="shield-checkmark" size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inspectionTitle}>32-Point Quality Inspected</Text>
                <Text style={styles.inspectionSubtitle}>
                  Certified by senior hardware technicians
                </Text>
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

          {/* Delivery & Pincode Checker Card */}
          <View style={styles.deliveryCard}>
            <View style={styles.deliveryHeader}>
              <Ionicons name="location-outline" size={20} color={colors.primary} />
              <Text style={styles.deliveryCardTitle}>Delivery & Pincode Check</Text>
            </View>
            <View style={styles.pincodeInputRow}>
              <TextInput
                style={styles.pincodeInput}
                placeholder="Enter 6-digit PIN code"
                placeholderTextColor="#94a3b8"
                keyboardType="number-pad"
                maxLength={6}
                value={pincode}
                onChangeText={(text) => {
                  setPincode(text);
                  if (pincodeStatus) setPincodeStatus(null);
                }}
              />
              <TouchableOpacity
                style={styles.pincodeCheckBtn}
                onPress={handleCheckPincode}
                activeOpacity={0.8}
              >
                <Text style={styles.pincodeCheckBtnText}>Check</Text>
              </TouchableOpacity>
            </View>

            {pincodeStatus?.checked ? (
              <View
                style={[
                  styles.pincodeResultBox,
                  pincodeStatus.valid ? styles.pincodeResultSuccess : styles.pincodeResultError,
                ]}
              >
                <Ionicons
                  name={pincodeStatus.valid ? 'checkmark-circle' : 'alert-circle'}
                  size={16}
                  color={pincodeStatus.valid ? '#166534' : '#dc2626'}
                />
                <Text
                  style={[
                    styles.pincodeResultText,
                    pincodeStatus.valid
                      ? styles.pincodeResultTextSuccess
                      : styles.pincodeResultTextError,
                  ]}
                >
                  {pincodeStatus.message}
                </Text>
              </View>
            ) : null}

            <View style={styles.deliveryPerksList}>
              <View style={styles.deliveryPerkItem}>
                <Ionicons name="car-outline" size={16} color="#475569" />
                <Text style={styles.deliveryPerkText}>Free PAN-India Insured Express Delivery</Text>
              </View>
              <View style={styles.deliveryPerkItem}>
                <Ionicons name="cash-outline" size={16} color="#475569" />
                <Text style={styles.deliveryPerkText}>Cash on Delivery & Pay-on-Delivery available</Text>
              </View>
              <View style={styles.deliveryPerkItem}>
                <Ionicons name="swap-horizontal-outline" size={16} color="#475569" />
                <Text style={styles.deliveryPerkText}>7-Day Doorstep Replacement Guarantee</Text>
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
                  <Text style={styles.warrantyTitle}>
                    {supportConfig
                      ? `${Math.max(1, Math.round(supportConfig.standardWarrantyDays / 30))}-Month Pan-India Warranty`
                      : 'Warranty duration unavailable'}
                  </Text>
                  <Text style={styles.warrantyDesc}>
                    Full hardware and component coverage with doorstep pick-up and repair
                    assistance.
                  </Text>
                </View>
              </View>

              <View style={styles.warrantyItem}>
                <Ionicons name="swap-horizontal-outline" size={20} color={colors.primary} />
                <View style={styles.warrantyTextWrap}>
                  <Text style={styles.warrantyTitle}>
                    {supportConfig?.returnWindowDays
                      ? `${supportConfig.returnWindowDays}-Day Replacement Policy`
                      : 'Return & Replacement Policy'}
                  </Text>
                  <Text style={styles.warrantyDesc}>
                    Replacement eligibility follows the current policy for technical defects.
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

              <TouchableOpacity
                style={styles.warrantyItem}
                onPress={() => navigation.navigate('BuybackGuarantee')}
                activeOpacity={0.7}
              >
                <Ionicons name="shield-checkmark-outline" size={20} color="#0284C7" />
                <View style={styles.warrantyTextWrap}>
                  <Text style={[styles.warrantyTitle, { color: '#0284C7' }]}>
                    36-Month Buyback Guarantee
                  </Text>
                  <Text style={styles.warrantyDesc}>
                    Assured return value up to 70% within 36 months (70/60/50/40%). Tap to read
                    policy →
                  </Text>
                </View>
              </TouchableOpacity>
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

        {purchaseMode === 'lease' && !hasLeasePrice ? (
          <Button
            title="Request a Quote for Rent / Lease"
            onPress={() => {
              setQuoteModalMode('lease');
              setCorporateModalVisible(true);
            }}
            variant="primary"
            size="md"
            style={{ flex: 1 }}
          />
        ) : (
          <>
            <Button
              title={addToCart.isPending ? 'Adding...' : 'Add to Cart'}
              onPress={() => handleAddToCart()}
              variant="secondary"
              size="md"
              loading={addToCart.isPending}
              disabled={availableStock <= 0 && !allowBackorder}
              style={styles.bottomActionButton}
            />

            <Button
              title={
                availableStock > 0 || allowBackorder
                  ? purchaseMode === 'lease'
                    ? 'Rent Now'
                    : 'Buy Now'
                  : 'Out of Stock'
              }
              onPress={handleBuyNow}
              variant="navy"
              size="md"
              disabled={availableStock <= 0 && !allowBackorder}
              style={styles.bottomActionButton}
            />
          </>
        )}
      </View>

      <CorporateQuoteModal
        visible={corporateModalVisible}
        onClose={() => setCorporateModalVisible(false)}
        prefill={{
          productId: product?.id,
          laptopModel: product?.name,
          mode: quoteModalMode,
          quantity: 5,
        }}
      />
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
  modeSelector: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: radius.md,
    padding: 3,
    gap: 4,
  },
  modeTab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: radius.sm,
  },
  modeTabActive: {
    backgroundColor: colors.cardBg,
    ...shadows.sm,
  },
  modeTabActiveLease: {
    backgroundColor: '#FEF3C7',
    ...shadows.sm,
  },
  modeTabText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  modeTabTextActive: {
    color: colors.primary,
  },
  modeTabTextActiveLease: {
    color: '#92400E',
  },
  perMonthText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
    marginLeft: 2,
  },
  quoteBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  quoteBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#92400E',
  },
  requestQuoteInlineBtn: {
    marginTop: 8,
    backgroundColor: colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radius.md,
    alignSelf: 'flex-start',
  },
  requestQuoteInlineBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  leaseNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFBEB',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.xs,
    marginTop: spacing.xs,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  leaseNoticeText: {
    fontSize: 11,
    color: '#92400E',
    fontWeight: '600',
    flex: 1,
  },
  rentalBreakdown: {
    gap: spacing.xs,
    borderRadius: radius.sm,
    backgroundColor: colors.cardBg,
    padding: spacing.sm,
  },
  rentalBreakdownText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  configContainer: {
    gap: spacing.xs + 2,
  },
  sectionHeaderTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.navy,
  },
  configCardsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  configCard: {
    flex: 1,
    backgroundColor: colors.cardBg,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    gap: 4,
  },
  configCardActive: {
    borderColor: colors.primary,
    backgroundColor: '#EFF6FF',
  },
  configCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  configCardTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  configCardTitleActive: {
    color: colors.primary,
  },
  configCardDesc: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  configCardPrice: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.navy,
    marginTop: 2,
  },
  warrantyBox: {
    marginTop: spacing.xs,
  },
  warrantyToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.cardBg,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  warrantyToggleRowActive: {
    borderColor: colors.primary,
    backgroundColor: '#F5F3FF',
  },
  warrantyToggleTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.navy,
  },
  warrantyToggleSub: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 1,
  },
  warrantyPriceTag: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primary,
  },
  leaseWarrantyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#FFFBEB',
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  leaseWarrantyText: {
    fontSize: 11,
    color: '#92400E',
    fontWeight: '600',
    flex: 1,
  },
  whatsAppShareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: '#DCFCE7',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  whatsAppShareText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#15803D',
  },
  buybackCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
    backgroundColor: '#F0F9FF',
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    ...shadows.sm,
  },
  buybackIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buybackBadge: {
    fontSize: 9,
    fontWeight: '800',
    color: '#0369A1',
    letterSpacing: 0.8,
  },
  buybackTag: {
    fontSize: 9,
    fontWeight: '800',
    color: '#15803D',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  buybackTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.navy,
    marginTop: 1,
  },
  buybackSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  deliveryCard: {
    backgroundColor: '#fff',
    borderRadius: radius.lg,
    padding: spacing.md,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    ...shadows.sm,
    gap: spacing.sm,
  },
  deliveryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deliveryCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.navy,
  },
  pincodeInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  pincodeInput: {
    flex: 1,
    height: 42,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: radius.md,
    paddingHorizontal: 12,
    fontSize: 14,
    color: colors.navy,
  },
  pincodeCheckBtn: {
    backgroundColor: colors.primary,
    height: 42,
    paddingHorizontal: 18,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pincodeCheckBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  pincodeResultBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.md,
    marginTop: 2,
  },
  pincodeResultSuccess: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  pincodeResultError: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  pincodeResultText: {
    fontSize: 12,
    flex: 1,
  },
  pincodeResultTextSuccess: {
    color: '#166534',
    fontWeight: '600',
  },
  pincodeResultTextError: {
    color: '#dc2626',
    fontWeight: '600',
  },
  deliveryPerksList: {
    marginTop: 6,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 10,
  },
  deliveryPerkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deliveryPerkText: {
    fontSize: 12,
    color: '#475569',
  },
});
