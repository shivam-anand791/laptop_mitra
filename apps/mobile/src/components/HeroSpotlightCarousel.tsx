import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  FlatList,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Product } from '@laptopmitra/types';
import { radius, shadows, spacing } from '../theme/tokens';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = Math.min(SCREEN_WIDTH - 32, 420);

interface SpotlightItem {
  id: string;
  brand: string;
  shortName: string;
  tagline: string;
  product: Product;
}

interface HeroSpotlightCarouselProps {
  products: Product[];
  onSelectProduct: (product: Product) => void;
  onQuickBuyNow?: (product: Product) => void;
  onExploreQuality?: () => void;
}

const DEFAULT_SPOTLIGHT_FALLBACKS: SpotlightItem[] = [
  {
    id: 'spotlight-apple',
    brand: 'Apple',
    shortName: 'MacBook Pro 16"',
    tagline: 'M2 Pro Apple Silicon',
    product: {
      id: 'prod-macbook-pro-16',
      name: 'Apple MacBook Pro 16" (M2 Pro, 16GB, 512GB SSD) - Space Grey',
      slug: 'apple-macbook-pro-16-m2',
      price: 154999 as any,
      compareAtPrice: 249900 as any,
      stock: 5,
      isFeatured: true,
      images: [
        {
          id: 'img-mac',
          url: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&auto=format&fit=crop&q=80',
          isPrimary: true,
        },
      ],
      metadata: {
        brand: 'Apple',
        processor: 'Apple M2 Pro (12-Core CPU)',
        ram: '16GB Unified RAM',
        storage: '512GB High-Speed SSD',
        batteryHealth: '98% Battery Health',
        condition: 'Grade A+ Pristine (Like New)',
      },
    } as any,
  },
  {
    id: 'spotlight-lenovo',
    brand: 'Lenovo',
    shortName: 'ThinkPad T480',
    tagline: 'Enterprise Workhorse',
    product: {
      id: 'prod-thinkpad-t480',
      name: 'Lenovo ThinkPad T480 (Intel Core i7 8th Gen, 16GB RAM, 512GB SSD)',
      slug: 'lenovo-thinkpad-t480',
      price: 29990 as any,
      compareAtPrice: 68000 as any,
      stock: 14,
      isFeatured: true,
      images: [
        {
          id: 'img-thinkpad',
          url: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=800&auto=format&fit=crop&q=80',
          isPrimary: true,
        },
      ],
      metadata: {
        brand: 'Lenovo',
        processor: 'Intel Core i7 8th Gen',
        ram: '16GB DDR4 RAM',
        storage: '512GB NVMe SSD',
        batteryHealth: '94% Battery Health',
        condition: 'Grade A+ Certified',
      },
    } as any,
  },
  {
    id: 'spotlight-dell',
    brand: 'Dell',
    shortName: 'XPS 15 9520',
    tagline: 'Creator Powerhouse',
    product: {
      id: 'prod-dell-xps-15',
      name: 'Dell XPS 15 9520 (Intel Core i7 12th Gen, 32GB RAM, 1TB SSD)',
      slug: 'dell-xps-15-9520',
      price: 89999 as any,
      compareAtPrice: 195000 as any,
      stock: 6,
      isFeatured: true,
      images: [
        {
          id: 'img-dell',
          url: 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=800&auto=format&fit=crop&q=80',
          isPrimary: true,
        },
      ],
      metadata: {
        brand: 'Dell',
        processor: 'Intel Core i7 12th Gen',
        ram: '32GB Dual Channel RAM',
        storage: '1TB PCIe SSD',
        batteryHealth: '95% Battery Health',
        condition: 'Grade A+ Pristine',
      },
    } as any,
  },
  {
    id: 'spotlight-hp',
    brand: 'HP',
    shortName: 'EliteBook 840',
    tagline: 'Executive Ultrabook',
    product: {
      id: 'prod-hp-elitebook-840',
      name: 'HP EliteBook 840 G8 (Intel Core i5 11th Gen, 16GB RAM, 512GB SSD)',
      slug: 'hp-elitebook-840-g8',
      price: 33999 as any,
      compareAtPrice: 88000 as any,
      stock: 20,
      isFeatured: true,
      images: [
        {
          id: 'img-hp',
          url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&auto=format&fit=crop&q=80',
          isPrimary: true,
        },
      ],
      metadata: {
        brand: 'HP',
        processor: 'Intel Core i5 11th Gen',
        ram: '16GB High-Speed RAM',
        storage: '512GB SSD',
        batteryHealth: '92% Battery Health',
        condition: 'Grade A+ Corporate Return',
      },
    } as any,
  },
];

export default function HeroSpotlightCarousel({
  products,
  onSelectProduct,
  onQuickBuyNow,
  onExploreQuality,
}: HeroSpotlightCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isAutoPlay, setIsAutoPlay] = useState(true);
  const flatListRef = useRef<FlatList<SpotlightItem>>(null);

  // Map real products into the 4 branded slots with graceful fallback
  const spotlightItems: SpotlightItem[] = DEFAULT_SPOTLIGHT_FALLBACKS.map((fallback) => {
    if (!products || products.length === 0) return fallback;
    const match = products.find(
      (p) =>
        p.name.toLowerCase().includes(fallback.brand.toLowerCase()) ||
        p.slug?.toLowerCase().includes(fallback.brand.toLowerCase()) ||
        p.tags?.toLowerCase().includes(fallback.brand.toLowerCase()),
    );
    if (match) {
      return {
        ...fallback,
        product: match,
        shortName: match.name.length > 28 ? `${match.name.slice(0, 26)}...` : match.name,
      };
    }
    return fallback;
  });

  // Auto-switch carousel every 4.5 seconds
  useEffect(() => {
    if (!isAutoPlay) return;

    const timer = setInterval(() => {
      setActiveIndex((prev) => {
        const next = (prev + 1) % spotlightItems.length;
        flatListRef.current?.scrollToIndex({ index: next, animated: true });
        return next;
      });
    }, 4500);

    return () => clearInterval(timer);
  }, [isAutoPlay, spotlightItems.length]);

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetX = e.nativeEvent.contentOffset.x;
      const index = Math.round(offsetX / CARD_WIDTH);
      if (index >= 0 && index < spotlightItems.length && index !== activeIndex) {
        setActiveIndex(index);
      }
    },
    [activeIndex, spotlightItems.length],
  );

  const selectSpotlight = (index: number) => {
    setActiveIndex(index);
    flatListRef.current?.scrollToIndex({ index, animated: true });
  };

  const renderSpotlightCard = ({ item }: { item: SpotlightItem }) => {
    const product = item.product;
    const priceNum = typeof product.price === 'string' ? parseFloat(product.price) : product.price;
    const compareNum = product.compareAtPrice
      ? typeof product.compareAtPrice === 'string'
        ? parseFloat(product.compareAtPrice)
        : product.compareAtPrice
      : priceNum * 1.6;
    const savings = Math.max(0, compareNum - priceNum);
    const discount = Math.round((savings / compareNum) * 100);

    const meta = (product.metadata as Record<string, any>) || {};
    const processor = meta.processor || 'Multi-Core Enterprise Processor';
    const ram = meta.ram || '16GB RAM';
    const battery = meta.batteryHealth || '94% Original Capacity';
    const condition = meta.condition || 'Grade A+ Pristine (Like New)';

    const primaryImg =
      product.images?.find((img) => img.isPrimary)?.url ||
      product.images?.[0]?.url ||
      'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&auto=format&fit=crop&q=80';

    return (
      <View style={[styles.spotlightCard, { width: CARD_WIDTH }]}>
        {/* Top Header: Condition Badge + Price */}
        <View style={styles.cardHeader}>
          <View style={styles.gradeBadge}>
            <Ionicons name="shield-checkmark" size={12} color="#10B981" />
            <Text style={styles.gradeBadgeText} numberOfLines={1}>
              {condition}
            </Text>
          </View>
          <View style={styles.priceWrap}>
            <View style={styles.priceRow}>
              <Text style={styles.priceText}>₹{Math.round(priceNum).toLocaleString('en-IN')}</Text>
              <Text style={styles.compareText}>₹{Math.round(compareNum).toLocaleString('en-IN')}</Text>
            </View>
            <Text style={styles.saveBadgeText}>
              Save {discount}% (₹{Math.round(savings).toLocaleString('en-IN')} off)
            </Text>
          </View>
        </View>

        {/* Product Image Stage */}
        <TouchableOpacity
          style={styles.imageStage}
          onPress={() => onSelectProduct(product)}
          activeOpacity={0.85}
        >
          <Image
            source={{ uri: primaryImg }}
            style={styles.productImage}
            contentFit="cover"
            transition={300}
          />
        </TouchableOpacity>

        {/* Product Title */}
        <TouchableOpacity
          onPress={() => onSelectProduct(product)}
          activeOpacity={0.8}
        >
          <Text style={styles.productTitle} numberOfLines={2}>
            {product.name}
          </Text>
        </TouchableOpacity>

        {/* Verified Spec Pills */}
        <View style={styles.specPillsRow}>
          <View style={styles.specPill}>
            <Ionicons name="hardware-chip-outline" size={11} color="#38BDF8" />
            <Text style={styles.specPillText} numberOfLines={1}>
              {processor}
            </Text>
          </View>
          <View style={styles.specPill}>
            <Ionicons name="battery-charging-outline" size={11} color="#10B981" />
            <Text style={styles.specPillText} numberOfLines={1}>
              {battery}
            </Text>
          </View>
        </View>

        <View style={styles.specPillsRowSecondary}>
          <View style={styles.specPill}>
            <Ionicons name="speedometer-outline" size={11} color="#F59E0B" />
            <Text style={styles.specPillText} numberOfLines={1}>
              {ram}
            </Text>
          </View>
          <View style={styles.specPill}>
            <Ionicons name="ribbon-outline" size={11} color="#60A5FA" />
            <Text style={styles.specPillText} numberOfLines={1}>
              1-Year Doorstep Warranty
            </Text>
          </View>
        </View>

        {/* Card Action Buttons */}
        <View style={styles.cardActionsRow}>
          <TouchableOpacity
            style={styles.detailsBtn}
            onPress={() => onSelectProduct(product)}
            activeOpacity={0.8}
          >
            <Text style={styles.detailsBtnText}>View Details</Text>
            <Ionicons name="arrow-forward" size={13} color="#FFF" />
          </TouchableOpacity>

          {onQuickBuyNow && (
            <TouchableOpacity
              style={styles.buyNowBtn}
              onPress={() => onQuickBuyNow(product)}
              activeOpacity={0.8}
            >
              <Ionicons name="flash" size={13} color="#0B1F4B" />
              <Text style={styles.buyNowBtnText}>Buy Now</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Brand Switcher Bar */}
      <View style={styles.switcherHeader}>
        <TouchableOpacity
          style={styles.switcherLabelWrap}
          onPress={onExploreQuality}
          activeOpacity={onExploreQuality ? 0.7 : 1}
        >
          <Ionicons name="sparkles" size={12} color="#38BDF8" />
          <Text style={styles.switcherLabel}>FEATURED SPOTLIGHT:</Text>
          {onExploreQuality && (
            <Ionicons name="shield-checkmark" size={12} color="#38BDF8" />
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.autoPlayToggle}
          onPress={() => setIsAutoPlay((prev) => !prev)}
          activeOpacity={0.7}
        >
          <Text style={styles.autoPlayText}>
            {isAutoPlay ? 'Auto: ON (4s)' : 'Paused'}
          </Text>
          <Ionicons
            name={isAutoPlay ? 'pause-circle-outline' : 'play-circle-outline'}
            size={14}
            color="#38BDF8"
          />
        </TouchableOpacity>
      </View>

      {/* 4 Brand Selector Pills */}
      <View style={styles.brandPillsRow}>
        {spotlightItems.map((item, idx) => {
          const isSelected = idx === activeIndex;
          return (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.brandPill,
                isSelected ? styles.brandPillActive : styles.brandPillInactive,
              ]}
              onPress={() => selectSpotlight(idx)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.brandPillText,
                  isSelected ? styles.brandPillTextActive : styles.brandPillTextInactive,
                ]}
              >
                {item.brand}
              </Text>
              <Text
                style={[
                  styles.brandPillSub,
                  isSelected ? styles.brandPillSubActive : styles.brandPillSubInactive,
                ]}
                numberOfLines={1}
              >
                {item.shortName}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Paged Spotlight FlatList */}
      <FlatList
        ref={flatListRef}
        data={spotlightItems}
        renderItem={renderSpotlightCard}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        snapToInterval={CARD_WIDTH}
        decelerationRate="fast"
        onMomentumScrollEnd={handleScroll}
        contentContainerStyle={styles.carouselContent}
      />

      {/* Pagination Dot Indicators */}
      <View style={styles.dotsRow}>
        {spotlightItems.map((_, idx) => (
          <View
            key={idx}
            style={[
              styles.dot,
              idx === activeIndex ? styles.dotActive : styles.dotInactive,
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.xs,
  },
  switcherHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xxs,
    marginBottom: 8,
  },
  switcherLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  switcherLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#38BDF8',
    letterSpacing: 0.6,
  },
  autoPlayToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
  },
  autoPlayText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#38BDF8',
  },
  brandPillsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: spacing.xs,
  },
  brandPill: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandPillActive: {
    backgroundColor: 'rgba(37, 99, 235, 0.35)',
    borderWidth: 1.5,
    borderColor: '#38BDF8',
  },
  brandPillInactive: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  brandPillText: {
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  brandPillTextActive: {
    color: '#38BDF8',
  },
  brandPillTextInactive: {
    color: 'rgba(255, 255, 255, 0.6)',
  },
  brandPillSub: {
    fontSize: 8.5,
    fontWeight: '600',
    marginTop: 1,
  },
  brandPillSubActive: {
    color: '#FFFFFF',
  },
  brandPillSubInactive: {
    color: 'rgba(255, 255, 255, 0.4)',
  },
  carouselContent: {
    paddingVertical: 4,
  },
  spotlightCard: {
    backgroundColor: '#0A1838',
    borderRadius: radius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    ...shadows.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingBottom: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  gradeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    maxWidth: '55%',
  },
  gradeBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#34D399',
  },
  priceWrap: {
    alignItems: 'flex-end',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 5,
  },
  priceText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  compareText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.45)',
    textDecorationLine: 'line-through',
  },
  saveBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#38BDF8',
    marginTop: 1,
  },
  imageStage: {
    height: 150,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: 'rgba(7, 20, 51, 0.6)',
    marginVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  productTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 18,
    marginBottom: 8,
  },
  specPillsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 4,
  },
  specPillsRowSecondary: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
  },
  specPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 7,
    paddingVertical: 3.5,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  specPillText: {
    fontSize: 9.5,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.85)',
    flex: 1,
  },
  cardActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  detailsBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#2563EB',
    paddingVertical: 8,
    borderRadius: radius.md,
  },
  detailsBtnText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  buyNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#FACC15',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.md,
  },
  buyNowBtnText: {
    fontSize: 11.5,
    fontWeight: '900',
    color: '#0B1F4B',
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 5,
    marginTop: 8,
  },
  dot: {
    height: 4,
    borderRadius: radius.full,
  },
  dotActive: {
    width: 18,
    backgroundColor: '#38BDF8',
  },
  dotInactive: {
    width: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
});
