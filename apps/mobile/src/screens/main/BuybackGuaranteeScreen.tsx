import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BUYBACK_POLICY } from '@laptopmitra/types';
import { colors, radius, shadows, spacing } from '../../theme/tokens';
import { WHATSAPP_NUMBER } from '../../config';

export default function BuybackGuaranteeScreen() {
  const insets = useSafeAreaInsets();
  const { title, subtitle, tiers, note, eligibility, deductions, howToClaim } = BUYBACK_POLICY;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.badgeRow}>
          <View style={styles.badge}>
            <Ionicons name="shield-checkmark" size={14} color="#0284C7" />
            <Text style={styles.badgeText}>ASSURED VALUE PROGRAM</Text>
          </View>
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
      >
        {/* Assured Value Schedule Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="trending-up" size={18} color="#0284C7" />
            <Text style={styles.cardTitle}>Assured Buyback Schedule</Text>
          </View>

          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableCol, styles.colPeriod, styles.headerText]}>Period</Text>
              <Text style={[styles.tableCol, styles.colPercent, styles.headerText]}>Value (%)</Text>
              <Text style={[styles.tableCol, styles.colExample, styles.headerText]}>Example (₹30k)</Text>
            </View>

            {tiers.map((tier, idx) => (
              <View
                key={tier.period}
                style={[styles.tableRow, idx % 2 === 0 && styles.rowAlt]}
              >
                <Text style={[styles.tableCol, styles.colPeriod, styles.rowPeriod]}>{tier.period}</Text>
                <Text style={[styles.tableCol, styles.colPercent, styles.rowPercent]}>{tier.percentage}%</Text>
                <Text style={[styles.tableCol, styles.colExample, styles.rowExample]}>{tier.example.replace(' on ₹30,000 laptop', '')}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.noteText}>{note}</Text>
        </View>

        {/* 1. Eligibility Criteria */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>1. Eligibility Criteria</Text>
          {eligibility.map((item, idx) => (
            <View key={idx} style={styles.bulletItem}>
              <Ionicons name="checkmark-circle" size={16} color={colors.green} style={{ marginTop: 2 }} />
              <Text style={styles.bulletText}>{item}</Text>
            </View>
          ))}
        </View>

        {/* 2. Condition & Deductions */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>2. Condition &amp; Deductions</Text>
          <Text style={styles.sectionDesc}>
            The assured price assumes the laptop is in &quot;Good&quot; condition. Deductions may apply:
          </Text>

          <View style={styles.deductionBox}>
            <Text style={styles.deductionTitle}>Functional Issues</Text>
            <Text style={styles.deductionDesc}>{deductions.functional}</Text>
          </View>

          <View style={styles.deductionBox}>
            <Text style={styles.deductionTitle}>Physical Damage</Text>
            <Text style={styles.deductionDesc}>{deductions.physical}</Text>
          </View>

          <View style={styles.deductionBox}>
            <Text style={styles.deductionTitle}>Accessories</Text>
            <Text style={styles.deductionDesc}>{deductions.accessories}</Text>
          </View>
        </View>

        {/* 3. How to Claim */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>3. How to Claim</Text>
          {howToClaim.map((step, idx) => (
            <View key={idx} style={styles.stepItem}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>{idx + 1}</Text>
              </View>
              <Text style={styles.stepText}>{step}</Text>
            </View>
          ))}
        </View>

        {/* Support CTA */}
        <View style={styles.supportCard}>
          <Text style={styles.supportTitle}>Questions about Buyback?</Text>
          <Text style={styles.supportDesc}>
            Our hardware and buyback specialists are available via WhatsApp and phone assistance.
          </Text>
          <TouchableOpacity
            style={styles.whatsAppButton}
            onPress={() => Linking.openURL(`https://wa.me/${WHATSAPP_NUMBER}?text=Hi%20LaptopMitra,%20I%20have%20questions%20about%20the%20Buyback%20Guarantee.`)}
            activeOpacity={0.8}
          >
            <Ionicons name="logo-whatsapp" size={18} color="#FFFFFF" />
            <Text style={styles.whatsAppButtonText}>Chat with Buyback Support</Text>
          </TouchableOpacity>
        </View>
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
    backgroundColor: '#0F172A',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
  },
  badgeRow: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(2, 132, 199, 0.2)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'rgba(2, 132, 199, 0.4)',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#38BDF8',
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: spacing.xs,
  },
  subtitle: {
    fontSize: 12,
    color: '#94A3B8',
    lineHeight: 18,
    marginTop: 4,
  },
  scrollContent: {
    padding: spacing.md,
    gap: spacing.md,
  },
  card: {
    backgroundColor: colors.cardBg,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    ...shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.navy,
  },
  table: {
    borderWidth: 1,
    borderColor: colors.cardBorderLight,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorderLight,
  },
  tableCol: {
    fontSize: 11,
  },
  colPeriod: {
    flex: 1.4,
  },
  colPercent: {
    flex: 1,
    textAlign: 'center',
  },
  colExample: {
    flex: 1.2,
    textAlign: 'right',
  },
  headerText: {
    fontWeight: '800',
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorderLight,
  },
  rowAlt: {
    backgroundColor: '#F8FAFC',
  },
  rowPeriod: {
    fontWeight: '600',
    color: colors.navy,
  },
  rowPercent: {
    fontWeight: '800',
    color: '#0284C7',
  },
  rowExample: {
    fontWeight: '700',
    color: colors.textSecondary,
  },
  noteText: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: spacing.sm,
    fontStyle: 'italic',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.navy,
    marginBottom: spacing.sm,
  },
  sectionDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    lineHeight: 18,
  },
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs + 2,
    marginBottom: spacing.xs + 2,
  },
  bulletText: {
    fontSize: 12,
    color: colors.textPrimary,
    flex: 1,
    lineHeight: 18,
  },
  deductionBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: radius.md,
    padding: spacing.sm + 2,
    borderWidth: 1,
    borderColor: colors.cardBorderLight,
    marginBottom: spacing.xs + 2,
  },
  deductionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.navy,
    marginBottom: 2,
  },
  deductionDesc: {
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  stepNumber: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  stepNumberText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primary,
  },
  stepText: {
    fontSize: 12,
    color: colors.textPrimary,
    flex: 1,
    lineHeight: 18,
  },
  supportCard: {
    backgroundColor: '#1E293B',
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
  },
  supportTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  supportDesc: {
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 16,
  },
  whatsAppButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#16A34A',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: radius.md,
    marginTop: 4,
  },
  whatsAppButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
});
