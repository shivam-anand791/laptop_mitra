import { useState, useEffect } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../providers/AuthProvider';
import { colors, radius, spacing, typography } from '../theme/tokens';
import Button from './ui/Button';

interface CorporateQuoteModalProps {
  visible: boolean;
  onClose: () => void;
  prefill?: {
    productId?: string;
    laptopModel?: string;
    mode?: 'sell' | 'lease';
    quantity?: number;
  };
}

export default function CorporateQuoteModal({
  visible,
  onClose,
  prefill,
}: CorporateQuoteModalProps) {
  const { getClient } = useAuth();

  const [companyName, setCompanyName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [mode, setMode] = useState<'sell' | 'lease'>(prefill?.mode || 'sell');
  const [quantity, setQuantity] = useState<string>(String(prefill?.quantity || 5));
  const [laptopModel, setLaptopModel] = useState(prefill?.laptopModel || '');
  const [expectedTenure, setExpectedTenure] = useState('12 Months');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [submittedInquiryId, setSubmittedInquiryId] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      if (prefill?.mode) setMode(prefill.mode);
      if (prefill?.quantity) setQuantity(String(prefill.quantity));
      if (prefill?.laptopModel) setLaptopModel(prefill.laptopModel);
      setSubmittedInquiryId(null);
    }
  }, [visible, prefill]);

  const handleSubmit = async () => {
    if (!companyName.trim()) {
      Alert.alert('Required Field', 'Please enter your company or organization name.');
      return;
    }
    if (!contactPerson.trim()) {
      Alert.alert('Required Field', 'Please enter your contact person name.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      Alert.alert('Invalid Email', 'Please enter a valid business email address.');
      return;
    }
    if (!phone.trim()) {
      Alert.alert('Required Field', 'Please enter your contact phone number.');
      return;
    }
    if (!city.trim()) {
      Alert.alert('Required Field', 'Please enter your deployment city.');
      return;
    }
    const qtyNum = parseInt(quantity, 10);
    if (isNaN(qtyNum) || qtyNum < 1) {
      Alert.alert('Invalid Quantity', 'Please enter a valid quantity of at least 1 unit.');
      return;
    }

    setLoading(true);

    try {
      const res = await getClient().createCorporateInquiry({
        companyName: companyName.trim(),
        contactPerson: contactPerson.trim(),
        email: email.trim(),
        phone: phone.trim(),
        city: city.trim(),
        mode,
        quantity: qtyNum,
        laptopModel: laptopModel.trim() || undefined,
        productId: prefill?.productId || undefined,
        expectedTenure: mode === 'lease' ? expectedTenure : undefined,
        notes: notes.trim() || undefined,
        source: 'mobile',
      });

      setSubmittedInquiryId(res.id);
    } catch (err: any) {
      Alert.alert('Submission Error', err?.message || 'Failed to submit quote request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetAndClose = () => {
    setSubmittedInquiryId(null);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleResetAndClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.sheetContainer}>
          {/* Sheet Header */}
          <View style={styles.sheetHeader}>
            <View>
              <Text style={styles.sheetTitle}>Corporate Quote &amp; Lease</Text>
              <Text style={styles.sheetSubtitle}>Bulk fleet pricing &amp; 18% GST invoice</Text>
            </View>
            <TouchableOpacity onPress={handleResetAndClose} style={styles.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {submittedInquiryId ? (
            <View style={styles.successContainer}>
              <View style={styles.successIconBox}>
                <Ionicons name="checkmark" size={32} color={colors.green} />
              </View>
              <Text style={styles.successTitle}>Inquiry Registered!</Text>
              <Text style={styles.successDesc}>
                Thank you, {contactPerson}. Our enterprise team will prepare a formal quote for{' '}
                <Text style={{ fontWeight: '700', color: colors.textPrimary }}>{companyName}</Text> and contact you within 24 hours.
              </Text>

              <View style={styles.refBox}>
                <Text style={styles.refLabel}>INQUIRY REFERENCE ID</Text>
                <Text style={styles.refValue}>{submittedInquiryId}</Text>
              </View>

              <Button title="Done" variant="primary" onPress={handleResetAndClose} style={{ width: '100%', marginTop: 20 }} />
            </View>
          ) : (
            <ScrollView style={styles.formScroll} contentContainerStyle={styles.formScrollContent} keyboardShouldPersistTaps="handled">
              {/* Procurement Mode Segmented Control */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Procurement Model</Text>
                <View style={styles.segmentedRow}>
                  <TouchableOpacity
                    style={[styles.segmentBtn, mode === 'sell' && styles.segmentBtnActive]}
                    onPress={() => setMode('sell')}
                  >
                    <Text style={[styles.segmentText, mode === 'sell' && styles.segmentTextActive]}>
                      Outright Bulk Purchase
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.segmentBtn, mode === 'lease' && styles.segmentBtnActive]}
                    onPress={() => setMode('lease')}
                  >
                    <Text style={[styles.segmentText, mode === 'lease' && styles.segmentTextActive]}>
                      Corporate Monthly Lease
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Company & Contact */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Company Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Acme Technologies Pvt Ltd"
                  placeholderTextColor={colors.textMuted}
                  value={companyName}
                  onChangeText={setCompanyName}
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Contact Person *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Rajesh Kumar"
                  placeholderTextColor={colors.textMuted}
                  value={contactPerson}
                  onChangeText={setContactPerson}
                />
              </View>

              {/* Email & Phone */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Business Email *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="rajesh@acme.com"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Phone Number *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="+91 98765 43210"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={setPhone}
                />
              </View>

              {/* Quantity & City */}
              <View style={styles.rowFields}>
                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Quantity (Units) *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="5"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="number-pad"
                    value={quantity}
                    onChangeText={setQuantity}
                  />
                </View>
                <View style={[styles.fieldGroup, { flex: 1.5 }]}>
                  <Text style={styles.label}>Deployment City *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Bengaluru"
                    placeholderTextColor={colors.textMuted}
                    value={city}
                    onChangeText={setCity}
                  />
                </View>
              </View>

              {/* Laptop Model */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Laptop Model / SKU of Interest</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. ThinkPad T480s / Core i5 16GB"
                  placeholderTextColor={colors.textMuted}
                  value={laptopModel}
                  onChangeText={setLaptopModel}
                />
              </View>

              {/* Lease Tenure if Lease */}
              {mode === 'lease' && (
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Preferred Lease Duration</Text>
                  <View style={styles.tenureRow}>
                    {['6 Months', '12 Months', '24 Months', '36 Months'].map((ten) => (
                      <TouchableOpacity
                        key={ten}
                        style={[styles.tenureChip, expectedTenure === ten && styles.tenureChipActive]}
                        onPress={() => setExpectedTenure(ten)}
                      >
                        <Text style={[styles.tenureChipText, expectedTenure === ten && styles.tenureChipTextActive]}>
                          {ten}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* Notes */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Custom Requirements (Optional)</Text>
                <TextInput
                  style={[styles.input, { height: 70, textAlignVertical: 'top' }]}
                  placeholder="Software imaging, RAM upgrades, delivery schedule..."
                  placeholderTextColor={colors.textMuted}
                  multiline
                  value={notes}
                  onChangeText={setNotes}
                />
              </View>

              {/* Submit CTA */}
              <Button
                title={loading ? 'Submitting Inquiry...' : 'Submit Quote Request'}
                variant="primary"
                onPress={handleSubmit}
                loading={loading}
                style={{ marginTop: 12, marginBottom: 24 }}
              />
            </ScrollView>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(7, 20, 51, 0.65)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: colors.cardBg,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  sheetTitle: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  sheetSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: radius.full,
    backgroundColor: colors.pageBg,
  },
  formScroll: {
    paddingHorizontal: spacing.lg,
  },
  formScrollContent: {
    paddingVertical: spacing.md,
  },
  fieldGroup: {
    marginBottom: spacing.sm,
  },
  rowFields: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  label: {
    ...typography.body,
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    fontSize: 13,
    color: colors.textPrimary,
    backgroundColor: colors.pageBg,
  },
  segmentedRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: colors.pageBg,
  },
  segmentBtnActive: {
    backgroundColor: colors.primary,
  },
  segmentText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  segmentTextActive: {
    color: colors.textWhite,
  },
  tenureRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tenureChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.pageBg,
  },
  tenureChipActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  tenureChipText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tenureChipTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  successContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  successIconBox: {
    width: 60,
    height: 60,
    borderRadius: radius.full,
    backgroundColor: colors.greenLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  successTitle: {
    ...typography.h2,
    color: colors.textPrimary,
    marginBottom: 6,
  },
  successDesc: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  refBox: {
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    width: '100%',
  },
  refLabel: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.5,
  },
  refValue: {
    ...typography.body,
    fontWeight: '800',
    color: colors.navy,
    marginTop: 4,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
});
