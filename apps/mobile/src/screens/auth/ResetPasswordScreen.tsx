import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useResetPassword } from '../../hooks/useApi';
import { AuthStackParamList } from '../../navigation/types';

const resetPasswordSchema = z.object({
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password too long')
    .regex(/[a-z]/, 'Password must contain a lowercase letter')
    .regex(/[A-Z]/, 'Password must contain an uppercase letter')
    .regex(/[0-9]/, 'Password must contain a number')
    .regex(/[@$!%*?&]/, 'Password must contain a special character (@$!%*?&)'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

type ResetPasswordRouteProp = RouteProp<AuthStackParamList, 'ResetPassword'>;

export default function ResetPasswordScreen() {
  const route = useRoute<ResetPasswordRouteProp>();
  const { token } = route.params;
  const { mutate: apiResetPassword, isPending, isSuccess } = useResetPassword();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      newPassword: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data: ResetPasswordFormData) => {
    apiResetPassword({ token, newPassword: data.newPassword }, {
      onSuccess: () => {
        Alert.alert(
          'Password Reset Successful',
          'Your password has been updated. You can now login with your new password.',
          [
            { text: 'Go to Login', onPress: () => { /* navigation handled by parent */ } },
          ],
          { cancelable: false }
        );
      },
      onError: (err: Error) => {
        Alert.alert('Error', err.message || 'Failed to reset password. The link may have expired.');
      },
    });
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.logo}>LaptopMitra</Text>
          <Text style={styles.subtitle}>Set new password</Text>
        </View>

        <View style={styles.formContainer}>
          <View style={styles.description}>
            <Text style={styles.descText}>
              Enter your new password below. Make sure it&apos;s different from your previous password.
            </Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>New Password</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              secureTextEntry
              autoCompleteType="new-password"
              returnKeyType="next"
              {...(control as any)}
            />
            {errors.newPassword && <Text style={styles.errorText}>{errors.newPassword.message}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Confirm New Password</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              secureTextEntry
              autoCompleteType="new-password"
              returnKeyType="go"
              {...(control as any)}
            />
            {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword.message}</Text>}
          </View>

          <View style={styles.passwordHint}>
            <Text style={styles.hintText}>• At least 8 characters</Text>
            <Text style={styles.hintText}>• One uppercase letter</Text>
            <Text style={styles.hintText}>• One lowercase letter</Text>
            <Text style={styles.hintText}>• One number</Text>
            <Text style={styles.hintText}>• One special character (@$!%*?&)</Text>
          </View>

          <TouchableOpacity
            style={[styles.button, isPending && styles.buttonDisabled]}
            onPress={handleSubmit(onSubmit)}
            disabled={isPending}
            activeOpacity={0.8}
          >
            {isPending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.buttonText}>Reset Password</Text>
            )}
          </TouchableOpacity>

          {isSuccess && (
            <View style={styles.successMessage}>
              <Text style={styles.successText}>Password updated! Redirecting to login...</Text>
            </View>
          )}
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
    gap: 18,
  },
  description: {
    marginBottom: 8,
  },
  descText: {
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 22,
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
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
  },
  passwordHint: {
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    padding: 12,
    marginTop: 4,
  },
  hintText: {
    fontSize: 12,
    color: '#2563eb',
    marginBottom: 2,
  },
  button: {
    height: 52,
    borderRadius: 10,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    backgroundColor: '#93c5fd',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  successMessage: {
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
    padding: 12,
  },
  successText: {
    fontSize: 13,
    color: '#16a34a',
    textAlign: 'center',
  },
});