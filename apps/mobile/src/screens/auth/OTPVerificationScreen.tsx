import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AuthStackParamList } from '../../navigation/types';

/**
 * OTP Verification Screen
 *
 * NOTE: The current API uses email/password authentication only (JWT).
 * No OTP flow is implemented in the backend. This screen is kept as a
 * stretch goal for future enhancement (e.g., if 2FA or phone-based auth is added).
 *
 * To use: Add OTP endpoints to API, then implement verification logic here.
 */
const otpSchema = z.object({
  otp: z.string().length(6, 'OTP must be 6 digits'),
});

type OTPFormData = z.infer<typeof otpSchema>;

type OTPVerificationRouteProp = RouteProp<AuthStackParamList, 'OTPVerification'>;

export default function OTPVerificationScreen() {
  const route = useRoute<OTPVerificationRouteProp>();
  const navigation = useNavigation();
  const { email, mode } = route.params;

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<OTPFormData>({
    resolver: zodResolver(otpSchema),
    defaultValues: {
      otp: '',
    },
  });

  const onSubmit = async () => {
    // TODO: Implement when API adds OTP endpoints
    Alert.alert(
      'Not Implemented',
      'OTP verification is not yet supported by the API. This is a placeholder for future 2FA/phone auth.',
      [{ text: 'OK' }]
    );
  };

  const resendOTP = () => {
    Alert.alert('Not Implemented', 'Resend OTP will be available when API supports it.');
  };

  const goBack = () => navigation.goBack();

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={goBack} style={styles.backButton}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.logo}>LaptopMitra</Text>
          <Text style={styles.subtitle}>Verify your identity</Text>
        </View>

        <View style={styles.formContainer}>
          <View style={styles.description}>
            <Text style={styles.descText}>
              We&apos;ve sent a 6-digit code to <Text style={styles.emailText}>{email}</Text>
            </Text>
            <Text style={styles.modeText}>Mode: {mode}</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Enter OTP</Text>
            <TextInput
              style={[styles.input, styles.otpInput]}
              placeholder="123456"
              autoCapitalize="none"
              autoCompleteType="one-time-code"
              keyboardType="numeric"
              maxLength={6}
              returnKeyType="go"
              {...(control as any)}
            />
            {errors.otp && <Text style={styles.errorText}>{errors.otp.message}</Text>}
          </View>

          <TouchableOpacity style={styles.button} onPress={handleSubmit(onSubmit)} activeOpacity={0.8}>
            <Text style={styles.buttonText}>Verify</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={resendOTP} style={styles.resendContainer}>
            <Text style={styles.resendText}>Didn&apos;t receive the code? </Text>
            <Text style={styles.resendLink}>Resend OTP</Text>
          </TouchableOpacity>

          <View style={styles.note}>
            <Text style={styles.noteText}>
              ⚠ This is a placeholder. The current API uses email/password authentication only.
              OTP flow will be implemented when backend support is added.
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 40,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 16,
    paddingVertical: 8,
  },
  backText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  logo: {
    fontSize: 32,
    fontWeight: '800',
    color: '#2563eb',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    marginTop: 4,
  },
  formContainer: {
    width: '100%',
    gap: 20,
  },
  description: {
    alignItems: 'center',
    marginBottom: 8,
  },
  descText: {
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 22,
  },
  emailText: {
    fontWeight: '600',
    color: '#1e293b',
  },
  modeText: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#1e293b',
    backgroundColor: '#fff',
    textAlign: 'center',
  },
  otpInput: {
    letterSpacing: 8,
    fontSize: 24,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    textAlign: 'center',
  },
  button: {
    height: 52,
    borderRadius: 10,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    gap: 4,
  },
  resendText: {
    fontSize: 14,
    color: '#64748b',
  },
  resendLink: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563eb',
  },
  note: {
    marginTop: 24,
    padding: 12,
    backgroundColor: '#fef3c7',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fcd34d',
  },
  noteText: {
    fontSize: 12,
    color: '#92400e',
    textAlign: 'center',
    lineHeight: 18,
  },
});