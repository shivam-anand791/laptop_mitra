import { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAvailableCoupons, usePreviewCoupon, useValidateDiscount } from '../hooks/useApi';
import { colors, radius, spacing, typography } from '../theme/tokens';
import Button from './ui/Button';

export interface CouponOffersModalProps {
  visible: boolean;
  onClose: () => void;
  items: any[];
  appliedCode?: string | null | undefined;
  onApplyCoupon: (code: string, preview: any) => void;
  referralCode?: string | undefined;
  paymentMethod?: string | undefined;
}

export default function CouponOffersModal({
  visible,
  onClose,
  items,
  appliedCode,
  onApplyCoupon,
  referralCode,
  paymentMethod,
}: CouponOffersModalProps) {
  const [manualCode, setManualCode] = useState('');
  const [expandedTerms, setExpandedTerms] = useState<Record<string, boolean>>({});
  const [actionError, setActionError] = useState<string | null>(null);

  const availablePayload: {
    items: any[];
    referralCode?: string;
    paymentMethod?: string;
  } = { items };

  if (referralCode) {
    availablePayload.referralCode = referralCode;
  }
  if (paymentMethod) {
    availablePayload.paymentMethod = paymentMethod;
  }

  const { data: offersData, isLoading: offersLoading, refetch } = useAvailableCoupons(
    availablePayload,
    { enabled: visible && items.length > 0 }
  );

  const previewCoupon = usePreviewCoupon();
  const validateDiscount = useValidateDiscount();

  useEffect(() => {
    if (visible) {
      setManualCode('');
      setActionError(null);
      refetch();
    }
  }, [visible, refetch]);

  const handleApplyCode = async (codeToApply: string) => {
    const clean = codeToApply.trim().toUpperCase();
    if (!clean) return;

    setActionError(null);
    try {
      const previewPayload: {
        code: string;
        items: any[];
        referralCode?: string;
        paymentMethod?: string;
      } = {
        code: clean,
        items,
      };

      if (referralCode) {
        previewPayload.referralCode = referralCode;
      }
      if (paymentMethod) {
        previewPayload.paymentMethod = paymentMethod;
      }

      const preview = await previewCoupon.mutateAsync(previewPayload);

      if (preview && preview.valid) {
        onApplyCoupon(clean, preview);
        onClose();
        return;
      }
      setActionError(preview?.message || 'Invalid coupon code');
    } catch (err: any) {
      // Fallback check: referral code
      try {
        const subtotal = items.reduce((sum, it) => sum + (Number(it.price || it.priceAtAdd || 0) * (it.quantity || 1)), 0);
        const refRes = await validateDiscount.mutateAsync({ code: clean, cartTotal: subtotal });
        if (refRes && refRes.valid) {
          onApplyCoupon(clean, {
            valid: true,
            coupon: { code: clean, title: 'Mitra Referral Code' },
            savingsAmount: refRes.discountAmount,
            message: refRes.message || 'Referral discount applied!',
          });
          onClose();
          return;
        }
      } catch {}
      setActionError(err?.message || 'Could not apply coupon');
    }
  };

  const toggleTerms = (key: string) => {
    setExpandedTerms((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const formatPrice = (val: number) => `₹${Math.round(val).toLocaleString('en-IN')}`;

  const eligibleOffers: any[] = offersData?.eligible ?? [];
  const ineligibleOffers: any[] = offersData?.ineligible ?? [];

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.iconCircle}>
                <Ionicons name="pricetag" size={18} color={colors.primary} />
              </View>
              <View>
                <Text style={styles.headerTitle}>Coupons &amp; Offers</Text>
                <Text style={styles.headerSubtitle}>Applicable discounts for your order</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close-circle-outline" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Manual Code Input */}
          <View style={styles.inputCard}>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.textInput}
                placeholder="Enter coupon or promo code"
                placeholderTextColor={colors.textMuted}
                value={manualCode}
                onChangeText={(text) => {
                  setManualCode(text);
                  if (actionError) setActionError(null);
                }}
                autoCapitalize="characters"
                returnKeyType="done"
              />
              <Button
                title="Apply"
                onPress={() => handleApplyCode(manualCode)}
                variant="primary"
                size="sm"
                loading={previewCoupon.isPending || validateDiscount.isPending}
                disabled={!manualCode.trim()}
              />
            </View>
            {actionError && (
              <View style={styles.errorRow}>
                <Ionicons name="alert-circle" size={14} color={colors.danger} />
                <Text style={styles.errorText}>{actionError}</Text>
              </View>
            )}
          </View>

          {/* Offers List */}
          <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
            {offersLoading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.loadingText}>Fetching available offers...</Text>
              </View>
            ) : eligibleOffers.length === 0 && ineligibleOffers.length === 0 ? (
              <View style={styles.emptyBox}>
                <Ionicons name="gift-outline" size={36} color={colors.textMuted} />
                <Text style={styles.emptyTitle}>No Offers Available Right Now</Text>
                <Text style={styles.emptySubtitle}>
                  You can still enter a valid coupon code manually above.
                </Text>
              </View>
            ) : (
              <>
                {/* APPLICABLE OFFERS */}
                {eligibleOffers.length > 0 && (
                  <View style={styles.section}>
                    <Text style={styles.sectionHeader}>Applicable Offers</Text>
                    {eligibleOffers.map((coupon) => {
                      const isApplied = appliedCode?.toUpperCase() === coupon.code?.toUpperCase();
                      const termsKey = coupon.id || coupon.code;
                      const hasTerms = Boolean(coupon.terms);
                      const isTermsOpen = expandedTerms[termsKey] || false;

                      return (
                        <View key={termsKey} style={styles.couponCard}>
                          <View style={styles.couponCardTop}>
                            <View style={styles.badgeRow}>
                              <View style={styles.badgePill}>
                                <Text style={styles.badgeText}>{coupon.badgeText || 'SPECIAL'}</Text>
                              </View>
                              {coupon.savingsAmount > 0 && (
                                <Text style={styles.savingsText}>
                                  Save {formatPrice(coupon.savingsAmount)}
                                </Text>
                              )}
                            </View>

                            <TouchableOpacity
                              style={[styles.applyPill, isApplied && styles.appliedPill]}
                              disabled={isApplied || previewCoupon.isPending}
                              onPress={() => handleApplyCode(coupon.code)}
                            >
                              <Text style={[styles.applyPillText, isApplied && styles.appliedPillText]}>
                                {isApplied ? 'Applied' : 'Apply'}
                              </Text>
                            </TouchableOpacity>
                          </View>

                          <View style={styles.couponCodeRow}>
                            <Text style={styles.couponCodeText}>{coupon.code}</Text>
                          </View>

                          <Text style={styles.couponTitle}>{coupon.title || coupon.code}</Text>
                          {coupon.description ? (
                            <Text style={styles.couponDesc}>{coupon.description}</Text>
                          ) : null}

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

                {/* MORE OFFERS (UNLOCKABLE) */}
                {ineligibleOffers.length > 0 && (
                  <View style={[styles.section, { marginTop: spacing.md }]}>
                    <Text style={styles.sectionHeader}>More Offers</Text>
                    {ineligibleOffers.map((coupon) => {
                      const termsKey = coupon.id || coupon.code;

                      return (
                        <View key={termsKey} style={[styles.couponCard, styles.lockedCard]}>
                          <View style={styles.couponCardTop}>
                            <View style={styles.badgeRow}>
                              <View style={[styles.badgePill, styles.lockedBadgePill]}>
                                <Text style={styles.lockedBadgeText}>{coupon.badgeText || 'OFFER'}</Text>
                              </View>
                            </View>
                            <View style={styles.lockedPill}>
                              <Ionicons name="lock-closed" size={12} color={colors.textMuted} />
                              <Text style={styles.lockedPillText}>Locked</Text>
                            </View>
                          </View>

                          <View style={styles.couponCodeRow}>
                            <Text style={[styles.couponCodeText, styles.lockedCodeText]}>
                              {coupon.code}
                            </Text>
                          </View>

                          <Text style={styles.couponTitle}>{coupon.title || coupon.code}</Text>
                          {coupon.description ? (
                            <Text style={styles.couponDesc}>{coupon.description}</Text>
                          ) : null}

                          {/* Reason or amount needed */}
                          <View style={styles.reasonBox}>
                            <Ionicons name="information-circle-outline" size={14} color={colors.orange} />
                            <Text style={styles.reasonText}>
                              {coupon.reason ||
                                (coupon.amountNeeded
                                  ? `Add ${formatPrice(coupon.amountNeeded)} more to cart to unlock`
                                  : 'Not applicable to current cart')}
                            </Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}
              </>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
  },
  backdrop: {
    flex: 1,
  },
  sheetContainer: {
    backgroundColor: colors.cardBg,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: '85%',
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorderLight,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  inputCard: {
    padding: spacing.md,
    backgroundColor: colors.pageBg,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorderLight,
  },
  inputRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  textInput: {
    flex: 1,
    height: 40,
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    fontSize: 13,
    color: colors.textPrimary,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.xxs,
  },
  errorText: {
    fontSize: 11,
    color: colors.danger,
    fontWeight: '500',
  },
  scrollArea: {
    flexGrow: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  loadingBox: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
    gap: spacing.xs,
  },
  loadingText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  emptyBox: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
    gap: spacing.xs,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  emptySubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  section: {
    gap: spacing.sm,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xxs,
  },
  couponCard: {
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: 6,
  },
  lockedCard: {
    backgroundColor: colors.pageBg,
    opacity: 0.85,
  },
  couponCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badgePill: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.primary,
  },
  lockedBadgePill: {
    backgroundColor: '#E2E8F0',
  },
  lockedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  savingsText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.green,
  },
  applyPill: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radius.md,
  },
  applyPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textWhite,
  },
  appliedPill: {
    backgroundColor: colors.greenLight,
    borderWidth: 1,
    borderColor: colors.greenBorder,
  },
  appliedPillText: {
    color: colors.greenText,
  },
  lockedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  lockedPillText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  couponCodeRow: {
    alignSelf: 'flex-start',
    backgroundColor: colors.pageBg,
    borderWidth: 1,
    borderColor: colors.cardBorderLight,
    borderStyle: 'dashed',
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginTop: 2,
  },
  couponCodeText: {
    fontSize: 12,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: colors.navy,
    letterSpacing: 1,
  },
  lockedCodeText: {
    color: colors.textSecondary,
  },
  couponTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  couponDesc: {
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  reasonBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.orangeLight,
    padding: 6,
    borderRadius: radius.sm,
    marginTop: 4,
  },
  reasonText: {
    fontSize: 11,
    color: colors.orangeText,
    fontWeight: '500',
    flex: 1,
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
