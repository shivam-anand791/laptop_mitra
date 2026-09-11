import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Product } from '@laptopmitra/types';

interface ProductCardProps {
  product: Product;
  onPress: () => void;
}

export default function ProductCard({ product, onPress }: ProductCardProps) {
  const formatPrice = (price: number | string) => {
    const num = typeof price === 'string' ? parseFloat(price) : price;
    return `₹${num.toLocaleString('en-IN')}`;
  };

  const primaryImage = product.images?.find((img) => img.isPrimary) ?? product.images?.[0];
  const hasDiscount =
    product.compareAtPrice &&
    (typeof product.compareAtPrice === 'number'
      ? product.compareAtPrice > (typeof product.price === 'number' ? product.price : parseFloat(product.price))
      : parseFloat(product.compareAtPrice) > parseFloat(product.price as string));

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.imageContainer}>
        {primaryImage ? (
          <Image
            source={{ uri: primaryImage.url }}
            style={styles.image}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Ionicons name="image-outline" size={32} color="#cbd5e1" />
          </View>
        )}
        {hasDiscount && (
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
        )}
        {product.isNewArrival && (
          <View style={styles.newBadge}>
            <Text style={styles.newBadgeText}>NEW</Text>
          </View>
        )}
      </View>
      <View style={styles.info}>
        {product.category && (
          <Text style={styles.category} numberOfLines={1}>
            {product.category.name}
          </Text>
        )}
        <Text style={styles.name} numberOfLines={2}>
          {product.name}
        </Text>
        <View style={styles.priceRow}>
          <Text style={styles.price}>{formatPrice(product.price)}</Text>
          {hasDiscount && (
            <Text style={styles.compareAtPrice}>{formatPrice(product.compareAtPrice!)}</Text>
          )}
        </View>
        <View style={styles.stockRow}>
          <View style={[styles.stockDot, { backgroundColor: product.stock > 0 ? '#22c55e' : '#ef4444' }]} />
          <Text style={[styles.stockText, { color: product.stock > 0 ? '#16a34a' : '#dc2626' }]}>
            {product.stock > 0 ? 'In Stock' : 'Out of Stock'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#f8fafc',
    position: 'relative',
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
  discountBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#dc2626',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  discountText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  newBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#2563eb',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  newBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  info: {
    padding: 10,
    gap: 4,
  },
  category: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },
  name: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e293b',
    lineHeight: 18,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  price: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  compareAtPrice: {
    fontSize: 12,
    color: '#94a3b8',
    textDecorationLine: 'line-through',
  },
  stockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  stockDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  stockText: {
    fontSize: 11,
    fontWeight: '500',
  },
});
