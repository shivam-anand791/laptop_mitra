import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, TextInput, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useProducts } from '../../hooks/useApi';
import { Product } from '@laptopmitra/types';
import { MainStackNavigationProp } from '../../navigation/types';
import ProductCard from '../../components/ProductCard';
import FilterModal, { FilterState } from '../../components/FilterModal';

const PAGE_SIZE = 20;

type SortOption = 'newest' | 'price_asc' | 'price_desc';

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: Low → High' },
  { value: 'price_desc', label: 'Price: High → Low' },
];

export default function StoreScreen() {
  const navigation = useNavigation<MainStackNavigationProp>();
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
  });

  const params: Record<string, any> = {
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

  const products = data?.products ?? [];
  const total = data?.total ?? 0;
  const hasMore = allProducts.length < total;

  // Append new products to accumulated list
  const displayProducts = offset === 0 ? products : [...allProducts, ...products];

  // Apply client-side sort (API only supports createdAt desc)
  const sortedProducts = [...displayProducts].sort((a, b) => {
    if (sortBy === 'price_asc') {
      return (typeof a.price === 'number' ? a.price : parseFloat(a.price as string)) -
        (typeof b.price === 'number' ? b.price : parseFloat(b.price as string));
    }
    if (sortBy === 'price_desc') {
      return (typeof b.price === 'number' ? b.price : parseFloat(b.price as string)) -
        (typeof a.price === 'number' ? a.price : parseFloat(a.price as string));
    }
    // newest — preserve API order
    return 0;
  });

  const handleSearch = () => {
    setOffset(0);
    setAllProducts([]);
    setAppliedSearch(searchQuery.trim());
  };

  const handleLoadMore = () => {
    if (hasMore && !isLoading) {
      setAllProducts((prev) => {
        const existing = new Set(prev.map((p) => p.id));
        const newProducts = products.filter((p) => !existing.has(p.id));
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

  const renderProduct = ({ item }: { item: Product }) => (
    <ProductCard product={item} onPress={() => navigateToProduct(item.id)} />
  );

  const renderFooter = () => {
    if (!hasMore || products.length === 0) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color="#2563eb" />
      </View>
    );
  };

  const renderEmpty = () => {
    if (isLoading) return null;
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="search-outline" size={48} color="#cbd5e1" />
        <Text style={styles.emptyTitle}>No products found</Text>
        <Text style={styles.emptySubtitle}>
          {appliedSearch ? 'Try a different search term' : 'Check back soon for new arrivals'}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Search bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color="#94a3b8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search laptops..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
            autoCapitalize="none"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => { setSearchQuery(''); setAppliedSearch(''); setOffset(0); setAllProducts([]); }}>
              <Ionicons name="close-circle" size={18} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={styles.sortButton}
          onPress={() => setShowSortPicker(!showSortPicker)}
        >
          <Ionicons name="swap-vertical" size={18} color="#64748b" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.sortButton, (filters.minPrice || filters.maxPrice || filters.stockOnly) && styles.filterActive]}
          onPress={() => setShowFilterModal(true)}
        >
          <Ionicons name="options-outline" size={18} color={(filters.minPrice || filters.maxPrice || filters.stockOnly) ? '#2563eb' : '#64748b'} />
        </TouchableOpacity>
      </View>

      {/* Sort picker */}
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
            >
              <Text style={[styles.sortOptionText, sortBy === option.value && styles.sortOptionTextActive]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Results count */}
      <View style={styles.resultsRow}>
        <Text style={styles.resultsText}>
          {total} product{total !== 1 ? 's' : ''} found
        </Text>
      </View>

      {/* Active filter chips */}
      {(filters.minPrice || filters.maxPrice || filters.stockOnly) && (
        <View style={styles.activeFilters}>
          {filters.minPrice ? (
            <View style={styles.chip}>
              <Text style={styles.chipText}>Min ₹{Number(filters.minPrice).toLocaleString('en-IN')}</Text>
            </View>
          ) : null}
          {filters.maxPrice ? (
            <View style={styles.chip}>
              <Text style={styles.chipText}>Max ₹{Number(filters.maxPrice).toLocaleString('en-IN')}</Text>
            </View>
          ) : null}
          {filters.stockOnly ? (
            <View style={styles.chip}>
              <Text style={styles.chipText}>In Stock</Text>
            </View>
          ) : null}
          <TouchableOpacity
            style={styles.clearChip}
            onPress={() => { setFilters({ minPrice: '', maxPrice: '', stockOnly: false }); setOffset(0); setAllProducts([]); }}
          >
            <Ionicons name="close-circle" size={14} color="#64748b" />
            <Text style={styles.clearChipText}>Clear</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Product grid */}
      <FlatList
        data={sortedProducts}
        renderItem={renderProduct}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.productRow}
        contentContainerStyle={styles.productGrid}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={handleRefresh}
            tintColor="#2563eb"
          />
        }
        showsVerticalScrollIndicator={false}
      />

      <FilterModal
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        onApply={(newFilters) => {
          setFilters(newFilters);
          setOffset(0);
          setAllProducts([]);
        }}
        currentFilters={filters}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 12,
    paddingBottom: 0,
    gap: 8,
    alignItems: 'center',
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1e293b',
    marginLeft: 8,
  },
  sortButton: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sortPicker: {
    flexDirection: 'row',
    padding: 12,
    paddingBottom: 0,
    gap: 8,
  },
  sortOption: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sortOptionActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#2563eb',
  },
  sortOptionText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748b',
  },
  sortOptionTextActive: {
    color: '#2563eb',
    fontWeight: '600',
  },
  resultsRow: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  resultsText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  filterActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#2563eb',
  },
  activeFilters: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 6,
    flexWrap: 'wrap',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: '#eff6ff',
    gap: 4,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#2563eb',
  },
  clearChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    gap: 2,
  },
  clearChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748b',
  },
  productGrid: {
    padding: 12,
    paddingBottom: 20,
  },
  productRow: {
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  footer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#94a3b8',
  },
});
