import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Linking,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { MainStackParamList, MainStackNavigationProp } from '../../navigation/types';
import { useReturnRequest, useUpdateRefundDetails } from '../../hooks/useApi';
import { colors, spacing, radius, shadows } from '../../theme/tokens';
import { SUPPORT_PHONE, WHATSAPP_NUMBER } from '../../config';

type ReturnDetailRouteProp = RouteProp<MainStackParamList, 'ReturnDetail'>;

const TIMELINE_STEPS = [
  { key: 'REQUESTED', label: 'Requested', desc: 'Return request submitted and under technical review' },
  { key: 'APPROVED', label: 'Approved', desc: 'Return approved; courier pickup scheduled' },
  { key: 'PICKUP', label: 'Picked Up', desc: 'Laptop collected by courier partner for transit' },
  { key: 'INSPECTED', label: 'Inspected', desc: 'Hardware diagnostics and serial verification completed' },
  { key: 'REFUNDED', label: 'Refunded', desc: 'Refund processed to bank account or replacement dispatched' },
];

export default function ReturnDetailScreen() {
  const route = useRoute<ReturnDetailRouteProp>();
  const navigation = useNavigation<MainStackNavigationProp>();
  const { returnId } = route.params;

  const { data: returnReq, isLoading, refetch, isRefetching } = useReturnRequest(returnId);
  const updateRefundMutation = useUpdateRefundDetails();

  // Bank Form State for COD updates
  const [isEditingBank, setIsEditingBank] = useState(false);
  const [accountNumber, setAccountNumber] = useState('');
  const [confirmAccountNumber, setConfirmAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [accountHolderName, setAccountHolderName] = useState('');
  const [upiId, setUpiId] = useState('');
  const [refundMode, setRefundMode] = useState<'BANK' | 'UPI'>('BANK');

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!returnReq) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.danger} />
        <Text style={styles.errorTitle}>Return Request Not Found</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Calculate current timeline index
  const statusUpper = returnReq.status?.toUpperCase() || 'REQUESTED';
  let activeStepIndex = 0;
  if (statusUpper === 'APPROVED') activeStepIndex = 1;
  else if (statusUpper === 'PICKUP' || statusUpper === 'PICKED_UP' || statusUpper === 'IN_TRANSIT') activeStepIndex = 2;
  else if (statusUpper === 'INSPECTED' || statusUpper === 'PROCESSING') activeStepIndex = 3;
  else if (statusUpper === 'REFUNDED' || statusUpper === 'COMPLETED' || statusUpper === 'REPLACED') activeStepIndex = 4;
  else if (statusUpper === 'REJECTED' || statusUpper === 'CANCELLED') activeStepIndex = -1;

  const handleSaveBankDetails = () => {
    if (refundMode === 'BANK') {
      if (!accountNumber || !confirmAccountNumber) {
        Alert.alert('Validation Error', 'Please enter and confirm your account number.');
        return;
      }
      if (accountNumber !== confirmAccountNumber) {
        Alert.alert('Validation Error', 'Account numbers do not match.');
        return;
      }
      if (!ifscCode || !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifscCode.toUpperCase())) {
        Alert.alert('Validation Error', 'Invalid IFSC Code (e.g. HDFC0001234).');
        return;
      }
      if (!accountHolderName.trim()) {
        Alert.alert('Validation Error', 'Account holder name is required.');
        return;
      }
    } else {
      if (!upiId.includes('@')) {
        Alert.alert('Validation Error', 'Invalid UPI ID format (e.g. name@bank).');
        return;
      }
    }

    const payload =
      refundMode === 'BANK'
        ? {
            bankDetails: {
              accountNumber,
              ifscCode: ifscCode.toUpperCase(),
              accountHolderName: accountHolderName.trim(),
            },
          }
        : { upiId: upiId.trim() };

    updateRefundMutation.mutate(
      { returnId, data: payload },
      {
        onSuccess: () => {
          setIsEditingBank(false);
          Alert.alert('Details Saved', 'Your refund account details have been updated.');
          refetch();
        },
        onError: (err: any) => {
          Alert.alert('Save Failed', err?.message || 'Could not update refund details.');
        },
      },
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
      }
    >
      {/* Return Header */}
      <View style={styles.headerCard}>
        <View style={styles.headerTop}>
          <Text style={styles.returnNumber}>
            Return #{returnReq.returnNumber || returnReq.id.slice(-8)}
          </Text>
          <View style={styles.statusBadge}>
            <Text style={styles.statusBadgeText}>{returnReq.status}</Text>
          </View>
        </View>

        <Text style={styles.reasonText}>Reason: {returnReq.reason}</Text>

        <View style={styles.metaRow}>
          <Text style={styles.metaText}>
            Type: <Text style={{ fontWeight: '700' }}>{returnReq.type || 'REFUND'}</Text>
          </Text>
          {returnReq.order && (
            <Text style={styles.metaText}>
              • Order #{returnReq.order.orderNumber || (returnReq.order.id ? returnReq.order.id.slice(-8) : '')}
            </Text>
          )}
        </View>
      </View>

      {/* 5-Step Live Timeline Tracker */}
      <View style={styles.timelineCard}>
        <Text style={styles.sectionTitle}>Return & Inspection Progress</Text>

        <View style={styles.timelineList}>
          {TIMELINE_STEPS.map((step, idx) => {
            const isCompleted = activeStepIndex > idx;
            const isCurrent = activeStepIndex === idx;

            return (
              <View key={step.key} style={styles.timelineRow}>
                <View style={styles.timelineIndicatorColumn}>
                  <View
                    style={[
                      styles.timelineDot,
                      isCompleted && styles.timelineDotCompleted,
                      isCurrent && styles.timelineDotCurrent,
                    ]}
                  >
                    {isCompleted ? (
                      <Ionicons name="checkmark" size={12} color="#fff" />
                    ) : (
                      <View style={[styles.timelineDotInner, isCurrent && styles.timelineDotInnerCurrent]} />
                    )}
                  </View>
                  {idx < TIMELINE_STEPS.length - 1 && (
                    <View
                      style={[
                        styles.timelineConnector,
                        isCompleted && styles.timelineConnectorCompleted,
                      ]}
                    />
                  )}
                </View>

                <View style={styles.timelineTextColumn}>
                  <Text
                    style={[
                      styles.timelineStepLabel,
                      (isCurrent || isCompleted) && styles.timelineStepLabelActive,
                    ]}
                  >
                    {step.label}
                  </Text>
                  <Text style={styles.timelineStepDesc}>{step.desc}</Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Courier Pickup Details */}
        {returnReq.pickupAwb && (
          <View style={styles.pickupInfoCard}>
            <Ionicons name="cube-outline" size={18} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.pickupInfoTitle}>Courier Pickup Scheduled</Text>
              <Text style={styles.pickupInfoText}>
                AWB / Tracking: <Text style={{ fontWeight: '700' }}>{returnReq.pickupAwb}</Text>
                {returnReq.pickupCourier ? ` (${returnReq.pickupCourier})` : ''}
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Refund Details & Bank Verification Card */}
      <View style={styles.refundCard}>
        <View style={styles.refundCardHeader}>
          <View>
            <Text style={styles.sectionTitle}>Refund & Payout Details</Text>
            <Text style={styles.refundSubtitle}>
              {returnReq.refundStatus
                ? `Status: ${returnReq.refundStatus}`
                : 'Processed upon completion of hardware inspection'}
            </Text>
          </View>
          {!isEditingBank && (
            <TouchableOpacity onPress={() => setIsEditingBank(true)}>
              <Text style={styles.editLink}>Update Details</Text>
            </TouchableOpacity>
          )}
        </View>

        {returnReq.refundUtr && (
          <View style={styles.utrBox}>
            <Ionicons name="checkmark-circle" size={18} color={colors.green} />
            <Text style={styles.utrText}>
              Bank Transfer UTR: <Text style={{ fontWeight: '700' }}>{returnReq.refundUtr}</Text>
            </Text>
          </View>
        )}

        {isEditingBank ? (
          <View style={styles.editBankForm}>
            <View style={styles.modeToggleRow}>
              <TouchableOpacity
                style={[styles.modeToggleBtn, refundMode === 'BANK' && styles.modeToggleBtnActive]}
                onPress={() => setRefundMode('BANK')}
              >
                <Text style={[styles.modeToggleText, refundMode === 'BANK' && styles.modeToggleTextActive]}>
                  Bank Account
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modeToggleBtn, refundMode === 'UPI' && styles.modeToggleBtnActive]}
                onPress={() => setRefundMode('UPI')}
              >
                <Text style={[styles.modeToggleText, refundMode === 'UPI' && styles.modeToggleTextActive]}>
                  UPI ID
                </Text>
              </TouchableOpacity>
            </View>

            {refundMode === 'BANK' ? (
              <View>
                <Text style={styles.fieldLabel}>Account Holder Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Full name as in bank records"
                  value={accountHolderName}
                  onChangeText={setAccountHolderName}
                />

                <Text style={styles.fieldLabel}>Account Number</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter bank account number"
                  keyboardType="number-pad"
                  secureTextEntry
                  value={accountNumber}
                  onChangeText={setAccountNumber}
                />

                <Text style={styles.fieldLabel}>Confirm Account Number</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Re-enter bank account number"
                  keyboardType="number-pad"
                  value={confirmAccountNumber}
                  onChangeText={setConfirmAccountNumber}
                />

                <Text style={styles.fieldLabel}>IFSC Code</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. HDFC0001234"
                  autoCapitalize="characters"
                  value={ifscCode}
                  onChangeText={(v) => setIfscCode(v.toUpperCase())}
                />
              </View>
            ) : (
              <View>
                <Text style={styles.fieldLabel}>UPI ID (VPA)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. username@okhdfcbank"
                  autoCapitalize="none"
                  value={upiId}
                  onChangeText={setUpiId}
                />
              </View>
            )}

            <View style={styles.formActionButtons}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setIsEditingBank(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSaveBankDetails}
                disabled={updateRefundMutation.isPending}
              >
                {updateRefundMutation.isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveBtnText}>Save Account</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.currentDetailsBox}>
            <Text style={styles.detailLabel}>Destination:</Text>
            <Text style={styles.detailValue}>
              {returnReq.refundMethod === 'UPI'
                ? `UPI: ${returnReq.upiId || 'Pending entry'}`
                : returnReq.bankDetails
                ? `Bank: ****${returnReq.bankDetails.accountNumber?.slice(-4) || '****'} (${returnReq.bankDetails.ifscCode || ''})`
                : 'Original Payment Method / Not specified'}
            </Text>
          </View>
        )}
      </View>

      {/* Support hotline contact */}
      <View style={styles.helpCard}>
        <Ionicons name="headset-outline" size={24} color={colors.primary} />
        <View style={{ flex: 1 }}>
          <Text style={styles.helpTitle}>Questions regarding your return?</Text>
          <Text style={styles.helpText}>
            Reach out via phone or WhatsApp for instant courier pickup coordination.
          </Text>
          <View style={styles.helpButtonsRow}>
            <TouchableOpacity
              style={styles.helpBtn}
              onPress={() => Linking.openURL(`tel:${SUPPORT_PHONE}`)}
            >
              <Ionicons name="call" size={14} color={colors.primary} />
              <Text style={styles.helpBtnText}>Call Specialist</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.helpBtn, { borderColor: '#16a34a' }]}
              onPress={() =>
                Linking.openURL(
                  `https://wa.me/${WHATSAPP_NUMBER}?text=Hi%20LaptopMitra,%20inquiry%20for%20Return%20${returnReq.returnNumber || returnId}`,
                )
              }
            >
              <Ionicons name="logo-whatsapp" size={14} color="#16a34a" />
              <Text style={[styles.helpBtnText, { color: '#16a34a' }]}>WhatsApp</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.pageBg,
  },
  content: {
    padding: spacing.md,
    paddingBottom: 40,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  headerCard: {
    backgroundColor: colors.cardBg,
    borderRadius: radius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  returnNumber: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  statusBadge: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  reasonText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  timelineCard: {
    backgroundColor: colors.cardBg,
    borderRadius: radius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  timelineList: {
    paddingVertical: spacing.xs,
  },
  timelineRow: {
    flexDirection: 'row',
    minHeight: 52,
  },
  timelineIndicatorColumn: {
    alignItems: 'center',
    width: 24,
    marginRight: spacing.sm,
  },
  timelineDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineDotCompleted: {
    borderColor: colors.green,
    backgroundColor: colors.green,
  },
  timelineDotCurrent: {
    borderColor: colors.primary,
  },
  timelineDotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#cbd5e1',
  },
  timelineDotInnerCurrent: {
    backgroundColor: colors.primary,
  },
  timelineConnector: {
    flex: 1,
    width: 2,
    backgroundColor: '#e2e8f0',
    marginVertical: 2,
  },
  timelineConnectorCompleted: {
    backgroundColor: colors.green,
  },
  timelineTextColumn: {
    flex: 1,
    paddingBottom: spacing.sm,
  },
  timelineStepLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },
  timelineStepLabelActive: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
  timelineStepDesc: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 15,
  },
  pickupInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#eff6ff',
    borderRadius: radius.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    marginTop: spacing.xs,
  },
  pickupInfoTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  pickupInfoText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  refundCard: {
    backgroundColor: colors.cardBg,
    borderRadius: radius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  refundCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  refundSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: -4,
    marginBottom: spacing.xs,
  },
  editLink: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  utrBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f0fdf4',
    padding: spacing.sm,
    borderRadius: radius.md,
    marginVertical: spacing.xs,
  },
  utrText: {
    fontSize: 12,
    color: colors.green,
  },
  currentDetailsBox: {
    backgroundColor: '#f8fafc',
    borderRadius: radius.md,
    padding: spacing.sm,
    marginTop: spacing.xs,
  },
  detailLabel: {
    fontSize: 11,
    color: colors.textMuted,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: 2,
  },
  editBankForm: {
    marginTop: spacing.xs,
  },
  modeToggleRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  modeToggleBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: '#f8fafc',
  },
  modeToggleBtnActive: {
    borderColor: colors.primary,
    backgroundColor: '#eff6ff',
  },
  modeToggleText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  modeToggleTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 6,
    marginBottom: 2,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    fontSize: 12,
    color: colors.textPrimary,
  },
  formActionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  cancelBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  cancelBtnText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  saveBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.md,
  },
  saveBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  helpCard: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: colors.cardBg,
    borderRadius: radius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  helpTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  helpText: {
    fontSize: 11,
    color: colors.textSecondary,
    marginVertical: 4,
    lineHeight: 15,
  },
  helpButtonsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: 4,
  },
  helpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  helpBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginVertical: spacing.sm,
  },
  backBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  backBtnText: {
    color: '#fff',
    fontWeight: '700',
  },
});
