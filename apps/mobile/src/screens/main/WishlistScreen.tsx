import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useWishlist, useRemoveWishlistItem, useClearWishlist, useAddToCart } from '../../hooks/useApi';
import { useAuth } from '../../providers/AuthProvider';
import { WishlistItem } from '@laptopmitra/types';
import { MainStackNavigationProp } from '../../navigation/types';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { colors, radius, shadows, spacing, typography } from '../../theme/tokens';

export default function WishlistScreen() {
  const navigation = useNavigation<MainStackNavigationProp>();
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useAuth();
  const { data: wishlist, isLoading } = useWishlist();
  const removeItem = useRemoveWishlistItem();
  const clearWishlist = useClearWishlist();
  const addToCart = useAddToCart();

  const formatPrice = (price: number | string) => {
    const num = typeof price === 'string' ? parseFloat(price) : price;
    return `₹${Math.round(num).toLocaleString('en-IN')}`;
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
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <View style={styles.emptyIconCircle}>
          <Ionicons name="heart-outline" size={40} color={colors.primary} />
        </View>
        <Text style={styles.emptyTitle}>Login to View Your Wishlist</Text>
        <Text style={styles.emptySubtitle}>Save and track refurbished laptops you love.</Text>
        <Button
          title="Login / Register"
          onPress={() => navigation.navigate('MainTabs')}
          variant="primary"
          size="md"
          style={{ marginTop: spacing.md }}
        />
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading wishlist...</Text>
      </View>
    );
  }

  const items = wishlist ?? [];

  if (items.length === 0) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <View style={styles.emptyIconCircle}>
          <Ionicons name="heart-outline" size={44} color={colors.primary} />
        </View>
        <Text style={styles.emptyTitle}>Your Wishlist is Empty</Text>
        <Text style={styles.emptySubtitle}>
          Save laptops you like and get notified of price drops.
        </Text>
        <Button
          title="Browse Store"
          onPress={() => navigation.navigate('MainTabs')}
          variant="primary"
          size="md"
          style={{ marginTop: spacing.md }}
        />
      </View>
    );
  }

  const renderItem = ({ item }: { item: WishlistItem }) => {
    const product = item.product;
    const primaryImage = product?.images?.find((img) => img.isPrimary) ?? product?.images?.[0];
    const meta = product?.metadata || {};
    const specs = [meta.processor, meta.ram, meta.storage].filter(Boolean).join(' • ');

    return (
      <View style={styles.wishlistCard}>
        {/* Image */}
        <TouchableOpacity
          style={styles.itemImage}
          onPress={() => navigation.navigate('ProductDetail', { productId: item.productId })}
          activeOpacity={0.8}
        >
          {primaryImage ? (
            <Image
              source={{ uri: primaryImage.url }}
              style={styles.image}
              contentFit="contain"
              transition={200}
            />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons name="laptop-outline" size={28} color={colors.textMuted} />
            </View>
          )}
        </TouchableOpacity>

        {/* Info */}
        <View style={styles.itemInfo}>
          <TouchableOpacity
            onPress={() => navigation.navigate('ProductDetail', { productId: item.productId })}
            activeOpacity={0.8}
          >
            <View style={styles.badgeRow}>
              <Badge variant="refurb" label="REFURB" />
              {product?.stock !== undefined && product.stock > 0 && (
                <Badge variant="dispatch" label="In Stock" />
              )}
            </View>
            <Text style={styles.itemName} numberOfLines={2}>
              {product?.name ?? 'Laptop Item'}
            </Text>
          </TouchableOpacity>

          {specs ? (
            <Text style={styles.itemSpecs} numberOfLines={1}>
              {specs}
            </Text>
          ) : null}

          {product?.price != null && (
            <Text style={styles.itemPrice}>{formatPrice(product.price)}</Text>
          )}

          {/* Actions */}
          <View style={styles.actions}>
            <Button
              title="Add to Cart"
              onPress={() => handleAddToCart(item)}
              variant="primary"
              size="sm"
              loading={addToCart.isPending}
              icon={<Ionicons name="cart-outline" size={14} color="#FFF" />}
              style={{ flex: 1 }}
            />
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => handleRemoveItem(item)}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Ionicons name="trash-outline" size={16} color={colors.danger} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 12) }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>My Wishlist</Text>
          <View style={styles.countPill}>
            <Text style={styles.countPillText}>{items.length}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={handleClearWishlist} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.clearText}>Clear All</Text>
        </TouchableOpacity>
      </View>

      {/* Wishlist items list */}
      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: Math.max(insets.bottom + 24, 36) },
        ]}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.pageBg,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.pageBg,
    padding: spacing.xxl,
    gap: spacing.sm,
  },
  loadingText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  emptyTitle: {
    ...typography.h2,
    color: colors.navy,
  },
  emptySubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
    maxWidth: 280,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    marginBottom: spacing.xs,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    ...typography.h2,
    color: colors.navy,
  },
  countPill: {
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  countPillText: {
    color: colors.textWhite,
    fontSize: 11,
    fontWeight: '800',
  },
  clearText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.danger,
  },
  list: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  wishlistCard: {
    flexDirection: 'row',
    backgroundColor: colors.cardBg,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    gap: spacing.md,
    ...shadows.sm,
  },
  itemImage: {
    width: 88,
    height: 88,
    borderRadius: radius.md,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorderLight,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemInfo: {
    flex: 1,
    gap: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 2,
  },
  itemName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    lineHeight: 18,
  },
  itemSpecs: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  itemPrice: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.navy,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  removeButton: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.dangerLight,
  },
});
