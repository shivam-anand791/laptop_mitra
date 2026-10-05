import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Switch } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useAddresses, useCreateAddress, useUpdateAddress } from '../../hooks/useApi';
import { MainStackParamList, MainStackNavigationProp } from '../../navigation/types';

type AddAddressRouteProp = RouteProp<MainStackParamList, 'AddAddress'>;

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Delhi', 'Jammu & Kashmir', 'Ladakh'
];

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

export default function AddAddressScreen() {
  const navigation = useNavigation<MainStackNavigationProp>();
  const route = useRoute<AddAddressRouteProp>();
  const addressId = route.params?.addressId;

  const { data: addresses } = useAddresses();
  const createAddress = useCreateAddress();
  const updateAddress = useUpdateAddress();

  const [label, setLabel] = useState<'HOME' | 'WORK' | 'OTHER'>('HOME');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('Delhi');
  const [pincode, setPincode] = useState('');
  const [landmark, setLandmark] = useState('');
  const [gstin, setGstin] = useState('');
  const [isDefault, setIsDefault] = useState(false);

  const isEditing = !!addressId;

  useEffect(() => {
    if (isEditing && addresses) {
      const existing = addresses.find((a) => a.id === addressId);
      if (existing) {
        setLabel((existing.label as any) || 'HOME');
        setFullName(existing.fullName || '');
        setPhone(existing.phone || '');
        setAddress(existing.address || '');
        setCity(existing.city || '');
        setState(existing.state || 'Delhi');
        setPincode(existing.pincode || '');
        setLandmark(existing.landmark || '');
        setGstin(existing.gstin || '');
        setIsDefault(existing.isDefault);
      }
    }
  }, [addressId, addresses, isEditing]);

  const handleSave = () => {
    if (!fullName.trim()) {
      Alert.alert('Validation Error', 'Full name is required');
      return;
    }
    if (!address.trim()) {
      Alert.alert('Validation Error', 'Street address is required');
      return;
    }
    if (!city.trim()) {
      Alert.alert('Validation Error', 'City is required');
      return;
    }
    if (!state.trim()) {
      Alert.alert('Validation Error', 'State is required');
      return;
    }
    const cleanPin = pincode.trim();
    if (!/^\d{6}$/.test(cleanPin)) {
      Alert.alert('Validation Error', 'Please enter a valid 6-digit Indian PIN code');
      return;
    }
    const cleanGst = gstin.trim().toUpperCase();
    if (cleanGst && !GSTIN_REGEX.test(cleanGst)) {
      Alert.alert('Validation Error', 'Invalid GSTIN format (e.g. 07AAAAA0000A1Z5)');
      return;
    }

    const payload = {
      label,
      fullName: fullName.trim(),
      phone: phone.trim() || undefined,
      address: address.trim(),
      city: city.trim(),
      state: state.trim(),
      pincode: cleanPin,
      landmark: landmark.trim() || undefined,
      gstin: cleanGst || undefined,
      isDefault,
    };

    if (isEditing) {
      updateAddress.mutate(
        { id: addressId, data: payload },
        {
          onSuccess: () => navigation.goBack(),
          onError: (err) => Alert.alert('Error', err.message),
        },
      );
    } else {
      createAddress.mutate(payload, {
        onSuccess: () => navigation.goBack(),
        onError: (err) => Alert.alert('Error', err.message),
      });
    }
  };

  const isPending = createAddress.isPending || updateAddress.isPending;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Address Label Selector */}
        <Text style={styles.label}>Address Type</Text>
        <View style={styles.labelRow}>
          {(['HOME', 'WORK', 'OTHER'] as const).map((l) => (
            <TouchableOpacity
              key={l}
              style={[styles.labelChip, label === l && styles.labelChipActive]}
              onPress={() => setLabel(l)}
            >
              <Text style={[styles.labelChipText, label === l && styles.labelChipTextActive]}>
                {l}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Full Name *</Text>
        <TextInput
          style={styles.input}
          value={fullName}
          onChangeText={setFullName}
          placeholder="Contact person name"
          autoCapitalize="words"
        />

        <Text style={styles.label}>Phone Number</Text>
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={setPhone}
          placeholder="10-digit mobile number"
          keyboardType="phone-pad"
          maxLength={10}
        />

        <Text style={styles.label}>Street Address & House No *</Text>
        <TextInput
          style={[styles.input, styles.inputMultiline]}
          value={address}
          onChangeText={setAddress}
          placeholder="Flat / Building, Road, Area"
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />

        <Text style={styles.label}>PIN Code * (6 Digits)</Text>
        <TextInput
          style={styles.input}
          value={pincode}
          onChangeText={setPincode}
          placeholder="e.g. 110001"
          keyboardType="numeric"
          maxLength={6}
        />

        <Text style={styles.label}>City *</Text>
        <TextInput
          style={styles.input}
          value={city}
          onChangeText={setCity}
          placeholder="e.g. New Delhi"
          autoCapitalize="words"
        />

        <Text style={styles.label}>State *</Text>
        <TextInput
          style={styles.input}
          value={state}
          onChangeText={setState}
          placeholder="e.g. Delhi, Maharashtra, Karnataka"
          autoCapitalize="words"
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.stateRow}>
          {INDIAN_STATES.slice(0, 10).map((st) => (
            <TouchableOpacity
              key={st}
              style={[styles.stateChip, state === st && styles.stateChipActive]}
              onPress={() => setState(st)}
            >
              <Text style={[styles.stateChipText, state === st && styles.stateChipTextActive]}>{st}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={styles.label}>Landmark (Optional)</Text>
        <TextInput
          style={styles.input}
          value={landmark}
          onChangeText={setLandmark}
          placeholder="Nearby landmark (e.g. Opposite Metro Gate 2)"
        />

        <Text style={styles.label}>GSTIN for Business Invoicing (Optional)</Text>
        <TextInput
          style={styles.input}
          value={gstin}
          onChangeText={(v) => setGstin(v.toUpperCase())}
          placeholder="15-digit GSTIN (e.g. 07AAAAA0000A1Z5)"
          autoCapitalize="characters"
          maxLength={15}
        />

        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Set as default delivery address</Text>
          <Switch
            value={isDefault}
            onValueChange={setIsDefault}
            trackColor={{ false: '#e2e8f0', true: '#93c5fd' }}
            thumbColor={isDefault ? '#2563eb' : '#f4f3f4'}
          />
        </View>

        <TouchableOpacity
          style={[styles.saveButton, isPending && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={isPending}
          activeOpacity={0.8}
        >
          {isPending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>{isEditing ? 'Update Address' : 'Save Address'}</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 6,
    marginTop: 14,
  },
  labelRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 6,
  },
  labelChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  labelChipActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#2563eb',
  },
  labelChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  labelChipTextActive: {
    color: '#2563eb',
  },
  stateRow: {
    flexDirection: 'row',
    marginTop: 8,
    marginBottom: 4,
  },
  stateChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#f1f5f9',
    marginRight: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  stateChipActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#2563eb',
  },
  stateChipText: {
    fontSize: 12,
    color: '#64748b',
  },
  stateChipTextActive: {
    color: '#2563eb',
    fontWeight: '600',
  },
  input: {
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 16,
    fontSize: 15,
    color: '#1e293b',
    backgroundColor: '#f8fafc',
  },
  inputMultiline: {
    height: 80,
    paddingTop: 14,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    paddingVertical: 8,
  },
  toggleLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1e293b',
  },
  saveButton: {
    width: '100%',
    height: 50,
    borderRadius: 12,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  saveButtonDisabled: {
    backgroundColor: '#93c5fd',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});
