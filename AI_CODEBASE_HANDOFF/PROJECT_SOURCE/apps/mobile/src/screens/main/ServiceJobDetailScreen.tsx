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
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useServiceJob, useRescheduleService, useCancelService, useServiceSettings } from '../../hooks/useApi';
import { colors, radius, spacing } from '../../theme/tokens';

const LIFECYCLE_STEPS = [
  { id: 'REQUESTED', label: 'Booked' },
  { id: 'SCHEDULED', label: 'Scheduled' },
  { id: 'IN_SERVICE', label: 'In Service' },
  { id: 'QUALITY_CHECK', label: 'Quality' },
  { id: 'COMPLETED', label: 'Completed' },
];

function getStepIndex(status: string): number {
  switch (status) {
    case 'REQUESTED':
      return 0;
    case 'SCHEDULED':
    case 'RESCHEDULED':
      return 1;
    case 'PICKED_UP':
    case 'IN_SERVICE':
      return 2;
    case 'QUALITY_CHECK':
    case 'READY_FOR_DROP':
      return 3;
    case 'COMPLETED':
      return 4;
    default:
      return 0;
  }
}

export default function ServiceJobDetailScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation();
  const jobId = route.params?.jobId || '';

  const { data: job, isLoading, error, refetch } = useServiceJob(jobId);
  const { data: settings } = useServiceSettings();
  const rescheduleMutation = useRescheduleService();
  const cancelMutation = useCancelService();

  // Reschedule Modal
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [newDate, setNewDate] = useState('');
  const [newSlot, setNewSlot] = useState('MORNING_10_TO_1');
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [rescheduleErr, setRescheduleErr] = useState('');

  // Cancel Modal
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelErr, setCancelErr] = useState('');

  const handleOpenReschedule = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setNewDate(tomorrow.toISOString().split('T')[0] ?? '');
    setNewSlot(job?.preferredSlot || 'MORNING_10_TO_1');
    setRescheduleReason('');
    setRescheduleErr('');
    setRescheduleOpen(true);
  };

  const handleConfirmReschedule = async () => {
    if (!newDate) {
      setRescheduleErr('Please select a valid date.');
      return;
    }
    setRescheduleErr('');
    try {
      const trimmedReason = rescheduleReason.trim();
      await rescheduleMutation.mutateAsync({
        id: jobId,
        data: {
          preferredDate: newDate,
          preferredSlot: newSlot,
          ...(trimmedReason ? { reason: trimmedReason } : {}),
        },
      });
      setRescheduleOpen(false);
      refetch();
    } catch (err: any) {
      setRescheduleErr(err?.message || 'Failed to reschedule');
    }
  };

  const handleConfirmCancel = async () => {
    if (!cancelReason.trim()) {
      setCancelErr('Cancellation reason is required.');
      return;
    }
    setCancelErr('');
    try {
      await cancelMutation.mutateAsync({
        id: jobId,
        data: {
          reason: cancelReason.trim(),
        },
      });
      setCancelOpen(false);
      refetch();
      Alert.alert(
        'Booking Cancelled',
        'Your appointment was cancelled and your free service benefit has been restored.',
      );
    } catch (err: any) {
      setCancelErr(err?.message || 'Failed to cancel appointment');
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centerBox}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={styles.centerText}>Loading service tracking...</Text>
      </View>
    );
  }

  if (error || !job) {
    return (
      <View style={styles.centerBox}>
        <Ionicons name="alert-circle-outline" size={32} color="#dc2626" />
        <Text style={styles.errorTitle}>Service Job Not Found</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isCancellable = ['REQUESTED', 'SCHEDULED', 'RESCHEDULED'].includes(job.status);
  const currentStep = getStepIndex(job.status);
  const isCancelled = job.status === 'CANCELLED' || job.status === 'REJECTED';

  const slotOptions = settings?.slotWindows || [
    { id: 'MORNING_10_TO_1', label: 'Morning (10:00 AM - 1:00 PM)' },
    { id: 'AFTERNOON_2_TO_5', label: 'Afternoon (2:00 PM - 5:00 PM)' },
    { id: 'EVENING_5_TO_8', label: 'Evening (5:00 PM - 8:00 PM)' },
  ];

  const address = typeof job.pickupAddress === 'object' && job.pickupAddress ? job.pickupAddress : {};

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header Info Card */}
      <View style={styles.headerCard}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.jobLabel}>SERVICE REFERENCE</Text>
            <Text style={styles.jobNumber}>{job.jobNumber}</Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              job.status === 'COMPLETED' && { backgroundColor: '#dcfce7' },
              isCancelled && { backgroundColor: '#fee2e2' },
            ]}
          >
            <Text
              style={[
                styles.statusBadgeText,
                job.status === 'COMPLETED' && { color: '#15803d' },
                isCancelled && { color: '#b91c1c' },
              ]}
            >
              {job.status.replace(/_/g, ' ')}
            </Text>
          </View>
        </View>

        <Text style={styles.deviceText}>
          {job.soldUnit?.product?.name || job.soldUnit?.modelSnapshot || 'Laptop'}
        </Text>
        <Text style={styles.serialText}>
          Serial: {job.soldUnit?.serialNumber || 'N/A'}
        </Text>
      </View>

      {/* Stepper (if not cancelled) */}
      {!isCancelled ? (
        <View style={styles.stepperCard}>
          <View style={styles.stepperRow}>
            {LIFECYCLE_STEPS.map((s, idx) => {
              const isPast = idx < currentStep;
              const isCurrent = idx === currentStep;

              return (
                <View key={s.id} style={styles.stepItem}>
                  <View
                    style={[
                      styles.stepDot,
                      isPast && { backgroundColor: '#16a34a' },
                      isCurrent && { backgroundColor: colors.primary },
                    ]}
                  >
                    {isPast ? (
                      <Ionicons name="checkmark" size={14} color="#fff" />
                    ) : (
                      <Text style={styles.stepNumber}>{idx + 1}</Text>
                    )}
                  </View>
                  <Text
                    style={[
                      styles.stepLabel,
                      isCurrent && { color: colors.primary, fontWeight: '700' },
                      isPast && { color: '#0f172a' },
                    ]}
                  >
                    {s.label}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      ) : (
        <View style={styles.cancelledBox}>
          <Ionicons name="close-circle" size={20} color="#dc2626" />
          <View style={{ flex: 1 }}>
            <Text style={styles.cancelledTitle}>Appointment Cancelled</Text>
            <Text style={styles.cancelledDesc}>
              {job.cancellationReason || 'Cancelled by customer.'} Free service entitlement has been restored.
            </Text>
          </View>
        </View>
      )}

      {/* 4-Point Checklist Status */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Ionicons name="construct-outline" size={16} color={colors.primary} />
          <Text style={styles.sectionTitle}>Inspection Checklist (4 Points)</Text>
        </View>

        <View style={styles.checklistGrid}>
          {[
            { title: '1. Internal Cleaning', done: job.checklistCleaning },
            { title: '2. Thermal Repasting', done: job.checklistThermalPaste },
            { title: '3. Stress Diagnostics', done: job.checklistSoftware },
            { title: '4. Battery Health', done: job.checklistBattery },
          ].map((item, idx) => (
            <View key={idx} style={[styles.checkRow, item.done && styles.checkRowDone]}>
              <Ionicons
                name={item.done ? 'checkmark-circle' : 'time-outline'}
                size={16}
                color={item.done ? '#16a34a' : '#94a3b8'}
              />
              <Text style={[styles.checkLabel, item.done && { fontWeight: '700', color: '#0f172a' }]}>
                {item.title}
              </Text>
              <Text style={[styles.checkStatus, item.done && { color: '#16a34a' }]}>
                {item.done ? 'Done' : 'Pending'}
              </Text>
            </View>
          ))}
        </View>

        {job.batteryHealthPercent !== null && job.batteryHealthPercent !== undefined && (
          <View style={styles.batteryBox}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="battery-charging" size={18} color="#16a34a" />
              <Text style={styles.batteryLabel}>Certified Battery Health:</Text>
            </View>
            <Text style={styles.batteryPercent}>{job.batteryHealthPercent}%</Text>
          </View>
        )}
      </View>

      {/* Pickup Details */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Ionicons name="location-outline" size={16} color={colors.primary} />
          <Text style={styles.sectionTitle}>Doorstep Pickup Details</Text>
        </View>
        <Text style={styles.addrName}>{address.fullName || job.customer?.name}</Text>
        <Text style={styles.addrText}>{address.address}</Text>
        <Text style={styles.addrText}>
          {[address.city, address.state, address.pincode || job.pickupPincode].filter(Boolean).join(', ')}
        </Text>
        <Text style={styles.addrPhone}>Contact: {address.phone || job.customer?.phone || '—'}</Text>
      </View>

      {/* Action Buttons */}
      {isCancellable ? (
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.actionResched}
            onPress={handleOpenReschedule}
          >
            <Ionicons name="calendar-outline" size={16} color={colors.primary} />
            <Text style={styles.actionReschedText}>Reschedule</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionCancel}
            onPress={() => setCancelOpen(true)}
          >
            <Text style={styles.actionCancelText}>Cancel Appointment</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Reschedule Modal */}
      <Modal visible={rescheduleOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalHeading}>Reschedule Appointment</Text>
            {rescheduleErr ? <Text style={styles.modalErr}>{rescheduleErr}</Text> : null}

            <Text style={styles.inputLabel}>New Preferred Date (YYYY-MM-DD):</Text>
            <TextInput
              style={styles.modalInput}
              value={newDate}
              onChangeText={setNewDate}
              placeholder="2026-11-25"
            />

            <Text style={styles.inputLabel}>Pickup Window Slot:</Text>
            <View style={styles.slotRow}>
              {slotOptions.map((opt: any) => (
                <TouchableOpacity
                  key={opt.id}
                  style={[
                    styles.slotOption,
                    newSlot === opt.id && styles.slotOptionSelected,
                  ]}
                  onPress={() => setNewSlot(opt.id)}
                >
                  <Text
                    style={[
                      styles.slotText,
                      newSlot === opt.id && styles.slotTextSelected,
                    ]}
                  >
                    {opt.label.split('(')[0].trim()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Reason (Optional):</Text>
            <TextInput
              style={styles.modalInput}
              value={rescheduleReason}
              onChangeText={setRescheduleReason}
              placeholder="Reason for reschedule..."
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalBtnCancel}
                onPress={() => setRescheduleOpen(false)}
              >
                <Text style={styles.modalBtnCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalBtnConfirm}
                onPress={handleConfirmReschedule}
                disabled={rescheduleMutation.isPending}
              >
                <Text style={styles.modalBtnConfirmText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Cancel Modal */}
      <Modal visible={cancelOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalHeading}>Cancel Appointment</Text>
            {cancelErr ? <Text style={styles.modalErr}>{cancelErr}</Text> : null}

            <Text style={styles.inputLabel}>Reason for Cancellation:</Text>
            <TextInput
              style={[styles.modalInput, { height: 60 }]}
              value={cancelReason}
              onChangeText={setCancelReason}
              placeholder="Explain why you need to cancel..."
              multiline
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalBtnCancel}
                onPress={() => setCancelOpen(false)}
              >
                <Text style={styles.modalBtnCancelText}>Keep</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtnConfirm, { backgroundColor: '#dc2626' }]}
                onPress={handleConfirmCancel}
                disabled={cancelMutation.isPending}
              >
                <Text style={styles.modalBtnConfirmText}>Confirm Cancel</Text>
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
  content: { padding: spacing.md, paddingBottom: 40, gap: spacing.md },
  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 8 },
  centerText: { fontSize: 12, color: '#64748b' },
  errorTitle: { fontSize: 14, fontWeight: '700', color: '#1e293b', marginTop: 8 },
  backBtn: { marginTop: 12, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#e2e8f0', borderRadius: radius.md },
  backBtnText: { fontSize: 12, fontWeight: '600', color: '#334155' },
  headerCard: {
    backgroundColor: '#fff',
    borderRadius: radius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 4,
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  jobLabel: { fontSize: 10, fontWeight: '700', color: '#64748b' },
  jobNumber: { fontSize: 16, fontWeight: '800', fontFamily: 'monospace', color: colors.primary },
  statusBadge: { backgroundColor: '#dbeafe', paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full },
  statusBadgeText: { fontSize: 11, fontWeight: '700', color: '#1d4ed8', textTransform: 'uppercase' },
  deviceText: { fontSize: 13, fontWeight: '700', color: '#0f172a', marginTop: 4 },
  serialText: { fontSize: 11, fontFamily: 'monospace', color: '#64748b' },
  stepperCard: { backgroundColor: '#fff', borderRadius: radius.xl, padding: spacing.md, borderWidth: 1, borderColor: '#e2e8f0' },
  stepperRow: { flexDirection: 'row', justifyContent: 'space-between' },
  stepItem: { alignItems: 'center', gap: 4, width: '18%' },
  stepDot: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center' },
  stepNumber: { fontSize: 10, fontWeight: '700', color: '#64748b' },
  stepLabel: { fontSize: 10, color: '#64748b', textAlign: 'center' },
  cancelledBox: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    borderRadius: radius.lg,
    padding: spacing.md,
    flexDirection: 'row',
    gap: 8,
  },
  cancelledTitle: { fontSize: 12, fontWeight: '700', color: '#991b1b' },
  cancelledDesc: { fontSize: 11, color: '#b91c1c', marginTop: 2, lineHeight: 16 },
  sectionCard: { backgroundColor: '#fff', borderRadius: radius.xl, padding: spacing.md, borderWidth: 1, borderColor: '#e2e8f0', gap: 8 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: '#1e293b', textTransform: 'uppercase' },
  checklistGrid: { gap: 6 },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 8,
    borderRadius: radius.md,
    backgroundColor: '#f8fafc',
  },
  checkRowDone: { backgroundColor: '#f0fdf4' },
  checkLabel: { fontSize: 11, color: '#475569', flex: 1 },
  checkStatus: { fontSize: 10, fontWeight: '700', color: '#94a3b8' },
  batteryBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    padding: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    marginTop: 6,
  },
  batteryLabel: { fontSize: 12, fontWeight: '600', color: '#166534' },
  batteryPercent: { fontSize: 14, fontWeight: '800', fontFamily: 'monospace', color: '#16a34a' },
  addrName: { fontSize: 12, fontWeight: '700', color: '#0f172a' },
  addrText: { fontSize: 11, color: '#475569' },
  addrPhone: { fontSize: 11, color: '#64748b', marginTop: 4 },
  actionsRow: { flexDirection: 'row', gap: 8 },
  actionResched: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    borderRadius: radius.lg,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  actionReschedText: { fontSize: 12, fontWeight: '700', color: colors.primary },
  actionCancel: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#fca5a5',
    borderRadius: radius.lg,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionCancelText: { fontSize: 12, fontWeight: '700', color: '#dc2626' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#fff', borderRadius: radius.xl, padding: spacing.lg, gap: 10 },
  modalHeading: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  modalErr: { fontSize: 11, color: '#dc2626' },
  inputLabel: { fontSize: 11, fontWeight: '600', color: '#334155' },
  modalInput: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: radius.md, padding: 8, fontSize: 12 },
  modalBtnRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  modalBtnCancel: { flex: 1, paddingVertical: 10, alignItems: 'center', backgroundColor: '#f1f5f9', borderRadius: radius.md },
  modalBtnCancelText: { fontSize: 12, fontWeight: '600', color: '#475569' },
  modalBtnConfirm: { flex: 1, paddingVertical: 10, alignItems: 'center', backgroundColor: colors.primary, borderRadius: radius.md },
  modalBtnConfirmText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  slotRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  slotOption: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: radius.md,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  slotOptionSelected: {
    backgroundColor: '#e0e7ff',
    borderColor: colors.primary,
  },
  slotText: { fontSize: 11, color: '#475569' },
  slotTextSelected: { color: colors.primary, fontWeight: '700' },
});

