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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useProducts } from '../../hooks/useApi';
import { Product } from '@laptopmitra/types';
import { MainStackNavigationProp } from '../../navigation/types';
import ProductCard from '../../components/ProductCard';

const RECENT_SEARCHES_KEY = 'lm_recent_searches';
const MAX_RECENT = 10;
const DEBOUNCE_MS = 300;

export default function SearchScreen() {
  const navigation = useNavigation<MainStackNavigationProp>();
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
    } catch {}
  };

  const saveRecentSearch = async (term: string) => {
    try {
      const trimmed = term.trim();
      if (!trimmed) return;
      const updated = [trimmed, ...recentSearches.filter((s) => s !== trimmed)].slice(0, MAX_RECENT);
      setRecentSearches(updated);
      await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    } catch {}
  };

  const removeRecentSearch = async (term: string) => {
    try {
      const updated = recentSearches.filter((s) => s !== term);
      setRecentSearches(updated);
      await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    } catch {}
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

  const handleRecentTap = (term: string) => {
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

  const renderProduct = ({ item }: { item: Product }) => (
    <ProductCard product={item} onPress={() => navigateToProduct(item.id)} />
  );

  const renderSearchBar = () => (
    <View style={styles.searchContainer}>
      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color="#94a3b8" />
        <TextInput
          ref={inputRef}
          style={styles.searchInput}
          placeholder="Search laptops..."
          value={query}
          onChangeText={handleTextChange}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => { setQuery(''); setAppliedQuery(''); setShowRecent(true); }}>
            <Ionicons name="close-circle" size={18} color="#94a3b8" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderRecentSearches = () => {
    if (recentSearches.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="search-outline" size={48} color="#e2e8f0" />
          <Text style={styles.emptyTitle}>Search for laptops</Text>
          <Text style={styles.emptySubtitle}>Find the perfect laptop by name, brand, or specs</Text>
        </View>
      );
    }

    return (
      <View style={styles.recentSection}>
        <View style={styles.recentHeader}>
          <Text style={styles.recentTitle}>Recent Searches</Text>
          <TouchableOpacity onPress={clearRecentSearches}>
            <Text style={styles.clearAllText}>Clear all</Text>
          </TouchableOpacity>
        </View>
        {recentSearches.map((term) => (
          <TouchableOpacity key={term} style={styles.recentItem} onPress={() => handleRecentTap(term)}>
            <Ionicons name="time-outline" size={18} color="#94a3b8" />
            <Text style={styles.recentText} numberOfLines={1}>{term}</Text>
            <TouchableOpacity
              onPress={() => removeRecentSearch(term)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close-circle" size={18} color="#cbd5e1" />
            </TouchableOpacity>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {renderSearchBar()}

      {showRecent ? (
        renderRecentSearches()
      ) : isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Searching...</Text>
        </View>
      ) : products.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="search-outline" size={48} color="#e2e8f0" />
          <Text style={styles.emptyTitle}>No results for "{appliedQuery}"</Text>
          <Text style={styles.emptySubtitle}>Try different keywords or check spelling</Text>
        </View>
      ) : (
        <>
          <View style={styles.resultsInfo}>
            <Text style={styles.resultsText}>
              {total} result{total !== 1 ? 's' : ''} for "{appliedQuery}"
            </Text>
          </View>
          <FlatList
            data={products}
            renderItem={renderProduct}
            keyExtractor={(item) => item.id}
            numColumns={2}
            columnWrapperStyle={styles.productRow}
            contentContainerStyle={styles.productGrid}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#2563eb" />
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
    backgroundColor: '#fff',
  },
  searchContainer: {
    padding: 12,
    paddingBottom: 4,
  },
  searchBar: {
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
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#64748b',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#475569',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
  },
  recentSection: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  recentTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
  },
  clearAllText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#2563eb',
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  recentText: {
    flex: 1,
    fontSize: 15,
    color: '#334155',
  },
  resultsInfo: {
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  resultsText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  productGrid: {
    padding: 12,
    paddingBottom: 20,
  },
  productRow: {
    justifyContent: 'space-between',
    marginBottom: 12,
  },
});
