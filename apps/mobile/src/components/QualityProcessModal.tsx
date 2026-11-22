import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, shadows } from '../theme/tokens';
import Button from './ui/Button';

interface QualityProcessModalProps {
  visible: boolean;
  onClose: () => void;
  onExploreLaptops?: () => void;
}

const INSPECTION_STAGES = [
  {
    step: '01',
    title: '32-Point Hardware Diagnostics',
    description: 'CPU stress analysis, dual-channel RAM tests, SSD read/write speeds, and motherboard thermals verified under sustained load.',
    icon: 'hardware-chip-outline' as const,
    badge: '32 Tests',
    badgeColor: colors.primary,
  },
  {
    step: '02',
    title: 'Battery Health Benchmark (≥85%)',
    description: 'Original OEM battery cycle inspection. Only units retaining at least 85% original battery capacity are certified.',
    icon: 'battery-charging-outline' as const,
    badge: '≥85% Health',
    badgeColor: '#059669',
  },
  {
    step: '03',
    title: 'Display & Color Accuracy',
    description: 'Zero dead pixel policy, even backlight distribution, hinge resistance, and webcam/microphone clarity inspection.',
    icon: 'tv-outline' as const,
    badge: 'Grade A+ Screen',
    badgeColor: '#0284C7',
  },
  {
    step: '04',
    title: 'Keyboard & Port Connectivity',
    description: '100% keystroke responsiveness, multi-touch trackpad calibration, USB-C/Thunderbolt and HDMI port validation.',
    icon: 'keypad-outline' as const,
    badge: '100% Functional',
    badgeColor: '#7C3AED',
  },
  {
    step: '05',
    title: 'Enterprise Data Sanitization',
    description: 'NIST 800-88 compliant storage wiping followed by clean installation of genuine operating systems with security updates.',
    icon: 'shield-checkmark-outline' as const,
    badge: 'NIST 800-88',
    badgeColor: '#D97706',
  },
  {
    step: '06',
    title: 'Doorstep Warranty & 14-Day Return',
    description: 'Every certified machine includes 1-year doorstep warranty, 14-day hassle-free replacement, and up to 70% assured buyback.',
    icon: 'ribbon-outline' as const,
    badge: '1-Yr Warranty',
    badgeColor: '#16A34A',
  },
];

export default function QualityProcessModal({
  visible,
  onClose,
  onExploreLaptops,
}: QualityProcessModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.sheetContainer}>
            {/* Grab Handle */}
            <View style={styles.handleWrap}>
              <View style={styles.handle} />
            </View>

            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerTitleWrap}>
                <View style={styles.headerBadge}>
                  <Ionicons name="shield-checkmark" size={13} color="#38BDF8" />
                  <Text style={styles.headerBadgeText}>LAPTOPMITRA CERTIFIED BENCH</Text>
                </View>
                <Text style={styles.title}>The 32-Point Quality Promise</Text>
                <Text style={styles.subtitle}>
                  How every laptop is inspected, tested, and certified before reaching your hands.
                </Text>
              </View>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={onClose}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Close quality modal"
              >
                <Ionicons name="close" size={20} color={colors.navy} />
              </TouchableOpacity>
            </View>

            {/* Scrollable Inspection Steps */}
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {INSPECTION_STAGES.map((stage) => (
                <View key={stage.step} style={styles.stageCard}>
                  <View style={styles.stageTopRow}>
                    <View style={styles.stepIndicator}>
                      <Text style={styles.stepNum}>{stage.step}</Text>
                    </View>
                    <View style={styles.iconCircle}>
                      <Ionicons name={stage.icon} size={18} color={stage.badgeColor} />
                    </View>
                    <View style={styles.stageTitleWrap}>
                      <Text style={styles.stageTitle}>{stage.title}</Text>
                      <View style={[styles.badgePill, { backgroundColor: `${stage.badgeColor}15` }]}>
                        <Text style={[styles.badgePillText, { color: stage.badgeColor }]}>
                          {stage.badge}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <Text style={styles.stageDesc}>{stage.description}</Text>
                </View>
              ))}

              {/* Bottom Assurance Card */}
              <View style={styles.guaranteeBox}>
                <Ionicons name="checkmark-done-circle" size={26} color="#059669" />
                <View style={styles.guaranteeTextWrap}>
                  <Text style={styles.guaranteeTitle}>Zero Functional Defects Guarantee</Text>
                  <Text style={styles.guaranteeDesc}>
                    Any machine failing even 1 of the 32 checkpoints is rejected and never listed for sale.
                  </Text>
                </View>
              </View>
            </ScrollView>

            {/* Action Footer */}
            <View style={styles.footer}>
              <Button
                title="Explore Certified Laptops"
                onPress={() => {
                  onClose();
                  onExploreLaptops?.();
                }}
                variant="primary"
                size="md"
                fullWidth
                icon={<Ionicons name="arrow-forward" size={16} color="#FFF" />}
                iconPosition="right"
              />
            </View>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(7, 20, 51, 0.65)',
    justifyContent: 'flex-end',
  },
  safeArea: {
    maxHeight: '90%',
  },
  sheetContainer: {
    backgroundColor: '#FFFDF9',
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    overflow: 'hidden',
    ...shadows.lg,
  },
  handleWrap: {
    alignItems: 'center',
    paddingTop: spacing.xs,
    paddingBottom: spacing.xxs,
  },
  handle: {
    width: 38,
    height: 4,
    borderRadius: radius.full,
    backgroundColor: '#CBD5E1',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitleWrap: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(2, 132, 199, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    marginBottom: 6,
  },
  headerBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0284C7',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.navy,
    letterSpacing: -0.3,
    marginBottom: 3,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  scroll: {
    maxHeight: 460,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  stageCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...shadows.xs,
  },
  stageTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: 6,
  },
  stepIndicator: {
    width: 24,
    height: 24,
    borderRadius: radius.full,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNum: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.navy,
  },
  iconCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stageTitleWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  stageTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.navy,
    flex: 1,
  },
  badgePill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  badgePillText: {
    fontSize: 10,
    fontWeight: '800',
  },
  stageDesc: {
    fontSize: 11.5,
    color: colors.textSecondary,
    lineHeight: 17,
  },
  guaranteeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(5, 150, 105, 0.08)',
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(5, 150, 105, 0.25)',
    marginTop: spacing.xs,
  },
  guaranteeTextWrap: {
    flex: 1,
  },
  guaranteeTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#065F46',
    marginBottom: 2,
  },
  guaranteeDesc: {
    fontSize: 11,
    color: '#047857',
    lineHeight: 16,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    backgroundColor: '#FFFDF9',
  },
});
