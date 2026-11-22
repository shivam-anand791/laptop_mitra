import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAvailableCoupons } from '../../hooks/useApi';
import { MainStackNavigationProp } from '../../navigation/types';
import { colors, radius, spacing, typography } from '../../theme/tokens';
import Button from '../../components/ui/Button';

type FilterType = 'ALL' | 'PUBLIC' | 'EXCLUSIVE';

export default function MyCouponsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<MainStackNavigationProp>();
  const [filter, setFilter] = useState<FilterType>('ALL');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [expandedTerms, setExpandedTerms] = useState<Record<string, boolean>>({});

  const { data: offersData, isLoading } = useAvailableCoupons({ items: [] });

  const rawCoupons: any[] = [
    ...(offersData?.eligible ?? []),
    ...(offersData?.ineligible ?? []),
  ];

  // Deduplicate by code
  const seen = new Set<string>();
  const uniqueCoupons = rawCoupons.filter((c) => {
    const key = c.id || c.code;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const filteredCoupons = uniqueCoupons.filter((coupon) => {
    if (filter === 'EXCLUSIVE') {
      return coupon.visibility === 'TARGETED';
    }
    if (filter === 'PUBLIC') {
      return coupon.visibility === 'PUBLIC' || !coupon.visibility;
    }
    return true;
  });

  const copyCode = (code: string) => {
    setCopiedCode(code);
    setTimeout(() => {
      setCopiedCode((prev) => (prev === code ? null : prev));
    }, 2500);
  };

  const toggleTerms = (key: string) => {
    setExpandedTerms((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const formatPrice = (val: number) => `₹${Math.round(val).toLocaleString('en-IN')}`;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={22} color={colors.navy} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Coupons &amp; Offers</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'ALL' && styles.filterTabActive]}
          onPress={() => setFilter('ALL')}
        >
          <Text style={[styles.filterTabText, filter === 'ALL' && styles.filterTabTextActive]}>
            All ({uniqueCoupons.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'PUBLIC' && styles.filterTabActive]}
          onPress={() => setFilter('PUBLIC')}
        >
          <Text style={[styles.filterTabText, filter === 'PUBLIC' && styles.filterTabTextActive]}>
            Public Deals
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'EXCLUSIVE' && styles.filterTabActive]}
          onPress={() => setFilter('EXCLUSIVE')}
        >
          <Text style={[styles.filterTabText, filter === 'EXCLUSIVE' && styles.filterTabTextActive]}>
            Exclusive
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom + 20, 40) }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Banner Card */}
        <View style={styles.bannerCard}>
          <View style={styles.bannerIconCircle}>
            <Ionicons name="sparkles" size={20} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle}>Save on Certified Laptops</Text>
            <Text style={styles.bannerSubtitle}>
              Copy any code and apply it during checkout to save instantly.
            </Text>
          </View>
        </View>

        {isLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading your coupons...</Text>
          </View>
        ) : filteredCoupons.length === 0 ? (
          <View style={styles.emptyBox}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="pricetag-outline" size={32} color={colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>No Coupons Available</Text>
            <Text style={styles.emptySubtitle}>
              Check back soon for upcoming holiday promotions and exclusive member drops.
            </Text>
            <Button
              title="Shop Certified Laptops"
              variant="primary"
              size="md"
              onPress={() => navigation.navigate('MainTabs')}
              style={{ marginTop: spacing.md }}
            />
          </View>
        ) : (
          <View style={styles.couponList}>
            {filteredCoupons.map((coupon) => {
              const isCopied = copiedCode === coupon.code;
              const termsKey = coupon.id || coupon.code;
              const hasTerms = Boolean(coupon.terms);
              const isTermsOpen = expandedTerms[termsKey] || false;
              const discountLabel =
                coupon.badgeText ||
                (coupon.type === 'percentage'
                  ? `${coupon.value}% OFF`
                  : `₹${Number(coupon.value).toLocaleString('en-IN')} OFF`);

              return (
                <View key={termsKey} style={styles.couponCard}>
                  {/* Top Badge & Expiry */}
                  <View style={styles.cardHeader}>
                    <View style={styles.badgePill}>
                      <Ionicons name="flash" size={12} color={colors.primary} />
                      <Text style={styles.badgeText}>{discountLabel}</Text>
                    </View>
                    {coupon.validUntil ? (
                      <View style={styles.expiryRow}>
                        <Ionicons name="time-outline" size={12} color={colors.textSecondary} />
                        <Text style={styles.expiryText}>
                          Valid till{' '}
                          {new Date(coupon.validUntil).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.noExpiryPill}>
                        <Text style={styles.noExpiryText}>No Expiry</Text>
                      </View>
                    )}
                  </View>

                  {/* Title & Description */}
                  <Text style={styles.couponTitle}>{coupon.title || coupon.code}</Text>
                  {coupon.description ? (
                    <Text style={styles.couponDesc}>{coupon.description}</Text>
                  ) : null}

                  {/* Conditions Pills */}
                  <View style={styles.conditionsRow}>
                    {coupon.minOrderValue && coupon.minOrderValue > 0 ? (
                      <View style={styles.conditionPill}>
                        <Text style={styles.conditionText}>
                          Min. Order {formatPrice(coupon.minOrderValue)}
                        </Text>
                      </View>
                    ) : null}
                    {coupon.maxDiscountCap ? (
                      <View style={styles.conditionPill}>
                        <Text style={styles.conditionText}>
                          Max Savings {formatPrice(coupon.maxDiscountCap)}
                        </Text>
                      </View>
                    ) : null}
                    {coupon.allowedPaymentMethods && coupon.allowedPaymentMethods !== 'ANY' ? (
                      <View style={[styles.conditionPill, styles.onlinePill]}>
                        <Text style={[styles.conditionText, styles.onlineText]}>
                          {coupon.allowedPaymentMethods === 'ONLINE_ONLY' || coupon.allowedPaymentMethods === 'PREPAID'
                            ? 'Prepaid Only'
                            : 'COD Only'}
                        </Text>
                      </View>
                    ) : null}
                    {coupon.firstOrderOnly ? (
                      <View style={[styles.conditionPill, styles.firstOrderPill]}>
                        <Text style={[styles.conditionText, styles.firstOrderText]}>
                          First Order Only
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  {/* Code & Copy Row */}
                  <View style={styles.codeRow}>
                    <View style={styles.codeBox}>
                      <Text style={styles.codeText}>{coupon.code}</Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.copyButton, isCopied && styles.copyButtonActive]}
                      onPress={() => copyCode(coupon.code)}
                    >
                      <Ionicons
                        name={isCopied ? 'checkmark' : 'copy-outline'}
                        size={14}
                        color={isCopied ? '#fff' : colors.navy}
                      />
                      <Text style={[styles.copyButtonText, isCopied && styles.copyButtonTextActive]}>
                        {isCopied ? 'Copied' : 'Copy Code'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Terms & Conditions */}
                  {hasTerms && (
                    <View style={styles.termsWrapper}>
                      <TouchableOpacity
                        style={styles.termsToggle}
                        onPress={() => toggleTerms(termsKey)}
                      >
                        <Text style={styles.termsToggleText}>Terms &amp; Conditions</Text>
                        <Ionicons
                          name={isTermsOpen ? 'chevron-up' : 'chevron-down'}
                          size={14}
                          color={colors.textSecondary}
                        />
                      </TouchableOpacity>
                      {isTermsOpen && (
                        <Text style={styles.termsContent}>{coupon.terms}</Text>
                      )}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.pageBg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.cardBg,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorderLight,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    ...typography.h3,
    color: colors.navy,
  },
  filterRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.cardBg,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorderLight,
  },
  filterTab: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.md,
    backgroundColor: colors.pageBg,
  },
  filterTabActive: {
    backgroundColor: colors.navy,
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  filterTabTextActive: {
    color: colors.textWhite,
    fontWeight: '700',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    gap: spacing.md,
  },
  bannerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.navy,
    borderRadius: radius.xl,
    padding: spacing.md,
  },
  bannerIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textWhite,
  },
  bannerSubtitle: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 2,
  },
  centered: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
    gap: spacing.xs,
  },
  loadingText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  emptyBox: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.cardBg,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.xl,
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
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
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 260,
  },
  couponList: {
    gap: spacing.sm,
  },
  couponCard: {
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.xl,
    padding: spacing.md,
    gap: spacing.xs,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primary,
  },
  expiryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  expiryText: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  noExpiryPill: {
    backgroundColor: colors.greenLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  noExpiryText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.greenText,
  },
  couponTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  couponDesc: {
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  conditionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  conditionPill: {
    backgroundColor: colors.pageBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  conditionText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  onlinePill: {
    backgroundColor: colors.primaryLight,
  },
  onlineText: {
    color: colors.primary,
  },
  firstOrderPill: {
    backgroundColor: '#F3E8FF',
  },
  firstOrderText: {
    color: '#7E22CE',
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.pageBg,
    borderWidth: 1,
    borderColor: colors.cardBorderLight,
    borderStyle: 'dashed',
    borderRadius: radius.md,
    padding: spacing.xs,
    marginTop: 4,
  },
  codeBox: {
    paddingHorizontal: spacing.xs,
  },
  codeText: {
    fontSize: 13,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: colors.navy,
    letterSpacing: 1,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.md,
  },
  copyButtonActive: {
    backgroundColor: colors.green,
    borderColor: colors.green,
  },
  copyButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.navy,
  },
  copyButtonTextActive: {
    color: colors.textWhite,
  },
  termsWrapper: {
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorderLight,
    paddingTop: 6,
  },
  termsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  termsToggleText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  termsContent: {
    fontSize: 10,
    color: colors.textSecondary,
    lineHeight: 14,
    marginTop: 4,
  },
});
