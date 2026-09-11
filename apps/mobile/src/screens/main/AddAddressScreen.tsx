import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Switch } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useAddresses, useCreateAddress, useUpdateAddress } from '../../hooks/useApi';
import { MainStackParamList, MainStackNavigationProp } from '../../navigation/types';

type AddAddressRouteProp = RouteProp<MainStackParamList, 'AddAddress'>;

export default function AddAddressScreen() {
  const navigation = useNavigation<MainStackNavigationProp>();
  const route = useRoute<AddAddressRouteProp>();
  const addressId = route.params?.addressId;

  const { data: addresses } = useAddresses();
  const createAddress = useCreateAddress();
  const updateAddress = useUpdateAddress();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [landmark, setLandmark] = useState('');
  const [isDefault, setIsDefault] = useState(false);

  const isEditing = !!addressId;

  useEffect(() => {
    if (isEditing && addresses) {
      const existing = addresses.find((a) => a.id === addressId);
      if (existing) {
        setFullName(existing.fullName || '');
        setPhone(existing.phone || '');
        setAddress(existing.address || '');
        setCity(existing.city || '');
        setState(existing.state || '');
        setPincode(existing.pincode || '');
        setLandmark(existing.landmark || '');
        setIsDefault(existing.isDefault);
      }
    }
  }, [addressId, addresses, isEditing]);

  const handleSave = () => {
    if (!fullName.trim()) {
      Alert.alert('Error', 'Full name is required');
      return;
    }
    if (!address.trim()) {
      Alert.alert('Error', 'Address is required');
      return;
    }
    if (!city.trim()) {
      Alert.alert('Error', 'City is required');
      return;
    }
    if (!state.trim()) {
      Alert.alert('Error', 'State is required');
      return;
    }
    if (!pincode.trim()) {
      Alert.alert('Error', 'Pincode is required');
      return;
    }

    const payload = {
      fullName: fullName.trim(),
      phone: phone.trim() || undefined,
      address: address.trim(),
      city: city.trim(),
      state: state.trim(),
      pincode: pincode.trim(),
      landmark: landmark.trim() || undefined,
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
        <Text style={styles.label}>Full Name *</Text>
        <TextInput
          style={styles.input}
          value={fullName}
          onChangeText={setFullName}
          placeholder="Enter full name"
          autoCapitalize="words"
        />

        <Text style={styles.label}>Phone</Text>
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={setPhone}
          placeholder="Phone number"
          keyboardType="phone-pad"
        />

        <Text style={styles.label}>Address *</Text>
        <TextInput
          style={[styles.input, styles.inputMultiline]}
          value={address}
          onChangeText={setAddress}
          placeholder="Street address, building, etc."
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />

        <Text style={styles.label}>City *</Text>
        <TextInput
          style={styles.input}
          value={city}
          onChangeText={setCity}
          placeholder="City"
          autoCapitalize="words"
        />

        <Text style={styles.label}>State *</Text>
        <TextInput
          style={styles.input}
          value={state}
          onChangeText={setState}
          placeholder="State"
          autoCapitalize="words"
        />

        <Text style={styles.label}>Pincode *</Text>
        <TextInput
          style={styles.input}
          value={pincode}
          onChangeText={setPincode}
          placeholder="Pincode"
          keyboardType="numeric"
          maxLength={6}
        />

        <Text style={styles.label}>Landmark</Text>
        <TextInput
          style={styles.input}
          value={landmark}
          onChangeText={setLandmark}
          placeholder="Nearby landmark (optional)"
        />

        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Set as default address</Text>
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
  input: {
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 16,
    fontSize: 16,
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
