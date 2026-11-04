import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useUserLaptops, useBookService, useAddresses, useServiceSettings } from '../../hooks/useApi';
import { MainStackNavigationProp } from '../../navigation/types';
import { colors, radius, spacing } from '../../theme/tokens';

export default function MyLaptopsScreen() {
  const navigation = useNavigation<MainStackNavigationProp>();
  const { data: laptops, isLoading, error, refetch } = useUserLaptops();
  const { data: addresses } = useAddresses();
  const { data: settings } = useServiceSettings();
  const bookServiceMutation = useBookService();

  // Booking Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<any | null>(null);
  const [preferredDate, setPreferredDate] = useState('');
  const [preferredSlot, setPreferredSlot] = useState('MORNING_10_TO_1');
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [notes, setNotes] = useState('');
  const [backupConfirmed, setBackupConfirmed] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleOpenBooking = (unit: any) => {
    setSelectedUnit(unit);
    setErrorMsg('');
    setBackupConfirmed(false);
    setNotes('');

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setPreferredDate(tomorrow.toISOString().split('T')[0] ?? '');

    if (addresses && addresses.length > 0 && addresses[0]?.id) {
      setSelectedAddressId(addresses[0].id);
    }
    setModalOpen(true);
  };

  const handleConfirmBooking = async () => {
    if (!backupConfirmed) {
      setErrorMsg('Please confirm that you have backed up your personal data.');
      return;
    }

    const chosenAddr = (addresses || []).find((a: any) => a.id === selectedAddressId) || addresses?.[0];
    if (!chosenAddr) {
      setErrorMsg('A pickup address is required.');
      return;
    }

    setErrorMsg('');
    try {
      const trimmedNotes = notes.trim();
      const res = await bookServiceMutation.mutateAsync({
        unitId: selectedUnit.id,
        data: {
          preferredDate,
          preferredSlot,
          pickupAddress: {
            fullName: chosenAddr.fullName || '',
            phone: chosenAddr.phone || '',
            address: chosenAddr.address || '',
            city: chosenAddr.city || '',
            state: chosenAddr.state || '',
            pincode: chosenAddr.pincode || '',
          },
          pickupPincode: chosenAddr.pincode || '560001',
          ...(trimmedNotes ? { customerNotes: trimmedNotes } : {}),
          backupAcknowledged: backupConfirmed,
        },
      });

      setModalOpen(false);
      Alert.alert(
        'Service Appointment Confirmed',
        `Your doorstep general service has been scheduled. Reference: ${res?.jobNumber || 'SRV'}`,
        [
          {
            text: 'Track Progress',
            onPress: () => {
              if (res?.id) {
                navigation.navigate('ServiceJobDetail', { jobId: res.id });
              }
            },
          },
          { text: 'OK' },
        ],
      );
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to book service appointment');
    }
  };

  const slotOptions = settings?.slotWindows || [
    { id: 'MORNING_10_TO_1', label: 'Morning (10:00 AM - 1:00 PM)' },
    { id: 'AFTERNOON_2_TO_5', label: 'Afternoon (2:00 PM - 5:00 PM)' },
    { id: 'EVENING_5_TO_8', label: 'Evening (5:00 PM - 8:00 PM)' },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header Info Banner */}
      <View style={styles.banner}>
        <View style={styles.bannerBadge}>
          <Ionicons name="sparkles" size={14} color="#a5b4fc" />
          <Text style={styles.bannerBadgeText}>LaptopMitra Benefit</Text>
        </View>
        <Text style={styles.bannerTitle}>My Laptops & Service</Text>
        <Text style={styles.bannerSubtitle}>
          1 complimentary general service included during your first 6 months from delivery, alongside full hardware warranty coverage.
        </Text>
      </View>

      {/* 4-Point Inspection Checklist Summary */}
      <View style={styles.checklistCard}>
        <View style={styles.checklistHeader}>
          <Ionicons name="construct-outline" size={16} color={colors.primary} />
          <Text style={styles.checklistTitle}>Complimentary 4-Point Service Includes:</Text>
        </View>
        <View style={styles.checklistGrid}>
          <View style={styles.checkItem}>
            <Ionicons name="checkmark-circle" size={16} color="#16a34a" />
            <Text style={styles.checkText}>Internal Cleaning</Text>
          </View>
          <View style={styles.checkItem}>
            <Ionicons name="checkmark-circle" size={16} color="#16a34a" />
            <Text style={styles.checkText}>Thermal Repasting</Text>
          </View>
          <View style={styles.checkItem}>
            <Ionicons name="checkmark-circle" size={16} color="#16a34a" />
            <Text style={styles.checkText}>Hardware Stress Test</Text>
          </View>
          <View style={styles.checkItem}>
            <Ionicons name="checkmark-circle" size={16} color="#16a34a" />
            <Text style={styles.checkText}>Battery Health Check</Text>
          </View>
        </View>
      </View>

      {/* List of Laptops */}
      {isLoading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.loadingText}>Loading registered laptops...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle-outline" size={24} color="#dc2626" />
          <Text style={styles.errorText}>Failed to load laptops</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (laptops || []).length === 0 ? (
        <View style={styles.emptyBox}>
          <Ionicons name="laptop-outline" size={40} color="#94a3b8" />
          <Text style={styles.emptyTitle}>No Laptops Registered Yet</Text>
          <Text style={styles.emptySubtitle}>
            When your laptop orders are delivered, your device chassis serial number, warranty registration, and free service benefit will appear here.
          </Text>
        </View>
      ) : (
        <View style={styles.laptopsList}>
          {(laptops || []).map((unit: any) => {
            const isAvailable = unit.serviceStatus === 'AVAILABLE';
            const isBooked = unit.serviceStatus === 'BOOKED';
            const isUsed = unit.serviceStatus === 'USED';

            return (
              <View key={unit.id} style={styles.laptopCard}>
                <View style={styles.laptopTop}>
                  <View style={styles.laptopIconBox}>
                    <Ionicons name="laptop" size={24} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.laptopBrand}>{unit.brand}</Text>
                    <Text style={styles.laptopName}>{unit.productName}</Text>
                    {unit.serialNumber ? (
                      <View style={styles.serialBox}>
                        <Text style={styles.serialLabel}>Serial:</Text>
                        <Text style={styles.serialText}>{unit.serialNumber}</Text>
                      </View>
                    ) : null}
                  </View>
                </View>

                {/* Benefits Badges Row */}
                <View style={styles.benefitRow}>
                  {/* Warranty Status */}
                  <View style={styles.benefitCard}>
                    <View style={styles.benefitCardHeader}>
                      <Ionicons name="shield-checkmark" size={14} color="#4f46e5" />
                      <Text style={styles.benefitCardTitle}>Warranty</Text>
                    </View>
                    <Text style={styles.benefitStatusText}>
                      {unit.warrantyCoverage?.status || 'Active'}
                    </Text>
                  </View>

                  {/* Free Service Status */}
                  <View style={styles.benefitCard}>
                    <View style={styles.benefitCardHeader}>
                      <Ionicons name="construct" size={14} color="#059669" />
                      <Text style={styles.benefitCardTitle}>Free Service</Text>
                    </View>
                    <Text
                      style={[
                        styles.benefitStatusText,
                        isAvailable && { color: '#059669' },
                        isBooked && { color: '#2563eb' },
                        isUsed && { color: '#64748b' },
                      ]}
                    >
                      {isAvailable ? 'Available' : isBooked ? 'Booked' : isUsed ? 'Completed' : 'Expired'}
                    </Text>
                  </View>
                </View>

                {/* Action CTA */}
                {isAvailable ? (
                  <TouchableOpacity
                    style={styles.bookBtn}
                    onPress={() => handleOpenBooking(unit)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="calendar-outline" size={16} color="#fff" />
                    <Text style={styles.bookBtnText}>Book Free Doorstep Service</Text>
                  </TouchableOpacity>
                ) : unit.activeJob ? (
                  <TouchableOpacity
                    style={styles.trackBtn}
                    onPress={() =>
                      navigation.navigate('ServiceJobDetail', { jobId: unit.activeJob.id })
                    }
                    activeOpacity={0.8}
                  >
                    <Ionicons name="time-outline" size={16} color={colors.primary} />
                    <Text style={styles.trackBtnText}>Track Service #{unit.activeJob.jobNumber}</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            );
          })}
        </View>
      )}

      {/* Booking Modal */}
      <Modal visible={modalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Book Doorstep Service</Text>
              <TouchableOpacity onPress={() => setModalOpen(false)}>
                <Ionicons name="close" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>

            {errorMsg ? (
              <View style={styles.modalError}>
                <Ionicons name="alert-circle" size={16} color="#dc2626" />
                <Text style={styles.modalErrorText}>{errorMsg}</Text>
              </View>
            ) : null}

            <ScrollView style={{ maxHeight: 380 }}>
              {/* Pickup Date */}
              <Text style={styles.fieldLabel}>Preferred Date (YYYY-MM-DD):</Text>
              <TextInput
                style={styles.input}
                value={preferredDate}
                onChangeText={setPreferredDate}
                placeholder="2026-11-20"
              />

              {/* Window Slot */}
              <Text style={styles.fieldLabel}>Pickup Window Slot:</Text>
              <View style={styles.slotRow}>
                {slotOptions.map((opt: any) => (
                  <TouchableOpacity
                    key={opt.id}
                    style={[
                      styles.slotOption,
                      preferredSlot === opt.id && styles.slotOptionSelected,
                    ]}
                    onPress={() => setPreferredSlot(opt.id)}
                  >
                    <Text
                      style={[
                        styles.slotText,
                        preferredSlot === opt.id && styles.slotTextSelected,
                      ]}
                    >
                      {opt.label.split('(')[0].trim()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Customer Observations */}
              <Text style={styles.fieldLabel}>Observations or Notes (Optional):</Text>
              <TextInput
                style={[styles.input, { height: 60 }]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Describe any fan noise, heat, or battery issues noticed..."
                multiline
              />

              {/* Backup Acknowledgement */}
              <TouchableOpacity
                style={styles.backupCheckboxRow}
                onPress={() => setBackupConfirmed(!backupConfirmed)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={backupConfirmed ? 'checkbox' : 'square-outline'}
                  size={20}
                  color={backupConfirmed ? colors.primary : '#94a3b8'}
                />
                <Text style={styles.backupText}>
                  I confirm that I will back up all personal files and documents prior to technician collection.
                </Text>
              </TouchableOpacity>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setModalOpen(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmBtn}
                onPress={handleConfirmBooking}
                disabled={bookServiceMutation.isPending}
              >
                {bookServiceMutation.isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.confirmBtnText}>Schedule Pickup</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: spacing.md, paddingBottom: 40 },
  banner: {
    backgroundColor: '#0f172a',
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  bannerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    marginBottom: 8,
  },
  bannerBadgeText: { color: '#c7d2fe', fontSize: 11, fontWeight: '600' },
  bannerTitle: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 4 },
  bannerSubtitle: { color: '#94a3b8', fontSize: 12, lineHeight: 18 },
  checklistCard: {
    backgroundColor: '#fff',
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: spacing.md,
  },
  checklistHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  checklistTitle: { fontSize: 12, fontWeight: '700', color: '#1e293b' },
  checklistGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    width: '48%',
    paddingVertical: 2,
  },
  checkText: { fontSize: 11, color: '#475569', fontWeight: '500' },
  loadingBox: { padding: 40, alignItems: 'center', gap: 8 },
  loadingText: { fontSize: 12, color: '#64748b' },
  errorBox: { padding: 30, alignItems: 'center', gap: 8 },
  errorText: { fontSize: 12, color: '#dc2626', fontWeight: '600' },
  retryBtn: { paddingHorizontal: 16, paddingVertical: 6, backgroundColor: '#e2e8f0', borderRadius: radius.md },
  retryBtnText: { fontSize: 12, fontWeight: '600', color: '#334155' },
  emptyBox: { backgroundColor: '#fff', padding: 30, borderRadius: radius.lg, alignItems: 'center', gap: 8 },
  emptyTitle: { fontSize: 14, fontWeight: '700', color: '#1e293b' },
  emptySubtitle: { fontSize: 12, color: '#64748b', textAlign: 'center', lineHeight: 18 },
  laptopsList: { gap: spacing.md },
  laptopCard: {
    backgroundColor: '#fff',
    borderRadius: radius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: spacing.md,
  },
  laptopTop: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  laptopIconBox: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: 'rgba(37, 99, 235, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  laptopBrand: { fontSize: 10, fontWeight: '700', color: colors.primary, textTransform: 'uppercase' },
  laptopName: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  serialBox: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  serialLabel: { fontSize: 11, color: '#64748b' },
  serialText: { fontSize: 11, fontFamily: 'monospace', fontWeight: '700', color: '#0f172a' },
  benefitRow: { flexDirection: 'row', gap: 8 },
  benefitCard: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: radius.md,
    padding: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  benefitCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 },
  benefitCardTitle: { fontSize: 11, fontWeight: '600', color: '#334155' },
  benefitStatusText: { fontSize: 12, fontWeight: '700', color: '#0f172a' },
  bookBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  bookBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  trackBtn: {
    backgroundColor: '#f1f5f9',
    borderRadius: radius.lg,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  trackBtnText: { color: colors.primary, fontSize: 12, fontWeight: '700' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    gap: 12,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  modalError: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    padding: 8,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  modalErrorText: { fontSize: 11, color: '#dc2626', flex: 1 },
  fieldLabel: { fontSize: 11, fontWeight: '600', color: '#334155', marginTop: 4 },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: radius.md,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12,
    marginTop: 2,
  },
  slotRow: { flexDirection: 'row', gap: 6, marginTop: 4 },
  slotOption: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: radius.md,
    paddingVertical: 6,
    alignItems: 'center',
  },
  slotOptionSelected: { borderColor: colors.primary, backgroundColor: 'rgba(37,99,235,0.08)' },
  slotText: { fontSize: 11, color: '#475569' },
  slotTextSelected: { color: colors.primary, fontWeight: '700' },
  backupCheckboxRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginTop: 10 },
  backupText: { fontSize: 11, color: '#475569', flex: 1, lineHeight: 16 },
  modalActions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  cancelBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: radius.md, backgroundColor: '#f1f5f9' },
  cancelBtnText: { fontSize: 12, fontWeight: '600', color: '#475569' },
  confirmBtn: { flex: 2, paddingVertical: 10, alignItems: 'center', borderRadius: radius.md, backgroundColor: colors.primary },
  confirmBtnText: { fontSize: 12, fontWeight: '700', color: '#fff' },
});

