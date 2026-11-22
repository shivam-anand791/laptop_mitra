import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useProducts, useCategories, useAddToCart, useCartSyncState, MOBILE_CART_ERROR_MESSAGE } from '../../hooks/useApi';
import { useAuth } from '../../providers/AuthProvider';
import { Product, Category } from '@laptopmitra/types';
import { MainStackNavigationProp } from '../../navigation/types';
import ProductCard from '../../components/ProductCard';
import { ProductCardSkeleton } from '../../components/Skeleton';
import SectionHeader from '../../components/ui/SectionHeader';
import TrustStrip from '../../components/ui/TrustStrip';
import Button from '../../components/ui/Button';
import CorporateQuoteModal from '../../components/CorporateQuoteModal';
import { DataErrorView } from '../../components/DataErrorView';
import { colors, radius, shadows, spacing, typography } from '../../theme/tokens';

const getCategoryIcon = (slugOrName: string): keyof typeof Ionicons.glyphMap => {
  const s = slugOrName.toLowerCase();
  if (s.includes('business')) return 'briefcase';
  if (s.includes('student')) return 'school';
  if (s.includes('gaming')) return 'game-controller';
  if (s.includes('apple') || s.includes('macbook')) return 'logo-apple';
  if (s.includes('premium') || s.includes('ultra')) return 'sparkles';
  return 'laptop';
};

const goldStandardPromises = [
  {
    id: 'buyback',
    title: '14 Days Return &\nBuyback Assurance',
    subtitle: 'Up to 70% assured value',
    icon: 'shield-checkmark' as const,
    color: '#0284C7',
    badge: 'Assured',
    route: 'BuybackGuarantee' as const,
  },
  {
    id: 'price',
    title: 'Price Value\nGuarantee',
    subtitle: 'Direct certified market rates',
    icon: 'pricetag' as const,
    color: '#D97706',
    badge: 'Fair Price',
  },
  {
    id: 'security',
    title: 'Enterprise Data\nSecurity',
    subtitle: 'NIST 800-88 certified wiping',
    icon: 'lock-closed' as const,
    color: '#16A34A',
    badge: 'Security',
  },
  {
    id: 'warranty',
    title: '1-Year Comprehensive\nWarranty',
    subtitle: 'Doorstep replacement support',
    icon: 'ribbon' as const,
    color: '#2563EB',
    badge: 'Warranty',
  },
  {
    id: 'like-new',
    title: 'Like New Assured\nGrade A+',
    subtitle: 'Zero functional defects',
    icon: 'sparkles' as const,
    color: '#0D9488',
    badge: 'Grade A+',
  },
  {
    id: 'performance',
    title: 'Performance\nGuarantee',
    subtitle: '32-point hardware bench-tested',
    icon: 'speedometer' as const,
    color: '#059669',
    badge: '32-Point',
  },
];

const customerTestimonials = [
  {
    name: 'Rajesh Sharma',
    role: 'IT Consultant, Bengaluru',
    product: 'ThinkPad T480 (i7, 16GB, 512GB)',
    text: 'Received in pristine condition with 94% battery health. Saved more than ₹45,000 compared to new. LaptopMitra gave our firm complete peace of mind.',
    rating: 5,
  },
  {
    name: 'Pooja Iyer',
    role: 'Product Designer, Pune',
    product: 'Apple MacBook Pro 14" M1 Pro',
    text: 'Zero scratches, perfect Retina display, and the battery lasts a full day of Figma work. Prompt delivery with tamper-proof packaging.',
    rating: 5,
  },
  {
    name: 'Vikram Mehta',
    role: 'Startup Founder, Gurugram',
    product: 'Dell Latitude 7490 (Batch of 6)',
    text: 'Equipped our engineering team through LaptopMitra’s bulk program. Saved 60% on our IT hardware budget with prompt warranty support.',
    rating: 5,
  },
];

const MOBILE_LIVE_TICKER = [
  '🔥 Rajesh S. from Bengaluru ordered ThinkPad T480 (Saved ₹45k)',
  '⚡ Pooja I. from Pune claimed MacBook Pro M1 with 1-Year Warranty',
  '🛡️ 12 Dell Latitudes dispatched to corporate client in Gurugram',
  '📦 Express Delivery: Order #LM-8842 dispatched via Insured Air Courier',
];

export default function HomeScreen() {
  const navigation = useNavigation<MainStackNavigationProp>();
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useAuth();
  const addToCart = useAddToCart();
  const { retryCartSync } = useCartSyncState();
  const [corporateModalVisible, setCorporateModalVisible] = useState(false);
  const [dealTimeLeft, setDealTimeLeft] = useState({ hours: 14, minutes: 28, seconds: 50 });
  const [liveIndex, setLiveIndex] = useState(0);

  useEffect(() => {
    const ticker = setInterval(() => {
      setLiveIndex((prev) => (prev + 1) % MOBILE_LIVE_TICKER.length);
    }, 3800);
    return () => clearInterval(ticker);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setDealTimeLeft((prev) => {
        let { hours, minutes, seconds } = prev;
        if (seconds > 0) {
          seconds--;
        } else if (minutes > 0) {
          minutes--;
          seconds = 59;
        } else if (hours > 0) {
          hours--;
          minutes = 59;
          seconds = 59;
        }
        return { hours, minutes, seconds };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const {
    data: featuredData,
    isLoading: featuredLoading,
    error: featuredError,
    refetch: refetchFeatured,
    isRefetching: isRefetchingFeatured,
  } = useProducts({ featured: true, limit: 10 });

  const {
    data: newArrivalsData,
    isLoading: newArrivalsLoading,
    error: newArrivalsError,
    refetch: refetchNewArrivals,
    isRefetching: isRefetchingNewArrivals,
  } = useProducts({ newArrival: true, limit: 10 });

  const {
    data: categoriesData,
    isLoading: categoriesLoading,
    error: categoriesError,
    refetch: refetchCategories,
    isRefetching: isRefetchingCategories,
  } = useCategories();

  const navigateToProduct = (productId: string) => {
    navigation.navigate('ProductDetail', { productId });
  };

  const handleQuickAddToCart = (product: Product) => {
    if (!isAuthenticated) {
      Alert.alert('Login Required', 'Please login to add items to your cart.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Login', onPress: () => navigation.navigate('Auth' as any) },
      ]);
      return;
    }
    addToCart.mutate(
      { productId: product.id, quantity: 1 },
      {
        onSuccess: () => Alert.alert('Added to Cart', `${product.name} added to your cart.`),
        onError: () =>
          Alert.alert('Cart Update', MOBILE_CART_ERROR_MESSAGE, [
            { text: 'Dismiss', style: 'cancel' },
            { text: 'Retry', onPress: () => void retryCartSync() },
          ]),
      },
    );
  };

  const renderHorizontalProduct = ({ item }: { item: Product }) => (
    <ProductCard
      product={item}
      width={175}
      onPress={() => navigateToProduct(item.id)}
      onAddToCart={() => handleQuickAddToCart(item)}
    />
  );

  const renderCategoryItem = ({ item }: { item: Category }) => {
    const iconName = getCategoryIcon(item.slug || item.name);
    return (
      <TouchableOpacity
        style={styles.categoryCard}
        onPress={() => {
          navigation.navigate('MainTabs', {
            screen: 'Store',
            params: { categoryId: item.id, categoryName: item.name },
          } as any);
        }}
        activeOpacity={0.7}
      >
        <View style={styles.categoryIconWrap}>
          <Ionicons name={iconName} size={20} color={colors.primary} />
        </View>
        <Text style={styles.categoryName} numberOfLines={1}>
          {item.name}
        </Text>
        {item._count?.products !== undefined && (
          <Text style={styles.categoryCount}>{item._count.products} items</Text>
        )}
      </TouchableOpacity>
    );
  };

  const isLoading = featuredLoading && newArrivalsLoading && categoriesLoading;
  const isRefreshing = isRefetchingFeatured || isRefetchingNewArrivals || isRefetchingCategories;

  const categories = Array.isArray(categoriesData)
    ? categoriesData
    : (categoriesData && 'categories' in (categoriesData as object)
        ? (categoriesData as { categories: Category[] }).categories
        : []);
  const featuredProducts = featuredData?.products ?? [];
  const newArrivals = newArrivalsData?.products ?? [];

  if (isLoading) {
    return (
      <View style={[styles.skeletonContainer, { paddingTop: insets.top }]}>
        <View style={styles.headerBar}>
          <View style={styles.brandTitleWrap}>
            <Text style={styles.brandTitle}>Laptop<Text style={styles.brandHighlight}>Mitra</Text></Text>
          </View>
        </View>
        <View style={styles.searchBarSkeleton} />
        <View style={styles.heroSkeleton} />
        <View style={styles.section}>
          <View style={{ width: 140, height: 20, backgroundColor: '#e2e8f0', borderRadius: 4, marginBottom: 12 }} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.productList}>
            {Array.from({ length: 3 }).map((_, i) => (
              <View key={i} style={{ width: 175 }}>
                <ProductCardSkeleton />
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    );
  }

  const hasDataError = Boolean(featuredError || newArrivalsError || categoriesError);
  if (hasDataError && featuredProducts.length === 0 && newArrivals.length === 0 && categories.length === 0) {
    return (
      <View style={[styles.root, { paddingTop: insets.top, justifyContent: 'center', flex: 1 }]}>
        <DataErrorView
          error={featuredError || newArrivalsError || categoriesError}
          onRetry={() => {
            void refetchFeatured();
            void refetchNewArrivals();
            void refetchCategories();
          }}
        />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[
        styles.container,
        {
          paddingTop: Math.max(insets.top, 12),
          paddingBottom: Math.max(insets.bottom + 16, 32),
        },
      ]}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={() => {
            refetchFeatured();
            refetchNewArrivals();
            refetchCategories();
          }}
          tintColor={colors.primary}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Top Header Bar */}
      <View style={styles.headerBar}>
        <View style={styles.brandTitleWrap}>
          <Text style={styles.brandTitle}>
            Laptop<Text style={styles.brandHighlight}>Mitra</Text>
          </Text>
          <View style={styles.verifiedPill}>
            <Ionicons name="checkmark-circle" size={12} color={colors.green} />
            <Text style={styles.verifiedText}>Certified Store</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.headerIconButton}
          onPress={() => navigation.navigate('MitraDashboard')}
          activeOpacity={0.7}
        >
          <Ionicons name="people-outline" size={20} color={colors.navy} />
        </TouchableOpacity>
      </View>

      {/* Live Activity Social Proof Bar */}
      <View style={styles.liveTickerBar}>
        <View style={styles.livePulseDot} />
        <Text style={styles.liveTickerText} numberOfLines={1}>
          {MOBILE_LIVE_TICKER[liveIndex]}
        </Text>
      </View>

      {/* Search Bar — Taps to SearchScreen */}
      <TouchableOpacity
        style={styles.searchBar}
        onPress={() => navigation.navigate('Search')}
        activeOpacity={0.8}
        accessibilityRole="search"
        accessibilityLabel="Search products"
      >
        <Ionicons name="search" size={18} color={colors.textSecondary} />
        <Text style={styles.searchPlaceholder}>Search brands, specs, budget...</Text>
        <View style={styles.searchFilterIcon}>
          <Ionicons name="options-outline" size={16} color={colors.primary} />
        </View>
      </TouchableOpacity>

      {/* Navy Hero Banner */}
      <View style={styles.heroContainer}>
        <View style={styles.heroCard}>
          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeText}>ENTERPRISE GRADE REFURBISHED</Text>
          </View>
          <Text style={styles.heroTitle}>Certified Laptops for Your Business</Text>
          <Text style={styles.heroSubtitle}>
            Save up to 70% with 32-point tested laptops backed by 1-year warranty.
          </Text>
          <View style={styles.heroActions}>
            <Button
              title="Explore Laptops"
              onPress={() => navigation.navigate('MainTabs', { screen: 'Store' } as any)}
              variant="primary"
              size="sm"
              icon={<Ionicons name="arrow-forward" size={14} color="#FFF" />}
              iconPosition="right"
            />
            <TouchableOpacity
              style={styles.heroSecondaryAction}
              onPress={() => navigation.navigate('MitraDashboard')}
              activeOpacity={0.7}
            >
              <Text style={styles.heroSecondaryText}>Mitra Partner →</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Quick Purpose Shortcuts Grid */}
      <View style={styles.quickShortcutsRow}>
        <TouchableOpacity
          style={styles.shortcutChip}
          onPress={() => navigation.navigate('MainTabs', { screen: 'Store', params: { categoryName: 'Business' } } as any)}
          activeOpacity={0.7}
        >
          <Ionicons name="briefcase-outline" size={14} color={colors.primary} />
          <Text style={styles.shortcutChipText}>Business</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.shortcutChip}
          onPress={() => navigation.navigate('MainTabs', { screen: 'Store', params: { categoryName: 'Student' } } as any)}
          activeOpacity={0.7}
        >
          <Ionicons name="school-outline" size={14} color={colors.primary} />
          <Text style={styles.shortcutChipText}>Under ₹25k</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.shortcutChip}
          onPress={() => navigation.navigate('MainTabs', { screen: 'Store', params: { categoryName: 'Apple' } } as any)}
          activeOpacity={0.7}
        >
          <Ionicons name="logo-apple" size={14} color={colors.primary} />
          <Text style={styles.shortcutChipText}>MacBooks</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.shortcutChip}
          onPress={() => navigation.navigate('BuybackGuarantee')}
          activeOpacity={0.7}
        >
          <Ionicons name="shield-checkmark-outline" size={14} color="#059669" />
          <Text style={[styles.shortcutChipText, { color: '#059669' }]}>Buyback 70%</Text>
        </TouchableOpacity>
      </View>

      {/* Trust Strip */}
      <TrustStrip style={styles.trustStrip} />

      {/* Shop by Category */}
      {categories.length > 0 && (
        <View style={styles.section}>
          <SectionHeader
            title="Shop by Category"
            subtitle="Explore tested devices by segment"
            style={{ marginBottom: spacing.sm }}
          />
          <FlatList
            data={categories}
            renderItem={renderCategoryItem}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryList}
          />
        </View>
      )}

      {/* Featured Deal of the Day Banner */}
      <View style={styles.dealContainer}>
        <View style={styles.dealCard}>
          <View style={styles.dealBadgeRow}>
            <View style={styles.dealBadge}>
              <View style={styles.dealPingDot} />
              <Text style={styles.dealBadgeText}>FEATURED DAILY DEAL</Text>
            </View>
            <View style={styles.discountPill}>
              <Text style={styles.discountPillText}>45% OFF</Text>
            </View>
          </View>

          <Text style={styles.dealTitle}>ThinkPad Executive Ultrabook</Text>
          <Text style={styles.dealSpecs}>Intel Core i7 • 16GB RAM • 512GB SSD • Grade A+ Pristine</Text>

          {/* Quick Hardware Spec Pills */}
          <View style={styles.dealSpecChipsRow}>
            <View style={styles.dealSpecChip}>
              <Text style={styles.dealSpecChipText}>⚡ Intel Core i7</Text>
            </View>
            <View style={styles.dealSpecChip}>
              <Text style={styles.dealSpecChipText}>💾 16GB Dual RAM</Text>
            </View>
            <View style={styles.dealSpecChip}>
              <Text style={styles.dealSpecChipText}>🚀 512GB SSD</Text>
            </View>
            <View style={styles.dealSpecChip}>
              <Text style={styles.dealSpecChipText}>🔋 94% Battery</Text>
            </View>
          </View>

          {/* Claimed Batch Progress */}
          <View style={styles.dealProgressWrap}>
            <View style={styles.dealProgressHeader}>
              <Text style={styles.dealProgressText}>🔥 84% Claimed Today</Text>
              <Text style={styles.dealStockText}>Only 3 units left</Text>
            </View>
            <View style={styles.dealProgressBarBg}>
              <View style={styles.dealProgressBarFill} />
            </View>
          </View>

          {/* Countdown Clock */}
          <View style={styles.timerRow}>
            <Text style={styles.timerLabel}>ENDS IN:</Text>
            <View style={styles.timerBoxes}>
              <View style={styles.timerBox}>
                <Text style={styles.timerNum}>{String(dealTimeLeft.hours).padStart(2, '0')}</Text>
                <Text style={styles.timerUnit}>HRS</Text>
              </View>
              <Text style={styles.timerColon}>:</Text>
              <View style={styles.timerBox}>
                <Text style={styles.timerNum}>{String(dealTimeLeft.minutes).padStart(2, '0')}</Text>
                <Text style={styles.timerUnit}>MINS</Text>
              </View>
              <Text style={styles.timerColon}>:</Text>
              <View style={styles.timerBox}>
                <Text style={styles.timerNum}>{String(dealTimeLeft.seconds).padStart(2, '0')}</Text>
                <Text style={styles.timerUnit}>SECS</Text>
              </View>
            </View>
          </View>

          <View style={styles.dealPriceRow}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
              <Text style={styles.dealPrice}>₹36,999</Text>
              <Text style={styles.dealMrp}>₹68,000</Text>
            </View>
            <TouchableOpacity
              style={styles.dealActionBtn}
              onPress={() => navigation.navigate('MainTabs', { screen: 'Store' } as any)}
              activeOpacity={0.8}
            >
              <Text style={styles.dealActionBtnText}>Explore Deal →</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Featured Laptops Carousel */}
      {featuredProducts.length > 0 && (
        <View style={styles.section}>
          <SectionHeader
            title="Featured Laptops"
            subtitle="Handpicked business & professional models"
            actionText="View All"
            onActionPress={() => navigation.navigate('MainTabs')}
            style={{ marginBottom: spacing.sm }}
          />
          <FlatList
            data={featuredProducts}
            renderItem={renderHorizontalProduct}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.productList}
          />
        </View>
      )}

      {/* Hot Deals & New Arrivals Carousel */}
      {newArrivals.length > 0 && (
        <View style={styles.section}>
          <SectionHeader
            title="New Arrivals & Hot Deals"
            subtitle="Freshly certified units in stock"
            actionText="View All"
            onActionPress={() => navigation.navigate('MainTabs')}
            style={{ marginBottom: spacing.sm }}
          />
          <FlatList
            data={newArrivals}
            renderItem={renderHorizontalProduct}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.productList}
          />
        </View>
      )}

      {/* The Gold Standard Quality Promise (with interactive Buyback Guarantee link) */}
      <View style={styles.section}>
        <SectionHeader
          title="The Gold Standard"
          subtitle="Enterprise certification & customer assurances"
          style={{ marginBottom: spacing.sm }}
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.goldStandardScroll}
        >
          {goldStandardPromises.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.goldCard}
              onPress={() => {
                if (item.route) {
                  navigation.navigate(item.route as any);
                } else {
                  navigation.navigate('MainTabs', { screen: 'Store' } as any);
                }
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.goldIconWrap, { backgroundColor: item.color + '15' }]}>
                <Ionicons name={item.icon} size={22} color={item.color} />
              </View>
              <View style={[styles.goldBadge, { backgroundColor: item.color + '20' }]}>
                <Text style={[styles.goldBadgeText, { color: item.color }]}>{item.badge}</Text>
              </View>
              <Text style={styles.goldTitle}>{item.title}</Text>
              <Text style={styles.goldSubtitle}>{item.subtitle}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Verified Customer Testimonials Carousel */}
      <View style={styles.section}>
        <SectionHeader
          title="Verified Buyer Reviews"
          subtitle="What IT managers and creators say about LaptopMitra"
          style={{ marginBottom: spacing.sm }}
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.testimonialScroll}
        >
          {customerTestimonials.map((review, i) => (
            <View key={i} style={styles.testimonialCard}>
              <View style={styles.starRow}>
                <View style={{ flexDirection: 'row', gap: 2 }}>
                  {Array.from({ length: review.rating }).map((_, starIdx) => (
                    <Ionicons key={starIdx} name="star" size={13} color="#EAB308" />
                  ))}
                </View>
                <Text style={styles.verifiedBuyerTag}>Verified Purchase</Text>
              </View>
              <Text style={styles.testimonialText} numberOfLines={4}>
                "{review.text}"
              </Text>
              <View style={styles.testimonialUserRow}>
                <View style={styles.testimonialAvatar}>
                  <Text style={styles.testimonialAvatarText}>{review.name.charAt(0)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.testimonialName}>{review.name}</Text>
                  <Text style={styles.testimonialRole} numberOfLines={1}>{review.role}</Text>
                  <Text style={styles.testimonialProduct} numberOfLines={1}>{review.product}</Text>
                </View>
              </View>
            </View>
          ))}
        </ScrollView>
      </View>

      {/* Assurance Card */}
      <View style={styles.assuranceCard}>
        <View style={styles.assuranceHeader}>
          <Ionicons name="shield-checkmark" size={24} color={colors.primary} />
          <Text style={styles.assuranceTitle}>The LaptopMitra Standard</Text>
        </View>
        <Text style={styles.assuranceBody}>
          Every laptop undergoes rigorous 32-point hardware, screen, keyboard, battery, and stress diagnostic tests.
        </Text>
        <View style={styles.assuranceGrid}>
          <View style={styles.assurancePill}>
            <Ionicons name="checkmark-circle-outline" size={14} color={colors.green} />
            <Text style={styles.assurancePillText}>100% Genuine OS</Text>
          </View>
          <View style={styles.assurancePill}>
            <Ionicons name="checkmark-circle-outline" size={14} color={colors.green} />
            <Text style={styles.assurancePillText}>GST Invoicing</Text>
          </View>
          <View style={styles.assurancePill}>
            <Ionicons name="checkmark-circle-outline" size={14} color={colors.green} />
            <Text style={styles.assurancePillText}>Pan-India Delivery</Text>
          </View>
          <View style={styles.assurancePill}>
            <Ionicons name="checkmark-circle-outline" size={14} color={colors.green} />
            <Text style={styles.assurancePillText}>Affiliate Rewards</Text>
          </View>
        </View>

        {/* Corporate Fleet Procurement & Leasing Card */}
        <View style={styles.corporateBanner}>
          <Text style={styles.corporateBannerTag}>B2B &amp; LEASING SOLUTIONS</Text>
          <Text style={styles.corporateBannerTitle}>Bulk Laptops for Growing Teams</Text>
          <Text style={styles.corporateBannerSubtitle}>
            Unlock tiered wholesale volume rates up to 25% OFF, customized OS imaging, tax invoices where applicable, and monthly leasing.
          </Text>
          <TouchableOpacity
            style={styles.corporateBannerBtn}
            onPress={() => setCorporateModalVisible(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.corporateBannerBtnText}>Request Corporate Quote →</Text>
          </TouchableOpacity>
        </View>
      </View>

      <CorporateQuoteModal
        visible={corporateModalVisible}
        onClose={() => setCorporateModalVisible(false)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.pageBg,
  },
  container: {
    backgroundColor: colors.pageBg,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    marginBottom: spacing.xs,
  },
  brandTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.navy,
    letterSpacing: -0.5,
  },
  brandHighlight: {
    color: colors.primary,
  },
  verifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.greenLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  verifiedText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.greenText,
  },
  headerIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.cardBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBg,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: 44,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    gap: spacing.sm,
    ...shadows.sm,
  },
  searchBarSkeleton: {
    height: 44,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: '#E2E8F0',
    borderRadius: radius.md,
  },
  heroSkeleton: {
    height: 160,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    backgroundColor: '#E2E8F0',
    borderRadius: radius.xl,
  },
  searchPlaceholder: {
    flex: 1,
    fontSize: 13,
    color: colors.textSecondary,
  },
  searchFilterIcon: {
    paddingLeft: spacing.xs,
  },
  skeletonContainer: {
    flex: 1,
    backgroundColor: colors.pageBg,
  },
  heroContainer: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  heroCard: {
    backgroundColor: '#0A192F',
    borderRadius: radius.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(37, 99, 235, 0.25)',
    ...shadows.md,
  },
  heroBadge: {
    backgroundColor: 'rgba(37, 99, 235, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.35)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs + 1,
    borderRadius: radius.full,
    alignSelf: 'flex-start',
    marginBottom: spacing.sm,
  },
  heroBadgeText: {
    color: '#93C5FD',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textWhite,
    lineHeight: 26,
  },
  heroSubtitle: {
    fontSize: 12,
    color: '#CBD5E1',
    lineHeight: 17,
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  heroActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  heroSecondaryAction: {
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.sm,
  },
  heroSecondaryText: {
    color: '#93C5FD',
    fontSize: 13,
    fontWeight: '600',
  },
  trustStrip: {
    marginBottom: 0,
  },
  section: {
    marginTop: spacing.xl,
  },
  productList: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.xs,
  },
  categoryList: {
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xs,
  },
  categoryCard: {
    backgroundColor: colors.cardBg,
    borderRadius: radius.lg,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    minWidth: 92,
    ...shadows.sm,
  },
  categoryIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  categoryName: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.navy,
  },
  categoryCount: {
    fontSize: 10,
    fontWeight: '500',
    color: colors.textMuted,
    marginTop: 1,
  },
  assuranceCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.xl,
    backgroundColor: colors.cardBg,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    ...shadows.sm,
  },
  assuranceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  assuranceTitle: {
    ...typography.h3,
    color: colors.navy,
  },
  assuranceBody: {
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 16,
    marginBottom: spacing.md,
  },
  assuranceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs + 2,
  },
  assurancePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  assurancePillText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  corporateBanner: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.navy,
    borderRadius: radius.md,
  },
  corporateBannerTag: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: '#38BDF8',
    marginBottom: 4,
  },
  corporateBannerTitle: {
    ...typography.h3,
    color: colors.textWhite,
    marginBottom: 4,
  },
  corporateBannerSubtitle: {
    ...typography.caption,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 16,
    marginBottom: spacing.sm,
  },
  corporateBannerBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 9,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  corporateBannerBtnText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.textWhite,
  },

  /* ── Featured Deal of the Day Styles (Flagship Midnight Navy Card) ── */
  dealContainer: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xl,
    marginBottom: 0,
  },
  dealCard: {
    backgroundColor: '#0B1F4B',
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.35)',
    ...shadows.md,
  },
  dealBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  dealBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(37, 99, 235, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(96, 165, 250, 0.4)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  dealPingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#60A5FA',
  },
  dealBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#93C5FD',
    letterSpacing: 0.6,
  },
  discountPill: {
    backgroundColor: '#16A34A',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  discountPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textWhite,
  },
  dealTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textWhite,
    marginTop: 2,
  },
  dealSpecs: {
    fontSize: 11,
    color: '#CBD5E1',
    marginTop: 2,
    marginBottom: 2,
  },
  dealSpecChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginVertical: spacing.xs + 2,
  },
  dealSpecChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  dealSpecChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textWhite,
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginVertical: spacing.xs + 2,
  },
  timerLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#93C5FD',
    letterSpacing: 0.6,
  },
  timerBoxes: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  timerBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: radius.sm,
    paddingHorizontal: 7,
    paddingVertical: 3,
    alignItems: 'center',
    minWidth: 38,
  },
  timerNum: {
    fontSize: 13,
    fontWeight: '900',
    color: colors.textWhite,
    fontVariant: ['tabular-nums'],
  },
  timerUnit: {
    fontSize: 7,
    fontWeight: '700',
    color: '#93C5FD',
  },
  timerColon: {
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.5)',
  },
  dealPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    marginTop: spacing.xs,
  },
  dealPrice: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.textWhite,
  },
  dealMrp: {
    fontSize: 12,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  dealActionBtn: {
    backgroundColor: '#2563EB',
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.md,
    ...shadows.sm,
  },
  dealActionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  /* ── Gold Standard Trust Cards ── */
  goldStandardScroll: {
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xs,
  },
  goldCard: {
    backgroundColor: colors.cardBg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
    width: 160,
    ...shadows.sm,
    justifyContent: 'space-between',
  },
  goldIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  goldBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.xs,
    marginBottom: spacing.xs,
  },
  goldBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  goldTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.navy,
    lineHeight: 16,
    marginBottom: 2,
  },
  goldSubtitle: {
    fontSize: 10,
    color: colors.textSecondary,
    lineHeight: 14,
  },

  /* ── Verified Customer Testimonials ── */
  testimonialScroll: {
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xs,
  },
  testimonialCard: {
    backgroundColor: colors.cardBg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
    width: 250,
    ...shadows.sm,
    justifyContent: 'space-between',
  },
  starRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  verifiedBuyerTag: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.greenText,
  },
  testimonialText: {
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 16,
    fontStyle: 'italic',
    marginBottom: spacing.sm,
  },
  testimonialUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  testimonialAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  testimonialAvatarText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primary,
  },
  testimonialName: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.navy,
  },
  testimonialRole: {
    fontSize: 9,
    color: colors.textMuted,
  },
  testimonialProduct: {
    fontSize: 9,
    fontWeight: '600',
    color: colors.primary,
  },
  liveTickerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0F172A',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radius.full,
  },
  livePulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  liveTickerText: {
    flex: 1,
    fontSize: 10,
    fontWeight: '600',
    color: '#E2E8F0',
  },
  quickShortcutsRow: {
    flexDirection: 'row',
    gap: spacing.xs + 2,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  shortcutChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.md,
    paddingVertical: 8,
    ...shadows.sm,
  },
  shortcutChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.navy,
  },
  dealProgressWrap: {
    marginVertical: spacing.xs,
    gap: 3,
  },
  dealProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dealProgressText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FDE047',
  },
  dealStockText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#93C5FD',
  },
  dealProgressBarBg: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  dealProgressBarFill: {
    height: '100%',
    width: '84%',
    backgroundColor: '#F59E0B',
    borderRadius: 2,
  },
});
