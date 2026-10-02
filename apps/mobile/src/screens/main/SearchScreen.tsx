import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Keyboard,
  RefreshControl,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useProducts, useAddToCart } from '../../hooks/useApi';
import { useAuth } from '../../providers/AuthProvider';
import { Product } from '@laptopmitra/types';
import { MainStackNavigationProp } from '../../navigation/types';
import ProductCard from '../../components/ProductCard';
import { colors, radius, shadows, spacing, typography } from '../../theme/tokens';

const RECENT_SEARCHES_KEY = 'lm_recent_searches';
const MAX_RECENT = 10;
const DEBOUNCE_MS = 300;

const POPULAR_SEARCHES = ['Dell Latitude', 'Lenovo ThinkPad', 'HP EliteBook', '16GB RAM', 'Core i7', 'Under ₹30,000'];

export default function SearchScreen() {
  const navigation = useNavigation<MainStackNavigationProp>();
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useAuth();
  const addToCart = useAddToCart();

  const [query, setQuery] = useState('');
  const [appliedQuery, setAppliedQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [showRecent, setShowRecent] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    loadRecentSearches();
    setTimeout(() => inputRef.current?.focus(), 100);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const loadRecentSearches = async () => {
    try {
      const stored = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
      if (stored) setRecentSearches(JSON.parse(stored));
    } catch (e) {
      void e;
    }
  };

  const saveRecentSearch = async (term: string) => {
    try {
      const trimmed = term.trim();
      if (!trimmed) return;
      const updated = [trimmed, ...recentSearches.filter((s) => s !== trimmed)].slice(0, MAX_RECENT);
      setRecentSearches(updated);
      await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    } catch (e) {
      void e;
    }
  };

  const removeRecentSearch = async (term: string) => {
    try {
      const updated = recentSearches.filter((s) => s !== term);
      setRecentSearches(updated);
      await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    } catch (e) {
      void e;
    }
  };

  const clearRecentSearches = async () => {
    setRecentSearches([]);
    await AsyncStorage.removeItem(RECENT_SEARCHES_KEY);
  };

  const handleTextChange = (text: string) => {
    setQuery(text);
    setShowRecent(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (text.trim().length === 0) {
      setAppliedQuery('');
      setShowRecent(true);
      return;
    }
    debounceRef.current = setTimeout(() => {
      setAppliedQuery(text.trim());
    }, DEBOUNCE_MS);
  };

  const handleSearch = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = query.trim();
    if (trimmed) {
      setAppliedQuery(trimmed);
      saveRecentSearch(trimmed);
      setShowRecent(false);
      Keyboard.dismiss();
    }
  };

  const handleSuggestionTap = (term: string) => {
    setQuery(term);
    setAppliedQuery(term);
    saveRecentSearch(term);
    setShowRecent(false);
    Keyboard.dismiss();
  };

  const { data, isLoading, isRefetching, refetch } = useProducts(
    appliedQuery ? { search: appliedQuery, limit: 40 } : undefined,
  );

  const products = data?.products ?? [];
  const total = data?.total ?? 0;

  const navigateToProduct = (productId: string) => {
    if (appliedQuery) saveRecentSearch(appliedQuery);
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

  const renderProduct = ({ item }: { item: Product }) => (
    <ProductCard
      product={item}
      width="48%"
      onPress={() => navigateToProduct(item.id)}
      onAddToCart={() => handleQuickAddToCart(item)}
    />
  );

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 12) }]}>
      {/* Search Bar Row */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={colors.textSecondary} />
          <TextInput
            ref={inputRef}
            style={styles.searchInput}
            placeholder="Search by model, brand, processor..."
            placeholderTextColor={colors.textMuted}
            value={query}
            onChangeText={handleTextChange}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {query.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                setQuery('');
                setAppliedQuery('');
                setShowRecent(true);
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {showRecent ? (
        <View style={styles.suggestionsContainer}>
          {/* Popular searches */}
          <View style={styles.popularSection}>
            <Text style={styles.sectionHeaderTitle}>Popular Searches</Text>
            <View style={styles.tagGrid}>
              {POPULAR_SEARCHES.map((term) => (
                <TouchableOpacity
                  key={term}
                  style={styles.popularTag}
                  onPress={() => handleSuggestionTap(term)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="trending-up" size={12} color={colors.primary} />
                  <Text style={styles.popularTagText}>{term}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Recent searches */}
          {recentSearches.length > 0 && (
            <View style={styles.recentSection}>
              <View style={styles.recentHeader}>
                <Text style={styles.sectionHeaderTitle}>Recent Searches</Text>
                <TouchableOpacity onPress={clearRecentSearches} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                  <Text style={styles.clearAllText}>Clear all</Text>
                </TouchableOpacity>
              </View>
              {recentSearches.map((term) => (
                <TouchableOpacity
                  key={term}
                  style={styles.recentItem}
                  onPress={() => handleSuggestionTap(term)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
                  <Text style={styles.recentText} numberOfLines={1}>
                    {term}
                  </Text>
                  <TouchableOpacity
                    onPress={() => removeRecentSearch(term)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="close-circle" size={16} color={colors.textMuted} />
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      ) : isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Searching certified inventory...</Text>
        </View>
      ) : products.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <Ionicons name="search-outline" size={36} color={colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>No results for &ldquo;{appliedQuery}&rdquo;</Text>
          <Text style={styles.emptySubtitle}>
            Try searching by brand (e.g. Dell, Lenovo), processor (i5, i7), or budget.
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.resultsInfo}>
            <Text style={styles.resultsText}>
              {total} {total === 1 ? 'laptop' : 'laptops'} found for &ldquo;{appliedQuery}&rdquo;
            </Text>
          </View>
          <FlatList
            data={products}
            renderItem={renderProduct}
            keyExtractor={(item) => item.id}
            numColumns={2}
            columnWrapperStyle={styles.productRow}
            contentContainerStyle={[
              styles.productGrid,
              { paddingBottom: Math.max(insets.bottom + 24, 36) },
            ]}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
            }
          />
        </>
      )}
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
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.md,
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
  cancelBtn: {
    paddingVertical: spacing.xs,
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  suggestionsContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.lg,
  },
  popularSection: {
    backgroundColor: colors.cardBg,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    ...shadows.sm,
  },
  sectionHeaderTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.navy,
    marginBottom: spacing.sm,
  },
  tagGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs + 2,
  },
  popularTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 1,
  },
  popularTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  recentSection: {
    backgroundColor: colors.cardBg,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    ...shadows.sm,
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  clearAllText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorderLight,
  },
  recentText: {
    flex: 1,
    fontSize: 13,
    color: colors.textPrimary,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
  },
  loadingText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
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
    textAlign: 'center',
  },
  emptySubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  resultsInfo: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xs,
  },
  resultsText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  productGrid: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  productRow: {
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
});
