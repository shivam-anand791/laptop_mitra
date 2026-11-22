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
import { useCreateChangeRequest } from '../hooks/useApi';

interface ChangeRequestModalProps {
  visible: boolean;
  onClose: () => void;
  orderId: string;
  orderNumber?: string | undefined;
  currentAddress?: {
    street?: string | undefined;
    city?: string | undefined;
    state?: string | undefined;
    pincode?: string | undefined;
  } | undefined;
  currentPhone?: string | undefined;
  onSuccess?: (() => void) | undefined;
}

const PIN_REGEX = /^\d{6}$/;
const PHONE_REGEX = /^\d{10}$/;

export default function ChangeRequestModal({
  visible,
  onClose,
  orderId,
  orderNumber,
  currentAddress,
  currentPhone,
  onSuccess,
}: ChangeRequestModalProps) {
  const [requestType, setRequestType] = useState<'ADDRESS_UPDATE' | 'PHONE_UPDATE'>('ADDRESS_UPDATE');
  const [street, setStreet] = useState(currentAddress?.street || '');
  const [city, setCity] = useState(currentAddress?.city || '');
  const [stateName, setStateName] = useState(currentAddress?.state || '');
  const [pincode, setPincode] = useState(currentAddress?.pincode || '');
  const [phone, setPhone] = useState(currentPhone || '');

  const createChangeRequest = useCreateChangeRequest();

  const handleSubmit = async () => {
    if (requestType === 'ADDRESS_UPDATE') {
      if (!street.trim() || !city.trim() || !stateName.trim()) {
        Alert.alert('Required Fields', 'Please complete the street, city, and state.');
        return;
      }
      if (!PIN_REGEX.test(pincode.trim())) {
        Alert.alert('Invalid PIN Code', 'Please enter a valid 6-digit Indian PIN code.');
        return;
      }

      try {
        await createChangeRequest.mutateAsync({
          orderId,
          type: 'ADDRESS_UPDATE',
          requestedData: {
            street: street.trim(),
            city: city.trim(),
            state: stateName.trim(),
            pincode: pincode.trim(),
          },
        });
        Alert.alert(
          'Request Submitted',
          'Your address modification request has been submitted for support team verification prior to dispatch.',
          [{ text: 'OK', onPress: () => { onClose(); onSuccess?.(); } }]
        );
      } catch (err: any) {
        Alert.alert('Error', err?.message || 'Failed to submit address change request.');
      }
    } else {
      const sanitizedPhone = phone.replace(/\D/g, '');
      if (!PHONE_REGEX.test(sanitizedPhone)) {
        Alert.alert('Invalid Phone Number', 'Please enter a valid 10-digit Indian mobile number.');
        return;
      }

      try {
        await createChangeRequest.mutateAsync({
          orderId,
          type: 'PHONE_UPDATE',
          requestedData: {
            phone: sanitizedPhone,
          },
        });
        Alert.alert(
          'Request Submitted',
          'Your phone update request has been submitted for support team verification.',
          [{ text: 'OK', onPress: () => { onClose(); onSuccess?.(); } }]
        );
      } catch (err: any) {
        Alert.alert('Error', err?.message || 'Failed to submit phone update request.');
      }
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
              <Text style={styles.title}>Update Delivery Details</Text>
              <Text style={styles.subtitle}>
                Order #{orderNumber || orderId.slice(0, 8)} · Pre-dispatch change
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
            {/* Type selector tabs */}
            <View style={styles.tabsRow}>
              <TouchableOpacity
                style={[styles.tab, requestType === 'ADDRESS_UPDATE' && styles.activeTab]}
                onPress={() => setRequestType('ADDRESS_UPDATE')}
              >
                <Ionicons
                  name="location-outline"
                  size={16}
                  color={requestType === 'ADDRESS_UPDATE' ? colors.primary : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.tabText,
                    requestType === 'ADDRESS_UPDATE' && styles.activeTabText,
                  ]}
                >
                  Delivery Address
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tab, requestType === 'PHONE_UPDATE' && styles.activeTab]}
                onPress={() => setRequestType('PHONE_UPDATE')}
              >
                <Ionicons
                  name="call-outline"
                  size={16}
                  color={requestType === 'PHONE_UPDATE' ? colors.primary : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.tabText,
                    requestType === 'PHONE_UPDATE' && styles.activeTabText,
                  ]}
                >
                  Contact Number
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.infoBanner}>
              <Ionicons name="information-circle-outline" size={16} color="#1D4ED8" />
              <Text style={styles.infoBannerText}>
                Changes are reviewed by our operations desk before shipment leaves our facility. Once dispatched, carrier destination changes cannot be guaranteed.
              </Text>
            </View>

            {requestType === 'ADDRESS_UPDATE' ? (
              <View style={styles.formSection}>
                <Text style={styles.label}>Street / House / Building Details</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={street}
                  onChangeText={setStreet}
                  placeholder="e.g. Flat 302, Green Valley Apartments"
                  placeholderTextColor={colors.textMuted}
                  multiline
                  numberOfLines={2}
                />

                <View style={styles.row}>
                  <View style={[styles.col, { marginRight: spacing.sm }]}>
                    <Text style={styles.label}>City</Text>
                    <TextInput
                      style={styles.input}
                      value={city}
                      onChangeText={setCity}
                      placeholder="e.g. Bengaluru"
                      placeholderTextColor={colors.textMuted}
                    />
                  </View>
                  <View style={styles.col}>
                    <Text style={styles.label}>State</Text>
                    <TextInput
                      style={styles.input}
                      value={stateName}
                      onChangeText={setStateName}
                      placeholder="e.g. Karnataka"
                      placeholderTextColor={colors.textMuted}
                    />
                  </View>
                </View>

                <Text style={styles.label}>PIN Code (6 digits)</Text>
                <TextInput
                  style={styles.input}
                  value={pincode}
                  onChangeText={(val) => setPincode(val.replace(/\D/g, '').slice(0, 6))}
                  placeholder="560001"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                  maxLength={6}
                />
              </View>
            ) : (
              <View style={styles.formSection}>
                <Text style={styles.label}>10-Digit Mobile Number</Text>
                <View style={styles.phoneInputRow}>
                  <View style={styles.prefixBox}>
                    <Text style={styles.prefixText}>+91</Text>
                  </View>
                  <TextInput
                    style={[styles.input, { flex: 1, borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }]}
                    value={phone}
                    onChangeText={(val) => setPhone(val.replace(/\D/g, '').slice(0, 10))}
                    placeholder="9876543210"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="phone-pad"
                    maxLength={10}
                  />
                </View>
              </View>
            )}
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitBtn, createChangeRequest.isPending && styles.btnDisabled]}
              onPress={handleSubmit}
              disabled={createChangeRequest.isPending}
            >
              {createChangeRequest.isPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.submitBtnText}>Submit Request</Text>
              )}
            </TouchableOpacity>
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
    maxHeight: '90%',
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
  tabsRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorderLight,
    marginBottom: spacing.md,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    ...typography.body,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  activeTabText: {
    color: colors.primary,
    fontWeight: '700',
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  infoBannerText: {
    ...typography.caption,
    color: '#1E40AF',
    flex: 1,
    lineHeight: 16,
  },
  formSection: {
    marginBottom: spacing.lg,
  },
  label: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    marginBottom: 6,
    marginTop: spacing.xs,
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
  textArea: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    marginTop: spacing.xs,
  },
  col: {
    flex: 1,
  },
  phoneInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  prefixBox: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderRightWidth: 0,
    borderColor: colors.cardBorder,
    borderTopLeftRadius: radius.md,
    borderBottomLeftRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  prefixText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
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
    minWidth: 120,
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
