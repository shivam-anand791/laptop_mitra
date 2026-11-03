import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../theme/tokens';
import { useItemSituation } from '../hooks/useApi';
import { formatIndianRupees } from '../utils/account-helpers';
import ChangeRequestModal from './ChangeRequestModal';
import BuybackClaimModal from './BuybackClaimModal';

interface ItemSituationHelpModalProps {
  visible: boolean;
  onClose: () => void;
  orderId: string;
  orderNumber?: string | undefined;
  orderItemId: string;
  item: any;
  order: any;
  onOpenReturn?: (() => void) | undefined;
  onNavigateToTicket?: ((prefill: {
    subject: string;
    category: string;
    orderId: string;
    orderItemId: string;
  }) => void) | undefined;
}

export default function ItemSituationHelpModal({
  visible,
  onClose,
  orderId,
  orderNumber,
  orderItemId,
  item,
  order,
  onOpenReturn,
  onNavigateToTicket,
}: ItemSituationHelpModalProps) {
  const { data: situation, isLoading, refetch } = useItemSituation(orderItemId);

  const [isChangeRequestOpen, setIsChangeRequestOpen] = useState(false);
  const [isBuybackOpen, setIsBuybackOpen] = useState(false);

  const product = item?.product;
  const primaryImage = product?.images?.find((img: any) => img.isPrimary) ?? product?.images?.[0];
  const isLease = item?.purchaseMode === 'lease';

  const findAction = (id: string, legacyName?: string) => {
    const act = situation?.actions?.find(
      (a: any) => a.id === id || a.action === legacyName || a.id === legacyName
    );
    if (!act) return null;
    return {
      ...act,
      allowed: act.enabled !== undefined ? act.enabled : act.allowed,
    };
  };

  const returnAction = findAction('REQUEST_RETURN', 'RETURN');
  const warrantyAction = findAction('CLAIM_WARRANTY', 'WARRANTY');
  const buybackAction = findAction('REQUEST_BUYBACK', 'BUYBACK');
  const changeAddressAction = findAction('REQUEST_ADDRESS_CHANGE', 'CHANGE_ADDRESS');

  return (
    <>
      <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
        <View style={styles.overlay}>
          <View style={styles.sheetContainer}>
            {/* Header */}
            <View style={styles.header}>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>Need Help with this Item</Text>
                <Text style={styles.subtitle} numberOfLines={1}>
                  Order #{orderNumber || orderId?.slice(0, 8)}
                </Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
              {/* Item Card */}
              <View style={styles.itemCard}>
                {primaryImage ? (
                  <Image source={{ uri: primaryImage.url }} style={styles.itemImage} contentFit="cover" />
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <Ionicons name="laptop-outline" size={24} color="#94A3B8" />
                  </View>
                )}
                <View style={styles.itemDetails}>
                  <Text style={styles.itemName} numberOfLines={2}>
                    {product?.name || 'Laptop Item'}
                  </Text>
                  <View style={styles.tagRow}>
                    <View style={[styles.badge, isLease ? styles.badgeLease : styles.badgeBuy]}>
                      <Text style={[styles.badgeText, isLease ? styles.badgeTextLease : styles.badgeTextBuy]}>
                        {isLease ? 'Rent / Lease' : 'Outright Purchase'}
                      </Text>
                    </View>
                    <Text style={styles.itemPrice}>
                      {formatIndianRupees(item?.price || 0)}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Situation Status Banner */}
              {isLoading ? (
                <View style={styles.loadingBox}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={styles.loadingText}>Evaluating item lifecycle status...</Text>
                </View>
              ) : situation ? (
                <View style={styles.situationBox}>
                  <View style={styles.situationHeader}>
                    <Ionicons name="shield-checkmark" size={18} color={colors.primary} />
                    <Text style={styles.situationTitle}>
                      {situation.plainStatus || 'Lifecycle Status Evaluated'}
                    </Text>
                  </View>
                  <Text style={styles.situationDescription}>
                    {situation.description}
                  </Text>

                  {/* Return window timer */}
                  {situation.returnWindow?.isOpen && (
                    <View style={styles.timerBox}>
                      <Ionicons name="time-outline" size={16} color="#B45309" />
                      <Text style={styles.timerText}>
                        Return window open until: {situation.returnWindow.expiresAtIST}
                      </Text>
                    </View>
                  )}

                  {/* Guaranteed Buyback Valuation preview */}
                  {situation.buyback?.eligible && (
                    <View style={styles.buybackTag}>
                      <Ionicons name="pricetag-outline" size={16} color="#15803D" />
                      <Text style={styles.buybackTagText}>
                        Guaranteed Buyback Rate: {situation.buyback.tierPercent}% (~{formatIndianRupees(situation.buyback.estimatedPayout)})
                      </Text>
                    </View>
                  )}
                </View>
              ) : null}

              {/* Action Catalog */}
              <Text style={styles.sectionHeading}>Available Actions</Text>

              {/* 1. Return or Replace */}
              <TouchableOpacity
                style={[
                  styles.actionCard,
                  !returnAction?.allowed && styles.actionCardDisabled,
                ]}
                disabled={!returnAction?.allowed}
                onPress={() => {
                  onClose();
                  onOpenReturn?.();
                }}
              >
                <View style={styles.actionIconBox}>
                  <Ionicons
                    name="swap-horizontal-outline"
                    size={20}
                    color={returnAction?.allowed ? colors.primary : colors.textMuted}
                  />
                </View>
                <View style={styles.actionInfo}>
                  <Text style={[styles.actionTitle, !returnAction?.allowed && styles.actionTitleDisabled]}>
                    Return or Replace Laptop
                  </Text>
                  <Text style={styles.actionDesc}>
                    {returnAction?.allowed
                      ? 'Report physical defect, wrong specification, or transit damage'
                      : returnAction?.disabledReason || 'Return is not available for this item'}
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={returnAction?.allowed ? colors.textSecondary : colors.textMuted}
                />
              </TouchableOpacity>

              {/* 2. Claim Warranty */}
              <TouchableOpacity
                style={[
                  styles.actionCard,
                  !warrantyAction?.allowed && styles.actionCardDisabled,
                ]}
                disabled={!warrantyAction?.allowed}
                onPress={() => {
                  onClose();
                  onNavigateToTicket?.({
                    subject: `Warranty claim: ${product?.name || 'Laptop Item'}`,
                    category: 'WARRANTY',
                    orderId,
                    orderItemId,
                  });
                }}
              >
                <View style={styles.actionIconBox}>
                  <Ionicons
                    name="shield-outline"
                    size={20}
                    color={warrantyAction?.allowed ? colors.primary : colors.textMuted}
                  />
                </View>
                <View style={styles.actionInfo}>
                  <Text style={[styles.actionTitle, !warrantyAction?.allowed && styles.actionTitleDisabled]}>
                    Warranty Service & Repairs
                  </Text>
                  <Text style={styles.actionDesc}>
                    {warrantyAction?.allowed
                      ? 'Raise a hardware or servicing request under active warranty'
                      : warrantyAction?.disabledReason || 'Warranty claim is currently not available'}
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={warrantyAction?.allowed ? colors.textSecondary : colors.textMuted}
                />
              </TouchableOpacity>

              {/* 3. Assured Buyback */}
              <TouchableOpacity
                style={[
                  styles.actionCard,
                  !buybackAction?.allowed && styles.actionCardDisabled,
                ]}
                disabled={!buybackAction?.allowed}
                onPress={() => setIsBuybackOpen(true)}
              >
                <View style={styles.actionIconBox}>
                  <Ionicons
                    name="cash-outline"
                    size={20}
                    color={buybackAction?.allowed ? '#15803D' : colors.textMuted}
                  />
                </View>
                <View style={styles.actionInfo}>
                  <Text style={[styles.actionTitle, !buybackAction?.allowed && styles.actionTitleDisabled]}>
                    Claim Assured Buyback
                  </Text>
                  <Text style={styles.actionDesc}>
                    {buybackAction?.allowed
                      ? 'Sell back laptop under guaranteed buyback policy schedule'
                      : buybackAction?.disabledReason || 'Assured buyback is not available'}
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={buybackAction?.allowed ? colors.textSecondary : colors.textMuted}
                />
              </TouchableOpacity>

              {/* 4. Pre-dispatch Address / Phone Modification */}
              <TouchableOpacity
                style={[
                  styles.actionCard,
                  !changeAddressAction?.allowed && styles.actionCardDisabled,
                ]}
                disabled={!changeAddressAction?.allowed}
                onPress={() => setIsChangeRequestOpen(true)}
              >
                <View style={styles.actionIconBox}>
                  <Ionicons
                    name="location-outline"
                    size={20}
                    color={changeAddressAction?.allowed ? colors.primary : colors.textMuted}
                  />
                </View>
                <View style={styles.actionInfo}>
                  <Text style={[styles.actionTitle, !changeAddressAction?.allowed && styles.actionTitleDisabled]}>
                    Change Delivery Address or Phone
                  </Text>
                  <Text style={styles.actionDesc}>
                    {changeAddressAction?.allowed
                      ? 'Request dispatch destination update before courier pickup'
                      : changeAddressAction?.disabledReason || 'Modification is locked after shipment'}
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={changeAddressAction?.allowed ? colors.textSecondary : colors.textMuted}
                />
              </TouchableOpacity>

              {/* 5. General Support / Raise Ticket */}
              <TouchableOpacity
                style={styles.actionCard}
                onPress={() => {
                  onClose();
                  onNavigateToTicket?.({
                    subject: `Order assistance: ${product?.name || 'Laptop Item'}`,
                    category: 'ORDER_HELP',
                    orderId,
                    orderItemId,
                  });
                }}
              >
                <View style={styles.actionIconBox}>
                  <Ionicons name="chatbubbles-outline" size={20} color={colors.primary} />
                </View>
                <View style={styles.actionInfo}>
                  <Text style={styles.actionTitle}>Order Support Ticket</Text>
                  <Text style={styles.actionDesc}>
                    Talk to our support desk regarding invoice, tracking, or lease terms
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Change Request Modal */}
      <ChangeRequestModal
        visible={isChangeRequestOpen}
        onClose={() => setIsChangeRequestOpen(false)}
        orderId={orderId}
        orderNumber={orderNumber}
        currentAddress={order?.shippingAddress}
        currentPhone={order?.phone}
        onSuccess={() => {
          setIsChangeRequestOpen(false);
          refetch();
        }}
      />

      {/* Buyback Claim Modal */}
      <BuybackClaimModal
        visible={isBuybackOpen}
        onClose={() => setIsBuybackOpen(false)}
        orderId={orderId}
        orderItemId={orderItemId}
        productName={product?.name || 'Laptop Item'}
        invoicePrice={Number(item?.price || 0)}
        tierPercent={situation?.buyback?.tierPercent || 60}
        pickupCharge={situation?.buyback?.pickupCharge || 0}
        shippingAddress={order?.shippingAddress}
        onSuccess={() => {
          setIsBuybackOpen(false);
          refetch();
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: '88%',
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorderLight,
  },
  title: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    padding: spacing.xs,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: spacing.sm,
    backgroundColor: '#F8FAFC',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.cardBorderLight,
    marginBottom: spacing.md,
  },
  itemImage: {
    width: 56,
    height: 56,
    borderRadius: radius.sm,
  },
  imagePlaceholder: {
    width: 56,
    height: 56,
    borderRadius: radius.sm,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.sm,
  },
  badgeBuy: {
    backgroundColor: '#DCFCE7',
  },
  badgeLease: {
    backgroundColor: '#FEF3C7',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  badgeTextBuy: {
    color: '#15803D',
  },
  badgeTextLease: {
    color: '#92400E',
  },
  itemPrice: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
  loadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: spacing.md,
    backgroundColor: '#F8FAFC',
    borderRadius: radius.md,
    marginBottom: spacing.md,
  },
  loadingText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  situationBox: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: 6,
  },
  situationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  situationTitle: {
    ...typography.bodyBold,
    color: '#1E40AF',
  },
  situationDescription: {
    ...typography.caption,
    color: '#1E3A8A',
    lineHeight: 16,
  },
  timerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
    marginTop: 4,
  },
  timerText: {
    ...typography.caption,
    color: '#92400E',
    fontWeight: '600',
  },
  buybackTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
    marginTop: 4,
  },
  buybackTagText: {
    ...typography.caption,
    color: '#166534',
    fontWeight: '600',
  },
  sectionHeading: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: spacing.md,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
  },
  actionCardDisabled: {
    backgroundColor: '#F8FAFC',
    borderColor: colors.cardBorderLight,
    opacity: 0.85,
  },
  actionIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionInfo: {
    flex: 1,
  },
  actionTitle: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
  actionTitleDisabled: {
    color: colors.textSecondary,
  },
  actionDesc: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
});
