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
import CorporateQuoteModal from '../../components/CorporateQuoteModal';
import BuybackCalculatorModal from '../../components/BuybackCalculatorModal';
import { colors, radius, shadows, spacing, typography } from '../../theme/tokens';
import { RentalTenureMonths } from '@laptopmitra/types';

type ProductDetailRouteProp = RouteProp<MainStackParamList, 'ProductDetail'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const FALLBACK_PRODUCT: any = {
  id: 'prod-dell-latitude-7440',
  name: 'Dell Latitude 7440 (Intel Core i7 13th Gen, 16GB RAM, 512GB SSD, 14" FHD)',
  slug: 'dell-latitude-7440',
  description:
    'Reliable, business-grade laptop for work and productivity. Thoroughly bench-tested across 32 hardware checkpoints with genuine Windows 11 Pro, original Dell 65W USB-C charger, and 6-month comprehensive doorstep warranty.',
  shortDescription: 'Reliable, business-grade laptop for work and productivity.',
  price: 78999,
  compareAtPrice: 165000,
  isFeatured: true,
  isNewArrival: false,
  stock: 10,
  images: [
    {
      id: 'img-1',
      url: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=800&auto=format&fit=crop&q=80',
      isPrimary: true,
    },
    {
      id: 'img-2',
      url: 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=800&auto=format&fit=crop&q=80',
      isPrimary: false,
    },
    {
      id: 'img-3',
      url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&auto=format&fit=crop&q=80',
      isPrimary: false,
    },
    {
      id: 'img-4',
      url: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&auto=format&fit=crop&q=80',
      isPrimary: false,
    },
    {
      id: 'img-5',
      url: 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=800&auto=format&fit=crop&q=80',
      isPrimary: false,
    },
  ],
  category: { id: 'cat-biz', name: 'Business Laptops', slug: 'business-laptops' },
  metadata: {
    processor: 'Intel i7 13th Gen',
    cpu: 'Intel Core i7-1365U (10-Core, up to 5.2 GHz)',
    ram: '16GB DDR5 RAM',
    storage: '512GB PCIe NVMe SSD',
    display: '14" FHD (1920 × 1080)',
    screen: '14.0" FHD IPS Anti-Glare 300 nits',
    graphics: 'Intel Iris Xe Graphics',
    gpu: 'Intel Iris Xe',
    os: 'Windows 11 Pro 64-bit Genuine',
    operatingSystem: 'Windows 11 Pro',
    condition: 'Certified Refurbished',
    grade: 'Grade A+ (Like New)',
  },
};

export default function ProductDetailScreen() {
  const route = useRoute<ProductDetailRouteProp>();
  const navigation = useNavigation<MainStackNavigationProp>();
  const insets = useSafeAreaInsets();
  const { productId } = route.params;
  const { isAuthenticated, user } = useAuth();

  const { data: product, isLoading } = useProduct(productId);
  const { data: supportConfig } = useSupportConfig();
  const addToCart = useAddToCart();
  const { retryCartSync } = useCartSyncState();
  const addToWishlist = useAddToWishlist();
  const removeFromWishlist = useRemoveWishlistItem();
  const { data: wishlist } = useWishlist();

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [corporateModalVisible, setCorporateModalVisible] = useState(false);
  const [quoteModalMode, setQuoteModalMode] = useState<'sell' | 'lease'>('sell');
  const [buybackModalVisible, setBuybackModalVisible] = useState(false);

  // Phase R3 Commercial States
  const [purchaseMode, setPurchaseMode] = useState<'sell' | 'lease'>('sell');
  const [selectedVariantId] = useState('');
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

  const [openAccordion, setOpenAccordion] = useState<{
    assurance: boolean;
    details: boolean;
    specs: boolean;
  }>({
    assurance: true,
    details: false,
    specs: true,
  });

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

  if (isLoading && !product) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading laptop details...</Text>
      </View>
    );
  }

  const activeProduct = product || FALLBACK_PRODUCT;

  const selectedVariant =
    activeProduct.variants?.find((variant: any) => variant.id === selectedVariantId) ??
    activeProduct.variants?.find((variant: any) => variant.isDefault) ??
    activeProduct.variants?.[0];
  const rentalPlans = selectedVariant?.rentalPlans ?? activeProduct.rentalPlans ?? [];
  const activeRentalPlan =
    rentalPlans.find((plan: any) => plan.tenureMonths === selectedRentalTenure) ?? rentalPlans[0];
  const hasLeasePrice = rentalPlans.length > 0;
  const availableStock = selectedVariant?.stock ?? activeProduct.stock ?? 10;
  const allowBackorder = selectedVariant?.allowBackorder ?? activeProduct.allowBackorder ?? false;
  const images: Array<{
    id: string;
    url: string;
    isPrimary: boolean;
    altText?: string | null;
    sortOrder?: number;
  }> = selectedVariant?.images?.length
    ? selectedVariant.images
    : activeProduct.images && activeProduct.images.length > 0
      ? activeProduct.images
      : FALLBACK_PRODUCT.images;

  const priceNum = Number(selectedVariant?.price ?? activeProduct.price ?? 78999);
  const comparePriceNum =
    selectedVariant?.compareAtPrice != null
      ? Number(selectedVariant.compareAtPrice)
      : activeProduct.compareAtPrice
        ? typeof activeProduct.compareAtPrice === 'string'
          ? parseFloat(activeProduct.compareAtPrice)
          : activeProduct.compareAtPrice
        : 165000;

  const hasDiscount = comparePriceNum !== null && comparePriceNum > priceNum;
  const discountPercent = hasDiscount
    ? Math.round(((comparePriceNum! - priceNum) / comparePriceNum!) * 100)
    : 52;

  const meta = activeProduct.metadata || {};
  const condition = meta.condition || meta.grade || 'Certified Refurbished';

  const isLease = purchaseMode === 'lease';
  const currentUnitPrice = isLease ? (activeRentalPlan?.monthlyPrice ?? null) : priceNum;

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
      : '6-Month Comprehensive Doorstep Warranty',
  });
  specItems.push({
    label: 'SKU / Model ID',
    value: activeProduct.sku || activeProduct.id.slice(0, 8).toUpperCase(),
  });

  return (
    <View style={styles.container}>
      {/* Phone 2: Custom Top Sub-Header Bar */}
      <View style={[styles.customHeader, { paddingTop: Math.max(insets.top, 10) }]}>
        <TouchableOpacity
          style={styles.headerIconBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={22} color={colors.navy} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>
          Laptop<Text style={styles.headerTitleAccent}>Mitra</Text>
        </Text>

        <View style={styles.headerRightActions}>
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => navigation.navigate('Search' as any)}
            activeOpacity={0.7}
            accessibilityLabel="Search"
          >
            <Ionicons name="search" size={20} color={colors.navy} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => navigation.navigate('MainTabs', { screen: 'Cart' } as any)}
            activeOpacity={0.7}
            accessibilityLabel="Cart"
          >
            <Ionicons name="cart-outline" size={22} color={colors.navy} />
            <View style={styles.headerCartBadge}>
              <Text style={styles.headerCartBadgeText}>2</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 96, 120) }}
      >
        {/* Phone 2: Main Image Frame with Arrows & Wishlist */}
        <View style={styles.pdpGalleryCard}>
          {/* Wishlist Heart Button on top right */}
          <TouchableOpacity
            style={[styles.floatingWishlistBtn, isWishlisted && styles.floatingWishlistBtnActive]}
            onPress={handleToggleWishlist}
            activeOpacity={0.8}
            accessibilityLabel={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
          >
            <Ionicons
              name={isWishlisted ? 'heart' : 'heart-outline'}
              size={20}
              color={isWishlisted ? colors.danger : colors.navy}
            />
          </TouchableOpacity>

          {/* Main Large Image Swipeable Gallery */}
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            nestedScrollEnabled
            onMomentumScrollEnd={(e) => {
              const offset = e.nativeEvent.contentOffset.x;
              const cardWidth = SCREEN_WIDTH - 32;
              const nextIndex = Math.round(offset / cardWidth);
              if (nextIndex >= 0 && nextIndex < images.length && nextIndex !== activeImageIndex) {
                setActiveImageIndex(nextIndex);
              }
            }}
          >
            {images.map((item, idx) => (
              <View key={item.id || idx} style={[styles.mainImageWrapper, { width: SCREEN_WIDTH - 32 }]}>
                {item.url ? (
                  <Image
                    source={{ uri: item.url }}
                    style={styles.mainImage}
                    contentFit="contain"
                    transition={200}
                  />
                ) : (
                  <Ionicons name="laptop-outline" size={72} color={colors.textMuted} />
                )}
              </View>
            ))}
          </ScrollView>

          {/* Left Arrow Button */}
          {images.length > 1 && (
            <TouchableOpacity
              style={[styles.galleryNavArrow, styles.galleryNavArrowLeft]}
              onPress={() =>
                setActiveImageIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1))
              }
              activeOpacity={0.8}
            >
              <Ionicons name="chevron-back" size={18} color={colors.navy} />
            </TouchableOpacity>
          )}

          {/* Right Arrow Button */}
          {images.length > 1 && (
            <TouchableOpacity
              style={[styles.galleryNavArrow, styles.galleryNavArrowRight]}
              onPress={() =>
                setActiveImageIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0))
              }
              activeOpacity={0.8}
            >
              <Ionicons name="chevron-forward" size={18} color={colors.navy} />
            </TouchableOpacity>
          )}

          {/* Dots Pagination Indicator */}
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

          {/* Thumbnail Selector Strip */}
          {images.length > 1 && (
            <View style={styles.thumbnailStrip}>
              {images.map((item, idx) => (
                <TouchableOpacity
                  key={item.id || idx}
                  style={[
                    styles.thumbSquare,
                    activeImageIndex === idx && styles.thumbSquareActive,
                  ]}
                  onPress={() => setActiveImageIndex(idx)}
                  activeOpacity={0.7}
                >
                  <Image source={{ uri: item.url }} style={styles.thumbImage} contentFit="contain" />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Product Details Section */}
        <View style={styles.infoBlock}>
          {/* Badges Row: BEST SELLER + CERTIFIED REFURBISHED */}
          <View style={styles.badgesRow}>
            <View style={styles.amberBadge}>
              <Text style={styles.amberBadgeText}>BEST SELLER</Text>
            </View>
            <View style={styles.greenBadge}>
              <Text style={styles.greenBadgeText}>CERTIFIED REFURBISHED</Text>
            </View>
          </View>

          {/* Title & Subtitle */}
          <Text style={styles.productTitle}>{activeProduct.name}</Text>
          <Text style={styles.productSubtitle}>
            {activeProduct.shortDescription ||
              'Reliable, business-grade laptop for work and productivity.'}
          </Text>

          {/* Rating & Certified Row */}
          <View style={styles.ratingRow}>
            <View style={styles.starsGroup}>
              <Ionicons name="star" size={15} color="#F59E0B" />
              <Text style={styles.ratingScore}>4.8</Text>
              <Text style={styles.ratingReviews}>(268 reviews)</Text>
            </View>
            <Text style={styles.ratingDivider}>|</Text>
            <View style={styles.certifiedBadgeGroup}>
              <Ionicons name="shield-checkmark" size={15} color="#16A34A" />
              <Text style={styles.certifiedBadgeText}>Certified Refurbished</Text>
            </View>
          </View>

          {/* Price & Discount Row */}
          <View style={styles.priceRowMain}>
            <Text style={styles.mainPriceText}>{formatPrice(currentUnitPrice!)}</Text>
            {comparePriceNum && comparePriceNum > priceNum && (
              <Text style={styles.comparePriceText}>{formatPrice(comparePriceNum)}</Text>
            )}
            {hasDiscount && (
              <View style={styles.discountPill}>
                <Text style={styles.discountPillText}>{discountPercent}% OFF</Text>
              </View>
            )}
          </View>

          {/* EMI Banner */}
          <View style={styles.emiBannerCard}>
            <View style={styles.emiLeft}>
              <Ionicons name="card-outline" size={16} color={colors.primary} />
              <Text style={styles.emiText}>
                EMI from <Text style={styles.emiBold}>₹2,416/month</Text>
              </Text>
            </View>
            <TouchableOpacity
              onPress={() =>
                Alert.alert(
                  'EMI Options',
                  'Flexible 3, 6, 9 & 12-month low-cost EMI available at checkout with all major Indian credit & debit cards.',
                )
              }
              activeOpacity={0.7}
            >
              <Text style={styles.emiViewPlans}>View Plans →</Text>
            </TouchableOpacity>
          </View>

          {/* Key Specifications (4-Card Grid) */}
          <View style={styles.keySpecsSection}>
            <Text style={styles.sectionHeaderTitle}>Key Specifications</Text>
            <View style={styles.specsGridRow}>
              <View style={styles.specGridCard}>
                <Ionicons name="hardware-chip-outline" size={20} color={colors.navy} />
                <Text style={styles.specGridCardTitle} numberOfLines={1}>
                  {meta.processor || 'Intel i7'}
                </Text>
                <Text style={styles.specGridCardSub} numberOfLines={1}>
                  13th Gen
                </Text>
              </View>
              <View style={styles.specGridCard}>
                <Ionicons name="server-outline" size={20} color={colors.navy} />
                <Text style={styles.specGridCardTitle} numberOfLines={1}>
                  {meta.ram || '16GB'}
                </Text>
                <Text style={styles.specGridCardSub} numberOfLines={1}>
                  DDR5 RAM
                </Text>
              </View>
              <View style={styles.specGridCard}>
                <Ionicons name="save-outline" size={20} color={colors.navy} />
                <Text style={styles.specGridCardTitle} numberOfLines={1}>
                  {meta.storage || '512GB'}
                </Text>
                <Text style={styles.specGridCardSub} numberOfLines={1}>
                  SSD
                </Text>
              </View>
              <View style={styles.specGridCard}>
                <Ionicons name="tv-outline" size={20} color={colors.navy} />
                <Text style={styles.specGridCardTitle} numberOfLines={1}>
                  {meta.display || '14" FHD'}
                </Text>
                <Text style={styles.specGridCardSub} numberOfLines={1}>
                  (1920 × 1080)
                </Text>
              </View>
            </View>
          </View>

          {/* 3-Item Assurance Strip */}
          <View style={styles.assuranceStrip}>
            <View style={styles.assuranceItem}>
              <Ionicons name="shield-checkmark" size={18} color={colors.primary} />
              <Text style={styles.assuranceItemText}>6-Month Warranty</Text>
            </View>
            <View style={styles.assuranceItem}>
              <Ionicons name="car-outline" size={18} color={colors.primary} />
              <Text style={styles.assuranceItemText}>Pan-India Delivery</Text>
            </View>
            <View style={styles.assuranceItem}>
              <Ionicons name="sync" size={18} color={colors.primary} />
              <Text style={styles.assuranceItemText}>7-Day Return</Text>
            </View>
          </View>

          {/* Expandable Accordions */}
          <View style={styles.accordionsSection}>
            {/* Accordion 1: LaptopMitra Assurance */}
            <TouchableOpacity
              style={styles.accordionHeader}
              onPress={() =>
                setOpenAccordion((prev) => ({ ...prev, assurance: !prev.assurance }))
              }
              activeOpacity={0.7}
            >
              <View style={styles.accordionTitleRow}>
                <Ionicons name="shield-checkmark" size={18} color={colors.primary} />
                <Text style={styles.accordionTitle}>LaptopMitra Assurance</Text>
              </View>
              <Ionicons
                name={openAccordion.assurance ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={colors.textMuted}
              />
            </TouchableOpacity>
            {openAccordion.assurance && (
              <View style={styles.accordionBody}>
                <Text style={styles.accordionText}>
                  Every certified laptop undergoes our rigorous 32-point hardware bench-testing, battery
                  calibration (&gt;80% health), thermal stress-testing, and certified sanitization. Backed
                  by our 6-month comprehensive doorstep warranty with pan-India coverage.
                </Text>
              </View>
            )}

            {/* Accordion 2: Product Details */}
            <TouchableOpacity
              style={styles.accordionHeader}
              onPress={() =>
                setOpenAccordion((prev) => ({ ...prev, details: !prev.details }))
              }
              activeOpacity={0.7}
            >
              <View style={styles.accordionTitleRow}>
                <Ionicons name="document-text-outline" size={18} color={colors.navy} />
                <Text style={styles.accordionTitle}>Product Details</Text>
              </View>
              <Ionicons
                name={openAccordion.details ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={colors.textMuted}
              />
            </TouchableOpacity>
            {openAccordion.details && (
              <View style={styles.accordionBody}>
                <Text style={styles.accordionText}>
                  {activeProduct.description ||
                    activeProduct.shortDescription ||
                    'Engineered for premium performance and reliable enterprise everyday productivity. Clean OS installation with original drivers and lifetime activation.'}
                </Text>
              </View>
            )}

            {/* Accordion 3: Specifications */}
            <TouchableOpacity
              style={styles.accordionHeader}
              onPress={() =>
                setOpenAccordion((prev) => ({ ...prev, specs: !prev.specs }))
              }
              activeOpacity={0.7}
            >
              <View style={styles.accordionTitleRow}>
                <Ionicons name="options-outline" size={18} color={colors.navy} />
                <Text style={styles.accordionTitle}>Specifications</Text>
              </View>
              <Ionicons
                name={openAccordion.specs ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={colors.textMuted}
              />
            </TouchableOpacity>
            {openAccordion.specs && (
              <View style={styles.accordionBody}>
                {specItems.map((spec, index) => (
                  <View key={index} style={styles.specTableRow}>
                    <Text style={styles.specTableLabel}>{spec.label}</Text>
                    <Text style={styles.specTableValue}>{spec.value}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

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
                setHasWarranty(false);
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
            onPress={() => setBuybackModalVisible(true)}
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
                Calculate guaranteed return value up to 36 months (70% → 20%)
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 2 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#0284C7' }}>Check →</Text>
            </View>
          </TouchableOpacity>

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
        </View>
      </ScrollView>

      {/* Phone 2: Sticky Bottom Action Bar with 2 Buttons */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <TouchableOpacity
          style={styles.bottomAddToCartBtn}
          onPress={() => handleAddToCart()}
          activeOpacity={0.8}
          disabled={availableStock <= 0 && !allowBackorder}
        >
          <Ionicons name="cart-outline" size={18} color={colors.primary} />
          <Text style={styles.bottomAddToCartText}>
            {addToCart.isPending ? 'Adding...' : 'Add to Cart'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.bottomBuyNowBtn}
          onPress={handleBuyNow}
          activeOpacity={0.8}
          disabled={availableStock <= 0 && !allowBackorder}
        >
          <Ionicons name="flash" size={18} color="#FFFFFF" />
          <Text style={styles.bottomBuyNowText}>
            {availableStock > 0 || allowBackorder ? 'Buy Now' : 'Out of Stock'}
          </Text>
        </TouchableOpacity>
      </View>

      <CorporateQuoteModal
        visible={corporateModalVisible}
        onClose={() => setCorporateModalVisible(false)}
        prefill={{
          ...(activeProduct?.id ? { productId: String(activeProduct.id) } : {}),
          ...(activeProduct?.name ? { laptopModel: String(activeProduct.name) } : {}),
          mode: quoteModalMode,
          quantity: 5,
        }}
      />

      <BuybackCalculatorModal
        visible={buybackModalVisible}
        onClose={() => setBuybackModalVisible(false)}
        productPrice={priceNum}
        productName={String(activeProduct?.name || 'Laptop')}
        onViewFullPolicy={() => navigation.navigate('BuybackGuarantee')}
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
  customHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    backgroundColor: colors.pageBg,
  },
  headerIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.navy,
    letterSpacing: -0.3,
  },
  headerTitleAccent: {
    color: colors.primary,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerCartBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: colors.primary,
    borderRadius: 10,
    width: 17,
    height: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCartBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
  },
  pdpGalleryCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.xs,
    backgroundColor: colors.cardBg,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
    position: 'relative',
    ...shadows.sm,
  },
  floatingWishlistBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    ...shadows.sm,
  },
  floatingWishlistBtnActive: {
    borderColor: colors.danger,
    backgroundColor: colors.dangerLight,
  },
  mainImageWrapper: {
    width: '100%',
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainImage: {
    width: '90%',
    height: '100%',
  },
  galleryNavArrow: {
    position: 'absolute',
    top: '45%',
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
    ...shadows.sm,
  },
  galleryNavArrowLeft: {
    left: 10,
  },
  galleryNavArrowRight: {
    right: 10,
  },
  thumbnailStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorderLight,
  },
  thumbSquare: {
    width: 48,
    height: 48,
    borderRadius: radius.sm,
    backgroundColor: colors.creamDarker,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbSquareActive: {
    borderColor: colors.primary,
    borderWidth: 2,
    backgroundColor: colors.cardBg,
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  amberBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  amberBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#D97706',
    letterSpacing: 0.5,
  },
  greenBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  greenBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#15803D',
    letterSpacing: 0.5,
  },
  productSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    marginTop: -4,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  starsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingScore: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.navy,
  },
  ratingReviews: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  ratingDivider: {
    fontSize: 13,
    color: colors.cardBorder,
  },
  certifiedBadgeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  certifiedBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#15803D',
  },
  priceRowMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  mainPriceText: {
    fontSize: 26,
    fontWeight: '900',
    color: colors.navy,
  },
  comparePriceText: {
    fontSize: 15,
    color: colors.textMuted,
    textDecorationLine: 'line-through',
  },
  discountPill: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  discountPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#15803D',
  },
  emiBannerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.cardBg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: 12,
    paddingVertical: 10,
    ...shadows.sm,
  },
  emiLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  emiText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  emiBold: {
    fontWeight: '700',
    color: colors.navy,
  },
  emiViewPlans: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  keySpecsSection: {
    marginTop: 4,
    gap: 8,
  },
  specsGridRow: {
    flexDirection: 'row',
    gap: 8,
  },
  specGridCard: {
    flex: 1,
    backgroundColor: colors.cardBg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    ...shadows.sm,
  },
  specGridCardTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.navy,
    marginTop: 4,
    textAlign: 'center',
  },
  specGridCardSub: {
    fontSize: 10,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  assuranceStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.cardBg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: 12,
    paddingVertical: 10,
    ...shadows.sm,
  },
  assuranceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  assuranceItemText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.navy,
  },
  accordionsSection: {
    gap: 8,
    marginTop: 4,
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.cardBg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: 14,
    paddingVertical: 12,
    ...shadows.sm,
  },
  accordionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  accordionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.navy,
  },
  accordionBody: {
    backgroundColor: colors.cardBg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.cardBorderLight,
    padding: 12,
    marginTop: -4,
  },
  accordionText: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  specTableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorderLight,
  },
  specTableLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  specTableValue: {
    fontSize: 12,
    color: colors.navy,
    fontWeight: '700',
    maxWidth: '60%',
    textAlign: 'right',
  },
  bottomAddToCartBtn: {
    flex: 1,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.cardBg,
    borderWidth: 1.5,
    borderColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  bottomAddToCartText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  bottomBuyNowBtn: {
    flex: 1,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...shadows.sm,
  },
  bottomBuyNowText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
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
    backgroundColor: '#F5F5F7',
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
  warrantyBox: {},
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
