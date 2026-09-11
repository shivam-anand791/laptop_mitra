import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useProduct, useAddToCart, useAddToWishlist } from '../../hooks/useApi';
import { useAuth } from '../../providers/AuthProvider';
import { MainStackParamList } from '../../navigation/types';

type ProductDetailRouteProp = RouteProp<MainStackParamList, 'ProductDetail'>;

export default function ProductDetailScreen() {
  const route = useRoute<ProductDetailRouteProp>();
  const navigation = useNavigation();
  const { productId } = route.params;
  const { isAuthenticated } = useAuth();

  const { data: product, isLoading, error } = useProduct(productId);
  const addToCart = useAddToCart();
  const addToWishlist = useAddToWishlist();

  const formatPrice = (price: number | string) => {
    const num = typeof price === 'string' ? parseFloat(price) : price;
    return `₹${num.toLocaleString('en-IN')}`;
  };

  const handleAddToCart = () => {
    if (!isAuthenticated) {
      Alert.alert('Login Required', 'Please login to add items to your cart.');
      return;
    }
    addToCart.mutate(
      { productId, quantity: 1 },
      {
        onSuccess: () => Alert.alert('Added', 'Item added to cart'),
        onError: (err) => Alert.alert('Error', err.message),
      },
    );
  };

  const handleAddToWishlist = () => {
    if (!isAuthenticated) {
      Alert.alert('Login Required', 'Please login to add items to your wishlist.');
      return;
    }
    addToWishlist.mutate(productId, {
      onSuccess: () => Alert.alert('Added', 'Item added to wishlist'),
      onError: (err) => Alert.alert('Error', err.message),
    });
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (error || !product) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Product not found</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const primaryImage = product.images?.find((img) => img.isPrimary) ?? product.images?.[0];
  const hasDiscount =
    product.compareAtPrice &&
    (typeof product.compareAtPrice === 'number'
      ? product.compareAtPrice > (typeof product.price === 'number' ? product.price : parseFloat(product.price))
      : parseFloat(product.compareAtPrice) > parseFloat(product.price as string));

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Image */}
        <View style={styles.imageContainer}>
          {primaryImage ? (
            <Image
              source={{ uri: primaryImage.url }}
              style={styles.image}
              contentFit="cover"
              transition={300}
            />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons name="image-outline" size={64} color="#cbd5e1" />
            </View>
          )}
        </View>

        {/* Content */}
        <View style={styles.content}>
          <Text style={styles.name}>{product.name}</Text>

          {product.category && (
            <Text style={styles.category}>{product.category.name}</Text>
          )}

          {/* Price */}
          <View style={styles.priceRow}>
            <Text style={styles.price}>{formatPrice(product.price)}</Text>
            {hasDiscount && (
              <>
                <Text style={styles.compareAtPrice}>{formatPrice(product.compareAtPrice!)}</Text>
                <View style={styles.discountBadge}>
                  <Text style={styles.discountText}>
                    {Math.round(
                      ((parseFloat(product.compareAtPrice as string) - parseFloat(product.price as string)) /
                        parseFloat(product.compareAtPrice as string)) *
                        100,
                    )}
                    % OFF
                  </Text>
                </View>
              </>
            )}
          </View>

          {/* Stock */}
          <View style={styles.stockRow}>
            <View style={[styles.stockDot, { backgroundColor: product.stock > 0 ? '#22c55e' : '#ef4444' }]} />
            <Text style={[styles.stockText, { color: product.stock > 0 ? '#16a34a' : '#dc2626' }]}>
              {product.stock > 0 ? `In Stock (${product.stock} available)` : 'Out of Stock'}
            </Text>
          </View>

          {/* Description */}
          {product.description && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Description</Text>
              <Text style={styles.description}>{product.description}</Text>
            </View>
          )}

          {/* Specs from metadata */}
          {product.metadata && typeof product.metadata === 'object' && Object.keys(product.metadata).length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Specifications</Text>
              {Object.entries(product.metadata).map(([key, value]) => (
                <View key={key} style={styles.specRow}>
                  <Text style={styles.specKey}>{key}</Text>
                  <Text style={styles.specValue}>{String(value)}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Tags */}
          {product.tags && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Tags</Text>
              <View style={styles.tagsRow}>
                {product.tags.split(',').map((tag) => (
                  <View key={tag.trim()} style={styles.tag}>
                    <Text style={styles.tagText}>{tag.trim()}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Bottom action bar */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.wishlistButton}
          onPress={handleAddToWishlist}
          disabled={addToWishlist.isPending}
        >
          <Ionicons name="heart-outline" size={22} color="#2563eb" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.addToCartButton, product.stock <= 0 && styles.addToCartDisabled]}
          onPress={handleAddToCart}
          disabled={addToCart.isPending || product.stock <= 0}
        >
          {addToCart.isPending ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.addToCartText}>
              {product.stock > 0 ? 'Add to Cart' : 'Out of Stock'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
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
  },
  imageContainer: {
    width: '100%',
    height: 320,
    backgroundColor: '#f8fafc',
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
  content: {
    padding: 20,
    gap: 16,
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0f172a',
    lineHeight: 28,
  },
  category: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  price: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0f172a',
  },
  compareAtPrice: {
    fontSize: 16,
    color: '#94a3b8',
    textDecorationLine: 'line-through',
  },
  discountBadge: {
    backgroundColor: '#dcfce7',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  discountText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#16a34a',
  },
  stockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stockDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  stockText: {
    fontSize: 13,
    fontWeight: '600',
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
  },
  description: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 22,
  },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  specKey: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
    flex: 1,
  },
  specValue: {
    fontSize: 13,
    color: '#1e293b',
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: '#eff6ff',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tagText: {
    fontSize: 12,
    color: '#2563eb',
    fontWeight: '500',
  },
  bottomBar: {
    flexDirection: 'row',
    padding: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    gap: 12,
    backgroundColor: '#fff',
  },
  wishlistButton: {
    width: 52,
    height: 52,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  addToCartButton: {
    flex: 1,
    height: 52,
    borderRadius: 12,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addToCartDisabled: {
    backgroundColor: '#94a3b8',
  },
  addToCartText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  errorText: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 16,
  },
  backButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#2563eb',
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});
