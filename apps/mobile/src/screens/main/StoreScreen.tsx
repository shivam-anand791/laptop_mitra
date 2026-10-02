import { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useProducts, useAddToCart } from '../../hooks/useApi';
import { useAuth } from '../../providers/AuthProvider';
import { Product } from '@laptopmitra/types';
import { MainStackNavigationProp } from '../../navigation/types';
import ProductCard from '../../components/ProductCard';
import FilterModal, { FilterState } from '../../components/FilterModal';
import Button from '../../components/ui/Button';
import { colors, radius, shadows, spacing, typography } from '../../theme/tokens';

const PAGE_SIZE = 20;

type SortOption = 'newest' | 'price_asc' | 'price_desc';

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: Low → High' },
  { value: 'price_desc', label: 'Price: High → Low' },
];

function normalizeStorageDisplay(val?: string | null): string {
  if (!val) return '';
  const clean = val.trim();
  if (/^256\s*(gb)?(\s*ssd)?$/i.test(clean)) return '256GB SSD';
  if (/^512\s*(gb)?(\s*ssd)?$/i.test(clean)) return '512GB SSD';
  if (
    /^1\s*(tb)?(\s*ssd)?$/i.test(clean) ||
    /^1000\s*(gb)?(\s*ssd)?$/i.test(clean) ||
    /^1024\s*(gb)?(\s*ssd)?$/i.test(clean)
  )
    return '1TB SSD';
  if (/^2\s*(tb)?(\s*ssd)?$/i.test(clean) || /^2000\s*(gb)?(\s*ssd)?$/i.test(clean))
    return '2TB SSD';
  if (/^128\s*(gb)?(\s*ssd)?$/i.test(clean)) return '128GB SSD';
  return clean;
}

function getProductBrand(product: Product): string {
  if (product.metadata?.brand) return product.metadata.brand;
  const name = product.name.toLowerCase();
  if (name.includes('dell')) return 'Dell';
  if (name.includes('hp') || name.includes('hewlett')) return 'HP';
  if (name.includes('lenovo') || name.includes('thinkpad')) return 'Lenovo';
  if (name.includes('apple') || name.includes('macbook')) return 'Apple';
  if (name.includes('asus')) return 'Asus';
  if (name.includes('acer')) return 'Acer';
  return '';
}

function getProductRam(product: Product): string {
  if (product.metadata?.ram) {
    const r = product.metadata.ram.toString().toUpperCase();
    if (r.includes('64')) return '64GB';
    if (r.includes('32')) return '32GB';
    if (r.includes('16')) return '16GB';
    if (r.includes('8')) return '8GB';
    return r;
  }
  const name = product.name.toUpperCase();
  if (name.includes('64GB') || name.includes('64 GB')) return '64GB';
  if (name.includes('32GB') || name.includes('32 GB')) return '32GB';
  if (name.includes('16GB') || name.includes('16 GB')) return '16GB';
  if (name.includes('8GB') || name.includes('8 GB')) return '8GB';
  return '';
}

function getProductStorage(product: Product): string {
  if (product.metadata?.storage) {
    return normalizeStorageDisplay(product.metadata.storage);
  }
  const name = product.name;
  if (/256\s*GB/i.test(name)) return '256GB SSD';
  if (/512\s*GB/i.test(name)) return '512GB SSD';
  if (/1\s*TB/i.test(name)) return '1TB SSD';
  if (/2\s*TB/i.test(name)) return '2TB SSD';
  if (/128\s*GB/i.test(name)) return '128GB SSD';
  return '';
}

export default function StoreScreen() {
  const navigation = useNavigation<MainStackNavigationProp>();
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useAuth();
  const addToCart = useAddToCart();

  const [searchQuery, setSearchQuery] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [offset, setOffset] = useState(0);
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [showSortPicker, setShowSortPicker] = useState(false);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    minPrice: '',
    maxPrice: '',
    stockOnly: false,
    brand: undefined,
    ram: undefined,
    storage: undefined,
  });

  const params: Record<string, string | number | boolean> = {
    limit: PAGE_SIZE,
    offset,
  };

  if (filters.stockOnly) {
    params.stockOnly = true;
  }
  if (filters.minPrice) {
    params.minPrice = Number(filters.minPrice);
  }
  if (filters.maxPrice) {
    params.maxPrice = Number(filters.maxPrice);
  }
  if (appliedSearch) {
    params.search = appliedSearch;
  }

  const { data, isLoading, isRefetching, refetch } = useProducts(params);

  const total = data?.total ?? 0;
  const rawProducts = data?.products ?? [];
  const hasMore = allProducts.length < total;

  // Append new products to accumulated list
  const displayProducts = useMemo(() => {
    const prods = data?.products ?? [];
    return offset === 0 ? prods : [...allProducts, ...prods];
  }, [offset, data?.products, allProducts]);

  // Dynamic Facet Counts
  const { brandCounts, ramCounts, storageCounts } = useMemo(() => {
    const bCounts: Record<string, number> = {};
    const rCounts: Record<string, number> = {};
    const sCounts: Record<string, number> = {};

    displayProducts.forEach((p) => {
      const b = getProductBrand(p).toLowerCase();
      if (b) bCounts[b] = (bCounts[b] || 0) + 1;

      const r = getProductRam(p).toLowerCase();
      if (r) rCounts[r] = (rCounts[r] || 0) + 1;

      const s = getProductStorage(p).toLowerCase();
      if (s) sCounts[s] = (sCounts[s] || 0) + 1;
    });

    return { brandCounts: bCounts, ramCounts: rCounts, storageCounts: sCounts };
  }, [displayProducts]);

  // Client-side brand, ram, storage filtering
  const filteredProducts = useMemo(() => {
    return displayProducts.filter((p) => {
      if (filters.brand) {
        const b = getProductBrand(p).toLowerCase();
        if (b !== filters.brand.toLowerCase()) return false;
      }
      if (filters.ram) {
        const r = getProductRam(p).toLowerCase();
        if (r !== filters.ram.toLowerCase()) return false;
      }
      if (filters.storage) {
        const s = getProductStorage(p).toLowerCase();
        if (s !== filters.storage.toLowerCase()) return false;
      }
      return true;
    });
  }, [displayProducts, filters.brand, filters.ram, filters.storage]);

  // Apply sort
  const sortedProducts = useMemo(() => {
    return [...filteredProducts].sort((a, b) => {
      const priceA = typeof a.price === 'number' ? a.price : parseFloat(a.price as string);
      const priceB = typeof b.price === 'number' ? b.price : parseFloat(b.price as string);

      if (sortBy === 'price_asc') return priceA - priceB;
      if (sortBy === 'price_desc') return priceB - priceA;
      return 0;
    });
  }, [filteredProducts, sortBy]);

  const handleSearch = () => {
    setOffset(0);
    setAllProducts([]);
    setAppliedSearch(searchQuery.trim());
  };

  const handleLoadMore = () => {
    if (hasMore && !isLoading) {
      setAllProducts((prev) => {
        const existing = new Set(prev.map((p) => p.id));
        const newProducts = rawProducts.filter((p) => !existing.has(p.id));
        return [...prev, ...newProducts];
      });
      setOffset((prev) => prev + PAGE_SIZE);
    }
  };

  const handleRefresh = useCallback(() => {
    setOffset(0);
    setAllProducts([]);
    refetch();
  }, [refetch]);

  const navigateToProduct = (productId: string) => {
    navigation.navigate('ProductDetail', { productId });
  };

  const handleQuickAddToCart = (product: Product) => {
    if (!isAuthenticated) {
      Alert.alert('Login Required', 'Please login to add items to your cart.');
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

  const activeFilterCount =
    (filters.minPrice ? 1 : 0) +
    (filters.maxPrice ? 1 : 0) +
    (filters.stockOnly ? 1 : 0) +
    (filters.brand ? 1 : 0) +
    (filters.ram ? 1 : 0) +
    (filters.storage ? 1 : 0);

  const clearAllFilters = () => {
    setFilters({
      minPrice: '',
      maxPrice: '',
      stockOnly: false,
      brand: undefined,
      ram: undefined,
      storage: undefined,
    });
    setOffset(0);
    setAllProducts([]);
  };

  const renderProduct = ({ item }: { item: Product }) => (
    <ProductCard
      product={item}
      width="48%"
      onPress={() => navigateToProduct(item.id)}
      onAddToCart={() => handleQuickAddToCart(item)}
    />
  );

  const renderFooter = () => {
    if (!hasMore || rawProducts.length === 0) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  };

  const renderEmpty = () => {
    if (isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading laptops...</Text>
        </View>
      );
    }
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconCircle}>
          <Ionicons name="search-outline" size={36} color={colors.primary} />
        </View>
        <Text style={styles.emptyTitle}>No matching laptops found</Text>
        <Text style={styles.emptySubtitle}>
          {appliedSearch || activeFilterCount > 0
            ? 'Try adjusting your search or clearing active filters'
            : 'Check back soon for new inventory arrivals'}
        </Text>
        {(appliedSearch || activeFilterCount > 0) && (
          <Button
            title="Reset All Filters"
            onPress={() => {
              setSearchQuery('');
              setAppliedSearch('');
              clearAllFilters();
            }}
            variant="outline"
            size="sm"
            style={{ marginTop: spacing.md }}
          />
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 12) }]}>
      {/* Top Search & Filter Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search laptops by model, CPU..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
            autoCapitalize="none"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                setSearchQuery('');
                setAppliedSearch('');
                setOffset(0);
                setAllProducts([]);
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Sort Button */}
        <TouchableOpacity
          style={[styles.actionButton, showSortPicker && styles.actionButtonActive]}
          onPress={() => setShowSortPicker(!showSortPicker)}
          activeOpacity={0.7}
        >
          <Ionicons
            name="swap-vertical"
            size={18}
            color={showSortPicker ? colors.primary : colors.navy}
          />
        </TouchableOpacity>

        {/* Filter Modal Trigger */}
        <TouchableOpacity
          style={[styles.actionButton, activeFilterCount > 0 && styles.actionButtonActive]}
          onPress={() => setShowFilterModal(true)}
          activeOpacity={0.7}
        >
          <Ionicons
            name="options-outline"
            size={18}
            color={activeFilterCount > 0 ? colors.primary : colors.navy}
          />
          {activeFilterCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Sort Options Strip */}
      {showSortPicker && (
        <View style={styles.sortPicker}>
          {SORT_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[styles.sortOption, sortBy === option.value && styles.sortOptionActive]}
              onPress={() => {
                setSortBy(option.value);
                setShowSortPicker(false);
              }}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.sortOptionText,
                  sortBy === option.value && styles.sortOptionTextActive,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Results Count & Active Filters Strip */}
      <View style={styles.resultsRow}>
        <Text style={styles.resultsText}>
          {sortedProducts.length} {sortedProducts.length === 1 ? 'laptop' : 'laptops'} found
        </Text>
        {activeFilterCount > 0 && (
          <TouchableOpacity onPress={clearAllFilters} hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}>
            <Text style={styles.clearAllText}>Clear all</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Active Filter Chips */}
      {activeFilterCount > 0 && (
        <View style={styles.activeFiltersContainer}>
          <FlatList
            data={[
              filters.brand ? { key: 'brand', label: filters.brand } : null,
              filters.ram ? { key: 'ram', label: filters.ram } : null,
              filters.storage ? { key: 'storage', label: filters.storage } : null,
              filters.minPrice
                ? { key: 'minPrice', label: `Min ₹${Number(filters.minPrice).toLocaleString('en-IN')}` }
                : null,
              filters.maxPrice
                ? { key: 'maxPrice', label: `Max ₹${Number(filters.maxPrice).toLocaleString('en-IN')}` }
                : null,
              filters.stockOnly ? { key: 'stock', label: 'In Stock' } : null,
            ].filter(Boolean) as { key: string; label: string }[]}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item.key}
            renderItem={({ item }) => (
              <View style={styles.chip}>
                <Text style={styles.chipText}>{item.label}</Text>
                <TouchableOpacity
                  onPress={() => {
                    setFilters((prev) => ({
                      ...prev,
                      [item.key === 'stock' ? 'stockOnly' : item.key]:
                        item.key === 'stock' ? false : '',
                    }));
                  }}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  <Ionicons name="close" size={14} color={colors.primary} />
                </TouchableOpacity>
              </View>
            )}
            contentContainerStyle={styles.activeFiltersList}
          />
        </View>
      )}

      {/* Product 2-Column Grid */}
      <FlatList
        data={sortedProducts}
        renderItem={renderProduct}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.productRow}
        contentContainerStyle={[
          styles.productGrid,
          { paddingBottom: Math.max(insets.bottom + 24, 40) },
        ]}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      />

      {/* Filter Bottom Sheet Modal */}
      <FilterModal
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        onApply={(newFilters) => {
          setFilters(newFilters);
          setOffset(0);
          setAllProducts([]);
        }}
        currentFilters={filters}
        brandCounts={brandCounts}
        ramCounts={ramCounts}
        storageCounts={storageCounts}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.pageBg,
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    alignItems: 'center',
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBg,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: 44,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    ...shadows.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: colors.textPrimary,
    marginLeft: spacing.sm,
  },
  actionButton: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    ...shadows.sm,
  },
  actionButtonActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: {
    color: colors.textWhite,
    fontSize: 10,
    fontWeight: '800',
  },
  sortPicker: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    gap: spacing.sm,
  },
  sortOption: {
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  sortOptionActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  sortOptionText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  sortOptionTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  resultsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs + 2,
    paddingBottom: spacing.xs,
  },
  resultsText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  clearAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  activeFiltersContainer: {
    paddingVertical: spacing.xs,
  },
  activeFiltersList: {
    paddingHorizontal: spacing.lg,
    gap: spacing.xs + 2,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: spacing.sm + 2,
    borderRadius: radius.full,
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    gap: 4,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
  },
  productGrid: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  productRow: {
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  footer: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 80,
    gap: spacing.md,
  },
  loadingText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.navy,
  },
  emptySubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
});
