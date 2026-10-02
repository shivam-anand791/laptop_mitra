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
import { useProducts, useCategories, useAddToCart } from '../../hooks/useApi';
import { useAuth } from '../../providers/AuthProvider';
import { Product, Category } from '@laptopmitra/types';
import { MainStackNavigationProp } from '../../navigation/types';
import ProductCard from '../../components/ProductCard';
import { ProductCardSkeleton } from '../../components/Skeleton';
import SectionHeader from '../../components/ui/SectionHeader';
import TrustStrip from '../../components/ui/TrustStrip';
import Button from '../../components/ui/Button';
import { colors, radius, shadows, spacing, typography } from '../../theme/tokens';

export default function HomeScreen() {
  const navigation = useNavigation<MainStackNavigationProp>();
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useAuth();
  const addToCart = useAddToCart();

  const {
    data: featuredData,
    isLoading: featuredLoading,
    refetch: refetchFeatured,
    isRefetching: isRefetchingFeatured,
  } = useProducts({ featured: true, limit: 10 });

  const {
    data: newArrivalsData,
    isLoading: newArrivalsLoading,
    refetch: refetchNewArrivals,
    isRefetching: isRefetchingNewArrivals,
  } = useProducts({ newArrival: true, limit: 10 });

  const {
    data: categoriesData,
    isLoading: categoriesLoading,
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
        { text: 'Login', onPress: () => navigation.navigate('MainTabs') },
      ]);
      return;
    }
    addToCart.mutate(
      { productId: product.id, quantity: 1 },
      {
        onSuccess: () => Alert.alert('Added to Cart', `${product.name} added to your cart.`),
        onError: (err) => Alert.alert('Error', err.message),
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

  const renderCategoryItem = ({ item }: { item: Category }) => (
    <TouchableOpacity
      style={styles.categoryCard}
      onPress={() => {
        // Navigate to store tab
        navigation.navigate('MainTabs');
      }}
      activeOpacity={0.7}
    >
      <View style={styles.categoryIconWrap}>
        <Ionicons name="laptop" size={20} color={colors.primary} />
      </View>
      <Text style={styles.categoryName} numberOfLines={1}>
        {item.name}
      </Text>
      {item._count?.products !== undefined && (
        <Text style={styles.categoryCount}>{item._count.products} items</Text>
      )}
    </TouchableOpacity>
  );

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
              onPress={() => navigation.navigate('MainTabs')}
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

      {/* Trust Strip */}
      <TrustStrip style={styles.trustStrip} />

      {/* Shop by Category */}
      {categories.length > 0 && (
        <View style={styles.section}>
          <SectionHeader
            title="Shop by Category"
            subtitle="Explore tested devices by segment"
            style={{ paddingHorizontal: 0, marginBottom: spacing.sm }}
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

      {/* Featured Laptops Carousel */}
      {featuredProducts.length > 0 && (
        <View style={styles.section}>
          <SectionHeader
            title="Featured Laptops"
            subtitle="Handpicked business & professional models"
            actionText="View All"
            onActionPress={() => navigation.navigate('MainTabs')}
            style={{ paddingHorizontal: 0 }}
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
            style={{ paddingHorizontal: 0 }}
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
      </View>
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
    backgroundColor: colors.navy,
    borderRadius: radius.xl,
    padding: spacing.xl,
    ...shadows.md,
  },
  heroBadge: {
    backgroundColor: 'rgba(29, 111, 242, 0.25)',
    borderWidth: 1,
    borderColor: 'rgba(29, 111, 242, 0.5)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs + 1,
    borderRadius: radius.xs,
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
    marginBottom: spacing.lg,
  },
  section: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  productList: {
    paddingRight: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.xs,
  },
  categoryList: {
    gap: spacing.sm,
    paddingRight: spacing.lg,
    paddingBottom: spacing.xs,
  },
  categoryCard: {
    backgroundColor: colors.cardBg,
    borderRadius: radius.md,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    minWidth: 90,
    ...shadows.sm,
  },
  categoryIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primaryLight,
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
});
