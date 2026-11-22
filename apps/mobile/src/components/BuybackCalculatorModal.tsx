import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BUYBACK_POLICY } from '@laptopmitra/types';
import { colors, radius, shadows, spacing } from '../theme/tokens';

interface BuybackCalculatorModalProps {
  visible: boolean;
  onClose: () => void;
  productPrice: number;
  productName: string;
  onViewFullPolicy?: () => void;
}

export default function BuybackCalculatorModal({
  visible,
  onClose,
  productPrice,
  productName,
  onViewFullPolicy,
}: BuybackCalculatorModalProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const tiers = BUYBACK_POLICY.tiers.map((tier) => {
    const estimatedValue = Math.round((productPrice * tier.percentage) / 100);
    return {
      ...tier,
      estimatedValue,
    };
  });

  const selectedTier = (tiers[selectedIndex] ?? tiers[0])!;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={styles.modalContent}>
          {/* Top Handle */}
          <View style={styles.handleBar} />

          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <View style={styles.badgeRow}>
                <Ionicons name="shield-checkmark" size={14} color="#0284C7" />
                <Text style={styles.badgeText}>ASSURED LIQUIDITY</Text>
              </View>
              <Text style={styles.title}>Guaranteed Buyback</Text>
              <Text style={styles.subtitle} numberOfLines={1}>
                {productName}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={onClose}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollBody}>
            {/* Live Calculated Payout Highlight */}
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>
                {"YOU'LL RECEIVE AT LEAST — " + selectedTier.period.toUpperCase()}
              </Text>
              <Text style={styles.summaryAmount}>
                ₹{selectedTier.estimatedValue.toLocaleString('en-IN')}
              </Text>
              <View style={styles.percentBadge}>
                <Text style={styles.percentBadgeText}>
                  {selectedTier.percentage}% Guaranteed Value
                </Text>
              </View>
              <Text style={styles.summaryNote}>
                Calculated directly against product price ₹{Math.round(productPrice).toLocaleString('en-IN')}
              </Text>
            </View>

            {/* Horizontal Scrolling Tenure Selector (Matching Web Slider) */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionLabel}>CHOOSE RETURN TENURE</Text>
                <View style={styles.clockRow}>
                  <Ionicons name="time-outline" size={14} color={colors.primary} />
                  <Text style={styles.clockText}>{selectedTier.period}</Text>
                </View>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.tenureScroll}
              >
                {tiers.map((tier, idx) => {
                  const isSelected = idx === selectedIndex;
                  return (
                    <TouchableOpacity
                      key={tier.period}
                      style={[
                        styles.tenureChip,
                        isSelected && styles.tenureChipActive,
                      ]}
                      onPress={() => setSelectedIndex(idx)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.tenurePeriod, isSelected && styles.tenurePeriodActive]}>
                        {tier.period}
                      </Text>
                      <Text style={[styles.tenureValue, isSelected && styles.tenureValueActive]}>
                        {tier.percentage}%
                      </Text>
                      <Text style={[styles.tenureEstimate, isSelected && styles.tenureEstimateActive]}>
                        ₹{Math.round(tier.estimatedValue / 1000)}k
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Schedule Table Summary */}
            <View style={styles.scheduleCard}>
              <Text style={styles.scheduleTitle}>Full Buyback Valuation Schedule</Text>
              <View style={styles.scheduleTable}>
                {tiers.map((tier, idx) => {
                  const isCurrent = idx === selectedIndex;
                  return (
                    <View
                      key={tier.period}
                      style={[
                        styles.scheduleRow,
                        idx < tiers.length - 1 && styles.scheduleRowBorder,
                        isCurrent && styles.scheduleRowCurrent,
                      ]}
                    >
                      <View style={styles.periodCol}>
                        {isCurrent && <View style={styles.currentDot} />}
                        <Text style={[styles.tablePeriodText, isCurrent && styles.tableTextBold]}>
                          {tier.period}
                        </Text>
                      </View>
                      <Text style={[styles.tablePercentText, isCurrent && styles.tablePercentBold]}>
                        {tier.percentage}%
                      </Text>
                      <Text style={[styles.tableValueText, isCurrent && styles.tableValueBold]}>
                        ₹{tier.estimatedValue.toLocaleString('en-IN')}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* Condition Check */}
            <View style={styles.conditionsBox}>
              <Ionicons name="information-circle-outline" size={16} color="#0284C7" />
              <Text style={styles.conditionsText}>
                {BUYBACK_POLICY.eligibility[0] || 'Device must power on with intact screen and working keyboard/trackpad.'}
              </Text>
            </View>

            {/* Complete Policy Link */}
            {onViewFullPolicy && (
              <TouchableOpacity
                style={styles.policyLink}
                onPress={() => {
                  onClose();
                  onViewFullPolicy();
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.policyLinkText}>Read Complete Buyback Policy &amp; Terms</Text>
                <Ionicons name="arrow-forward" size={14} color={colors.primary} />
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
  },
  modalContent: {
    backgroundColor: colors.cardBg,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    maxHeight: Dimensions.get('window').height * 0.82,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xxl,
    ...shadows.lg,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginVertical: spacing.xs + 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorderLight,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E0F2FE',
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 2,
    borderRadius: radius.xs,
    marginBottom: 4,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#0284C7',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.navy,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  scrollBody: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  summaryCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: radius.xl,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    ...shadows.sm,
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#1E40AF',
    letterSpacing: 0.8,
  },
  summaryAmount: {
    fontSize: 32,
    fontWeight: '900',
    color: colors.navy,
    marginVertical: 4,
  },
  percentBadge: {
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#86EFAC',
    paddingHorizontal: spacing.md,
    paddingVertical: 3,
    borderRadius: radius.full,
    marginBottom: spacing.xs,
  },
  percentBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#15803D',
  },
  summaryNote: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 2,
  },
  section: {
    gap: spacing.xs + 2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  clockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  clockText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  tenureScroll: {
    gap: spacing.xs + 2,
    paddingVertical: 4,
  },
  tenureChip: {
    backgroundColor: '#F8FAFC',
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    minWidth: 84,
  },
  tenureChipActive: {
    backgroundColor: '#EFF6FF',
    borderColor: colors.primary,
    ...shadows.sm,
  },
  tenurePeriod: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  tenurePeriodActive: {
    color: colors.primary,
  },
  tenureValue: {
    fontSize: 15,
    fontWeight: '900',
    color: colors.navy,
    marginVertical: 2,
  },
  tenureValueActive: {
    color: colors.primary,
  },
  tenureEstimate: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textMuted,
  },
  tenureEstimateActive: {
    color: '#15803D',
    fontWeight: '700',
  },
  scheduleCard: {
    backgroundColor: colors.cardBg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
    ...shadows.sm,
  },
  scheduleTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.navy,
    marginBottom: spacing.sm,
  },
  scheduleTable: {
    gap: 0,
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 7,
    paddingHorizontal: spacing.xs,
  },
  scheduleRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  scheduleRowCurrent: {
    backgroundColor: '#EFF6FF',
    borderRadius: radius.xs,
  },
  periodCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1.2,
  },
  currentDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  tablePeriodText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  tablePercentText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.navy,
    flex: 0.8,
    textAlign: 'center',
  },
  tableValueText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    flex: 1,
    textAlign: 'right',
  },
  tableTextBold: {
    fontWeight: '800',
    color: colors.navy,
  },
  tablePercentBold: {
    fontWeight: '900',
    color: colors.primary,
  },
  tableValueBold: {
    fontWeight: '900',
    color: colors.navy,
  },
  conditionsBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#F8FAFC',
    borderRadius: radius.md,
    padding: spacing.sm + 2,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  conditionsText: {
    flex: 1,
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  policyLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.sm,
  },
  policyLinkText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
});
