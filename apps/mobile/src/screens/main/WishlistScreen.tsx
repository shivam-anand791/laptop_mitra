import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useWishlist, useRemoveWishlistItem, useClearWishlist, useAddToCart } from '../../hooks/useApi';
import { useAuth } from '../../providers/AuthProvider';
import { WishlistItem } from '@laptopmitra/types';
import { MainStackNavigationProp } from '../../navigation/types';

export default function WishlistScreen() {
  const navigation = useNavigation<MainStackNavigationProp>();
  const { isAuthenticated } = useAuth();
  const { data: wishlist, isLoading } = useWishlist();
  const removeItem = useRemoveWishlistItem();
  const clearWishlist = useClearWishlist();
  const addToCart = useAddToCart();

  const formatPrice = (price: number | string) => {
    const num = typeof price === 'string' ? parseFloat(price) : price;
    return `₹${num.toLocaleString('en-IN')}`;
  };

  const handleRemoveItem = (item: WishlistItem) => {
    Alert.alert(
      'Remove from Wishlist',
      `Remove ${item.product?.name ?? 'this item'} from your wishlist?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => removeItem.mutate(item.id),
        },
      ],
    );
  };

  const handleAddToCart = (item: WishlistItem) => {
    if (!item.productId) return;
    addToCart.mutate(
      { productId: item.productId, quantity: 1 },
      {
        onSuccess: () => {
          removeItem.mutate(item.id);
          Alert.alert('Added to Cart', 'Item moved from wishlist to cart');
        },
        onError: (err) => Alert.alert('Error', err.message),
      },
    );
  };

  const handleClearWishlist = () => {
    Alert.alert(
      'Clear Wishlist',
      'Remove all items from your wishlist?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: () => clearWishlist.mutate(),
        },
      ],
    );
  };

  if (!isAuthenticated) {
    return (
      <View style={styles.center}>
        <Ionicons name="heart-outline" size={64} color="#cbd5e1" />
        <Text style={styles.emptyTitle}>Login to view your wishlist</Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  const items = wishlist ?? [];

  if (items.length === 0) {
    return (
      <View style={styles.center}>
        <Ionicons name="heart-outline" size={64} color="#cbd5e1" />
        <Text style={styles.emptyTitle}>Your wishlist is empty</Text>
        <Text style={styles.emptySubtitle}>Save items you love for later</Text>
        <TouchableOpacity style={styles.browseButton} onPress={() => navigation.navigate('MainTabs')}>
          <Text style={styles.browseButtonText}>Browse Store</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const renderItem = ({ item }: { item: WishlistItem }) => {
    const product = item.product;
    const primaryImage = product?.images?.find((img) => img.isPrimary) ?? product?.images?.[0];

    return (
      <View style={styles.wishlistItem}>
        {/* Image */}
        <TouchableOpacity
          style={styles.itemImage}
          onPress={() => navigation.navigate('ProductDetail', { productId: item.productId })}
        >
          {primaryImage ? (
            <Image
              source={{ uri: primaryImage.url }}
              style={styles.image}
              contentFit="cover"
              transition={200}
            />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons name="image-outline" size={24} color="#cbd5e1" />
            </View>
          )}
        </TouchableOpacity>

        {/* Info */}
        <View style={styles.itemInfo}>
          <TouchableOpacity onPress={() => navigation.navigate('ProductDetail', { productId: item.productId })}>
            <Text style={styles.itemName} numberOfLines={2}>
              {product?.name ?? 'Unknown Product'}
            </Text>
          </TouchableOpacity>
          {product?.price != null && (
            <Text style={styles.itemPrice}>{formatPrice(product.price)}</Text>
          )}

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.addToCartButton}
              onPress={() => handleAddToCart(item)}
              disabled={addToCart.isPending}
            >
              {addToCart.isPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.addToCartText}>Add to Cart</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => handleRemoveItem(item)}
            >
              <Ionicons name="trash-outline" size={18} color="#ef4444" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Wishlist ({items.length})</Text>
        <TouchableOpacity onPress={handleClearWishlist}>
          <Text style={styles.clearText}>Clear All</Text>
        </TouchableOpacity>
      </View>

      {/* Wishlist items */}
      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 24,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
  },
  clearText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#ef4444',
  },
  list: {
    padding: 16,
    gap: 12,
  },
  wishlistItem: {
    flexDirection: 'row',
    gap: 12,
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemInfo: {
    flex: 1,
    gap: 4,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    lineHeight: 18,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  addToCartButton: {
    flex: 1,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addToCartText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  removeButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fecaca',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#64748b',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
  },
  browseButton: {
    marginTop: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#2563eb',
    borderRadius: 10,
  },
  browseButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
});
