import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useProducts } from '../../hooks/useApi';
import { Product } from '@laptopmitra/types';
import { MainStackNavigationProp } from '../../navigation/types';
import ProductCard from '../../components/ProductCard';
import { ProductCardSkeleton } from '../../components/Skeleton';

export default function HomeScreen() {
  const navigation = useNavigation<MainStackNavigationProp>();

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

  const navigateToProduct = (productId: string) => {
    navigation.navigate('ProductDetail', { productId });
  };

  const renderProduct = ({ item }: { item: Product }) => (
    <ProductCard product={item} onPress={() => navigateToProduct(item.id)} />
  );

  const renderSectionHeader = (title: string, subtitle?: string) => (
    <View style={styles.sectionHeader}>
      <View>
        <Text style={styles.sectionTitle}>{title}</Text>
        {subtitle && <Text style={styles.sectionSubtitle}>{subtitle}</Text>}
      </View>
    </View>
  );

  const isLoading = featuredLoading && newArrivalsLoading;
  const isRefreshing = isRefetchingFeatured || isRefetchingNewArrivals;

  if (isLoading) {
    return (
      <View style={styles.skeletonContainer}>
        {/* Hero skeleton */}
        <View style={styles.heroBanner} />
        {/* Featured skeleton */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <View style={{ width: 120, height: 20, backgroundColor: '#e2e8f0', borderRadius: 4, marginBottom: 4 }} />
              <View style={{ width: 80, height: 12, backgroundColor: '#e2e8f0', borderRadius: 3 }} />
            </View>
          </View>
          <View style={styles.productList}>
            {Array.from({ length: 3 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </View>
        </View>
        {/* New arrivals skeleton */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <View style={{ width: 140, height: 20, backgroundColor: '#e2e8f0', borderRadius: 4, marginBottom: 4 }} />
              <View style={{ width: 60, height: 12, backgroundColor: '#e2e8f0', borderRadius: 3 }} />
            </View>
          </View>
          <View style={styles.productList}>
            {Array.from({ length: 3 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </View>
        </View>
      </View>
    );
  }

  const featuredProducts = featuredData?.products ?? [];
  const newArrivals = newArrivalsData?.products ?? [];

  return (
    <FlatList
      data={[]}
      renderItem={() => null}
      keyExtractor={() => 'dummy'}
      ListHeaderComponent={
        <View style={styles.container}>
          {/* Search Bar — taps through to Search screen */}
          <TouchableOpacity
            style={styles.searchBar}
            onPress={() => navigation.navigate('Search')}
            activeOpacity={0.7}
          >
            <Ionicons name="search" size={18} color="#94a3b8" />
            <Text style={styles.searchPlaceholder}>Search laptops...</Text>
          </TouchableOpacity>

          {/* Hero Banner */}
          <View style={styles.heroBanner}>
            <View style={styles.heroOverlay}>
              <Text style={styles.heroTitle}>LaptopMitra</Text>
              <Text style={styles.heroSubtitle}>Find the perfect laptop for you</Text>
            </View>
          </View>

          {/* Featured Products */}
          {featuredProducts.length > 0 && (
            <View style={styles.section}>
              {renderSectionHeader('Featured', 'Handpicked for you')}
              <FlatList
                data={featuredProducts}
                renderItem={renderProduct}
                keyExtractor={(item) => item.id}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.productList}
              />
            </View>
          )}

          {/* New Arrivals */}
          {newArrivals.length > 0 && (
            <View style={styles.section}>
              {renderSectionHeader('New Arrivals', 'Just landed')}
              <FlatList
                data={newArrivals}
                renderItem={renderProduct}
                keyExtractor={(item) => item.id}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.productList}
              />
            </View>
          )}

          {/* Empty state */}
          {featuredProducts.length === 0 && newArrivals.length === 0 && (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>No products yet</Text>
              <Text style={styles.emptySubtitle}>Check back soon for new arrivals</Text>
            </View>
          )}
        </View>
      }
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={() => {
            refetchFeatured();
            refetchNewArrivals();
          }}
          tintColor="#2563eb"
        />
      }
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 20,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 44,
    marginHorizontal: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 8,
  },
  searchPlaceholder: {
    fontSize: 15,
    color: '#94a3b8',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  skeletonContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  heroBanner: {
    width: '100%',
    height: 200,
    position: 'relative',
    backgroundColor: '#1e40af',
  },
  heroImage: {
    width: '100%',
    height: '100%',
    opacity: 0.3,
  },
  heroOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: 24,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: 14,
    color: '#bfdbfe',
    marginTop: 4,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  productList: {
    paddingRight: 16,
    gap: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#64748b',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 4,
  },
});
