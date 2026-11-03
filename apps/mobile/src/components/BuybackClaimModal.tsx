import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../theme/tokens';
import { useCreateBuybackRequest } from '../hooks/useApi';
import { formatIndianRupees } from '../utils/account-helpers';

interface BuybackClaimModalProps {
  visible: boolean;
  onClose: () => void;
  orderId: string;
  orderItemId: string;
  productName: string;
  invoicePrice: number;
  tierPercent: number;
  pickupCharge?: number | undefined;
  unitNumber?: number | undefined;
  shippingAddress?: any | undefined;
  onSuccess?: (() => void) | undefined;
}

const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;

export default function BuybackClaimModal({
  visible,
  onClose,
  orderId,
  orderItemId,
  productName,
  invoicePrice,
  tierPercent,
  pickupCharge = 0,
  unitNumber = 1,
  shippingAddress,
  onSuccess,
}: BuybackClaimModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Condition checklist
  const [powersOn, setPowersOn] = useState(false);
  const [screenIntact, setScreenIntact] = useState(false);
  const [keyboardTrackpadWorking, setKeyboardTrackpadWorking] = useState(false);
  const [originalChargerIncluded, setOriginalChargerIncluded] = useState(false);
  const [batteryHealthPercent, setBatteryHealthPercent] = useState('85');

  // Payout method & details
  const [payoutType, setPayoutType] = useState<'BANK' | 'UPI'>('BANK');
  const [accountNumber, setAccountNumber] = useState('');
  const [confirmAccountNumber, setConfirmAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [accountHolderName, setAccountHolderName] = useState('');
  const [upiId, setUpiId] = useState('');

  const createBuyback = useCreateBuybackRequest();

  // Valuation
  const grossValuation = Math.round((invoicePrice * tierPercent) / 100);
  const netPayout = Math.max(0, grossValuation - pickupCharge);

  const handleNextFromChecklist = () => {
    if (!powersOn || !screenIntact || !keyboardTrackpadWorking || !originalChargerIncluded) {
      Alert.alert(
        'Checklist Incomplete',
        'All 4 physical and functional conditions must be satisfied to qualify for the Assured Buyback Guarantee.'
      );
      return;
    }
    const batteryNum = parseInt(batteryHealthPercent, 10);
    if (isNaN(batteryNum) || batteryNum < 70) {
      Alert.alert(
        'Battery Health Minimum',
        'Minimum required battery health for standard assured buyback is 70%.'
      );
      return;
    }
    setStep(2);
  };

  const handleSubmit = async () => {
    if (payoutType === 'BANK') {
      if (!accountNumber.trim() || !accountHolderName.trim() || !ifscCode.trim()) {
        Alert.alert('Required Fields', 'Please complete all bank payout fields.');
        return;
      }
      if (accountNumber.trim() !== confirmAccountNumber.trim()) {
        Alert.alert('Mismatch', 'Account numbers do not match.');
        return;
      }
      const upperIfsc = ifscCode.trim().toUpperCase();
      if (!IFSC_REGEX.test(upperIfsc)) {
        Alert.alert('Invalid IFSC', 'Please enter a valid 11-character Indian IFSC code (e.g. HDFC0001234).');
        return;
      }
    } else {
      if (!upiId.trim() || !upiId.includes('@')) {
        Alert.alert('Invalid UPI ID', 'Please enter a valid UPI ID (e.g. username@okhdfcbank).');
        return;
      }
    }

    try {
      await createBuyback.mutateAsync({
        orderId,
        orderItemId,
        unitNumber,
        conditionChecklist: {
          powersOn,
          screenIntact,
          keyboardTrackpadWorking,
          originalChargerIncluded,
          batteryHealthPercent: parseInt(batteryHealthPercent, 10) || 80,
        },
        payoutDetails:
          payoutType === 'BANK'
            ? {
                payoutType: 'BANK',
                accountNumber: accountNumber.trim(),
                ifscCode: ifscCode.trim().toUpperCase(),
                accountHolderName: accountHolderName.trim(),
              }
            : {
                payoutType: 'UPI',
                upiId: upiId.trim(),
              },
        pickupAddress: shippingAddress,
      });

      Alert.alert(
        'Buyback Claim Submitted',
        'Your assured buyback quote is locked for 15 days. Our courier team will contact you to schedule free doorstep inspection and pickup.',
        [{ text: 'View Claim', onPress: () => { onClose(); onSuccess?.(); } }]
      );
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to submit buyback claim.');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Assured Buyback Claim</Text>
              <Text style={styles.subtitle} numberOfLines={1}>
                {productName} · Step {step} of 3
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
            {step === 1 && (
              <View style={styles.stepContainer}>
                <Text style={styles.sectionHeading}>1. Diagnostic & Hardware Condition</Text>
                <Text style={styles.sectionSubtext}>
                  Self-certify the device condition to lock in your guaranteed tier valuation.
                </Text>

                <TouchableOpacity
                  style={[styles.checkboxCard, powersOn && styles.checkboxCardChecked]}
                  onPress={() => setPowersOn(!powersOn)}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={powersOn ? 'checkbox' : 'square-outline'}
                    size={22}
                    color={powersOn ? colors.primary : colors.textSecondary}
                  />
                  <View style={styles.checkTextCol}>
                    <Text style={styles.checkTitle}>Device Powers On & Boots Normally</Text>
                    <Text style={styles.checkDesc}>Motherboard, BIOS, and OS load without blue screen or freezing</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.checkboxCard, screenIntact && styles.checkboxCardChecked]}
                  onPress={() => setScreenIntact(!screenIntact)}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={screenIntact ? 'checkbox' : 'square-outline'}
                    size={22}
                    color={screenIntact ? colors.primary : colors.textSecondary}
                  />
                  <View style={styles.checkTextCol}>
                    <Text style={styles.checkTitle}>Screen & Display are Intact</Text>
                    <Text style={styles.checkDesc}>No cracks, heavy lines, dead pixels, or bleeding backlight</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.checkboxCard, keyboardTrackpadWorking && styles.checkboxCardChecked]}
                  onPress={() => setKeyboardTrackpadWorking(!keyboardTrackpadWorking)}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={keyboardTrackpadWorking ? 'checkbox' : 'square-outline'}
                    size={22}
                    color={keyboardTrackpadWorking ? colors.primary : colors.textSecondary}
                  />
                  <View style={styles.checkTextCol}>
                    <Text style={styles.checkTitle}>Keyboard & Trackpad Functional</Text>
                    <Text style={styles.checkDesc}>All keys register input correctly; touchpad click works</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.checkboxCard, originalChargerIncluded && styles.checkboxCardChecked]}
                  onPress={() => setOriginalChargerIncluded(!originalChargerIncluded)}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={originalChargerIncluded ? 'checkbox' : 'square-outline'}
                    size={22}
                    color={originalChargerIncluded ? colors.primary : colors.textSecondary}
                  />
                  <View style={styles.checkTextCol}>
                    <Text style={styles.checkTitle}>Original / Compatible Charger Included</Text>
                    <Text style={styles.checkDesc}>Working power brick and charging cable must accompany laptop</Text>
                  </View>
                </TouchableOpacity>

                <View style={styles.batteryInputBox}>
                  <Text style={styles.label}>Estimated Battery Health Percentage (Min 70%)</Text>
                  <View style={styles.batteryRow}>
                    <TextInput
                      style={[styles.input, { flex: 1 }]}
                      value={batteryHealthPercent}
                      onChangeText={(v) => setBatteryHealthPercent(v.replace(/\D/g, ''))}
                      keyboardType="numeric"
                      maxLength={3}
                      placeholder="85"
                      placeholderTextColor={colors.textMuted}
                    />
                    <Text style={styles.percentSymbol}>%</Text>
                  </View>
                </View>
              </View>
            )}

            {step === 2 && (
              <View style={styles.stepContainer}>
                <Text style={styles.sectionHeading}>2. Assured Buyback Valuation Breakdown</Text>
                <Text style={styles.sectionSubtext}>
                  Calculated against your original invoice purchase basis.
                </Text>

                <View style={styles.valuationCard}>
                  <View style={styles.valRow}>
                    <Text style={styles.valLabel}>Original Purchase Price:</Text>
                    <Text style={styles.valValue}>{formatIndianRupees(invoicePrice)}</Text>
                  </View>
                  <View style={styles.valRow}>
                    <Text style={styles.valLabel}>Assured Policy Tier:</Text>
                    <Text style={[styles.valValue, { color: colors.primary, fontWeight: '700' }]}>
                      {tierPercent}% Payout Rate
                    </Text>
                  </View>
                  <View style={styles.valRow}>
                    <Text style={styles.valLabel}>Gross Valuation:</Text>
                    <Text style={styles.valValue}>{formatIndianRupees(grossValuation)}</Text>
                  </View>
                  {pickupCharge > 0 && (
                    <View style={styles.valRow}>
                      <Text style={styles.valLabel}>Pickup & Logistics Charge:</Text>
                      <Text style={[styles.valValue, { color: colors.danger }]}>
                        - {formatIndianRupees(pickupCharge)}
                      </Text>
                    </View>
                  )}
                  <View style={[styles.valRow, styles.netRow]}>
                    <Text style={styles.netLabel}>Estimated Net Payout:</Text>
                    <Text style={styles.netValue}>{formatIndianRupees(netPayout)}</Text>
                  </View>
                </View>

                <View style={styles.guaranteePillBox}>
                  <Ionicons name="shield-checkmark" size={18} color="#15803D" />
                  <Text style={styles.guaranteeText}>
                    Quote is locked for 15 days upon submission. Free doorstep pickup & return if offer is declined.
                  </Text>
                </View>

                {shippingAddress && (
                  <View style={styles.addressSummary}>
                    <Text style={styles.addressHeading}>Doorstep Inspection & Pickup Location:</Text>
                    <Text style={styles.addressBody}>
                      {shippingAddress.street || shippingAddress.addressLine1}, {shippingAddress.city},{' '}
                      {shippingAddress.state} - {shippingAddress.pincode}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {step === 3 && (
              <View style={styles.stepContainer}>
                <Text style={styles.sectionHeading}>3. Direct Payout Details</Text>
                <Text style={styles.sectionSubtext}>
                  Encrypted at rest. Payout is released via NEFT/IMPS or UPI upon device physical pass.
                </Text>

                {/* Payout method toggle */}
                <View style={styles.payoutTabs}>
                  <TouchableOpacity
                    style={[styles.payoutTab, payoutType === 'BANK' && styles.payoutTabActive]}
                    onPress={() => setPayoutType('BANK')}
                  >
                    <Ionicons
                      name="business-outline"
                      size={16}
                      color={payoutType === 'BANK' ? colors.primary : colors.textSecondary}
                    />
                    <Text style={[styles.payoutTabText, payoutType === 'BANK' && styles.payoutTabTextActive]}>
                      Bank Account
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.payoutTab, payoutType === 'UPI' && styles.payoutTabActive]}
                    onPress={() => setPayoutType('UPI')}
                  >
                    <Ionicons
                      name="phone-portrait-outline"
                      size={16}
                      color={payoutType === 'UPI' ? colors.primary : colors.textSecondary}
                    />
                    <Text style={[styles.payoutTabText, payoutType === 'UPI' && styles.payoutTabTextActive]}>
                      Instant UPI ID
                    </Text>
                  </TouchableOpacity>
                </View>

                {payoutType === 'BANK' ? (
                  <View style={styles.bankFields}>
                    <Text style={styles.label}>Account Holder Legal Name</Text>
                    <TextInput
                      style={styles.input}
                      value={accountHolderName}
                      onChangeText={setAccountHolderName}
                      placeholder="e.g. Rahul Sharma"
                      placeholderTextColor={colors.textMuted}
                    />

                    <Text style={styles.label}>Bank Account Number</Text>
                    <TextInput
                      style={styles.input}
                      value={accountNumber}
                      onChangeText={setAccountNumber}
                      keyboardType="numeric"
                      placeholder="Enter account number"
                      placeholderTextColor={colors.textMuted}
                      secureTextEntry
                    />

                    <Text style={styles.label}>Confirm Account Number</Text>
                    <TextInput
                      style={styles.input}
                      value={confirmAccountNumber}
                      onChangeText={setConfirmAccountNumber}
                      keyboardType="numeric"
                      placeholder="Re-enter account number"
                      placeholderTextColor={colors.textMuted}
                    />

                    <Text style={styles.label}>Bank IFSC Code</Text>
                    <TextInput
                      style={[styles.input, { fontVariant: ['tabular-nums'] }]}
                      value={ifscCode}
                      onChangeText={(v) => setIfscCode(v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11))}
                      placeholder="HDFC0001234"
                      placeholderTextColor={colors.textMuted}
                      autoCapitalize="characters"
                      maxLength={11}
                    />
                  </View>
                ) : (
                  <View style={styles.bankFields}>
                    <Text style={styles.label}>Virtual Payment Address (VPA / UPI ID)</Text>
                    <TextInput
                      style={styles.input}
                      value={upiId}
                      onChangeText={setUpiId}
                      placeholder="username@okhdfcbank"
                      placeholderTextColor={colors.textMuted}
                      autoCapitalize="none"
                    />
                    <Text style={styles.caption}>
                      Payout will be transferred directly to this handle once physical inspection passes.
                    </Text>
                  </View>
                )}
              </View>
            )}
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.footer}>
            {step > 1 ? (
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setStep((s) => (s - 1) as any)}>
                <Text style={styles.cancelBtnText}>Back</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            )}

            {step === 1 && (
              <TouchableOpacity style={styles.submitBtn} onPress={handleNextFromChecklist}>
                <Text style={styles.submitBtnText}>Review Valuation</Text>
              </TouchableOpacity>
            )}

            {step === 2 && (
              <TouchableOpacity style={styles.submitBtn} onPress={() => setStep(3)}>
                <Text style={styles.submitBtnText}>Add Payout Details</Text>
              </TouchableOpacity>
            )}

            {step === 3 && (
              <TouchableOpacity
                style={[styles.submitBtn, createBuyback.isPending && styles.btnDisabled]}
                onPress={handleSubmit}
                disabled={createBuyback.isPending}
              >
                {createBuyback.isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.submitBtnText}>Confirm Buyback Claim</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
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
    maxHeight: '92%',
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
  stepContainer: {
    marginBottom: spacing.lg,
  },
  sectionHeading: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
  sectionSubtext: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
    marginBottom: spacing.md,
  },
  checkboxCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: '#F8FAFC',
    marginBottom: spacing.sm,
  },
  checkboxCardChecked: {
    borderColor: '#93C5FD',
    backgroundColor: '#EFF6FF',
  },
  checkTextCol: {
    flex: 1,
  },
  checkTitle: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
  checkDesc: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  batteryInputBox: {
    marginTop: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: '#F1F5F9',
  },
  batteryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  percentSymbol: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  valuationCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
    gap: 10,
    marginBottom: spacing.md,
  },
  valRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  valLabel: {
    ...typography.body,
    color: colors.textSecondary,
  },
  valValue: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
  netRow: {
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    paddingTop: spacing.sm,
    marginTop: 2,
  },
  netLabel: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
  netValue: {
    ...typography.h3,
    color: '#15803D',
  },
  guaranteePillBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  guaranteeText: {
    ...typography.caption,
    color: '#166534',
    flex: 1,
    lineHeight: 16,
  },
  addressSummary: {
    backgroundColor: '#F8FAFC',
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.cardBorderLight,
  },
  addressHeading: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  addressBody: {
    ...typography.caption,
    color: colors.textPrimary,
    lineHeight: 16,
  },
  payoutTabs: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  payoutTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: '#FAFAFA',
  },
  payoutTabActive: {
    borderColor: colors.primary,
    backgroundColor: '#EFF6FF',
  },
  payoutTabText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  payoutTabTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  bankFields: {
    gap: spacing.xs,
  },
  label: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    marginBottom: 4,
    marginTop: spacing.xs,
  },
  caption: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.textPrimary,
    backgroundColor: '#FAFAFA',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorderLight,
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
  },
  cancelBtnText: {
    ...typography.bodyBold,
    color: colors.textSecondary,
  },
  submitBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    minWidth: 130,
    alignItems: 'center',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    ...typography.bodyBold,
    color: '#ffffff',
  },
});
