import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useGuestLogin, useLogin } from '../../hooks/useApi';
import { useAuth } from '../../providers/AuthProvider';
import { useNavigation } from '@react-navigation/native';
import { AuthNavigationProp } from '../../navigation/types';

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginScreen() {
  const navigation = useNavigation<AuthNavigationProp>();
  const { login: authLogin } = useAuth();
  const { mutate: apiLogin, isPending, isError, error } = useLogin();
  const { mutateAsync: apiGuestLogin, isPending: isGuestPending } = useGuestLogin();
  const isBusy = isPending || isGuestPending;

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    apiLogin(data, {
      onSuccess: async (response: any) => {
        const { accessToken, refreshToken, user } = response;
        await authLogin(accessToken, refreshToken, user);
      },
      onError: (err: Error) => {
        Alert.alert('Login Failed', err.message || 'Invalid credentials. Please try again.');
      },
    });
  };

  const goToRegister = () => navigation.navigate('Register');
  const goToForgotPassword = () => navigation.navigate('ForgotPassword');

  const continueAsGuest = async () => {
    try {
      const response = await apiGuestLogin();
      await authLogin(response.accessToken, response.refreshToken, response.user);
    } catch (err) {
      Alert.alert('Guest Login Failed', err instanceof Error ? err.message : 'Please try again.');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.logo}>LaptopMitra</Text>
          <Text style={styles.subtitle}>Welcome back</Text>
        </View>

        <View style={styles.formContainer}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={styles.input}
                  placeholder="you@example.com"
                  autoCapitalize="none"
                  autoComplete="email"
                  keyboardType="email-address"
                  returnKeyType="next"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                />
              )}
            />
            {errors.email && <Text style={styles.errorText}>{errors.email.message}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.inputRow}>
              <Text style={styles.label}>Password</Text>
              <TouchableOpacity onPress={goToForgotPassword} style={styles.forgotLink}>
                <Text style={styles.forgotText}>Forgot?</Text>
              </TouchableOpacity>
            </View>
            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  secureTextEntry
                  autoComplete="password"
                  returnKeyType="go"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                />
              )}
            />
            {errors.password && <Text style={styles.errorText}>{errors.password.message}</Text>}
          </View>

          {isError && error && (
            <View style={styles.apiError}>
              <Text style={styles.apiErrorText}>Invalid credentials. Please try again.</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.button, isBusy && styles.buttonDisabled]}
            onPress={handleSubmit(onSubmit)}
            disabled={isBusy}
            activeOpacity={0.8}
          >
            {isPending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.buttonText}>Login</Text>
            )}
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={[styles.guestButton, isBusy && styles.buttonDisabled]}
            onPress={continueAsGuest}
            disabled={isBusy}
            activeOpacity={0.8}
          >
            {isGuestPending ? (
              <ActivityIndicator color="#2563eb" size="small" />
            ) : (
              <Text style={styles.guestButtonText}>Continue as Guest</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Don&apos;t have an account? </Text>
          <TouchableOpacity onPress={goToRegister} style={styles.link}>
            <Text style={styles.linkText}>Sign up</Text>
          </TouchableOpacity>
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
    marginBottom: 40,
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
  inputGroup: {
    gap: 6,
  },
  inputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  forgotLink: {
    padding: 4,
  },
  forgotText: {
    fontSize: 13,
    color: '#2563eb',
    fontWeight: '500',
  },
  apiError: {
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    padding: 12,
  },
  apiErrorText: {
    fontSize: 13,
    color: '#dc2626',
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
  buttonDisabled: {
    backgroundColor: '#93c5fd',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e2e8f0',
  },
  dividerText: {
    color: '#94a3b8',
    fontSize: 13,
  },
  guestButton: {
    height: 52,
    borderWidth: 1,
    borderColor: '#2563eb',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  guestButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2563eb',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 32,
    gap: 4,
  },
  footerText: {
    fontSize: 14,
    color: '#64748b',
  },
  link: {
    padding: 4,
  },
  linkText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563eb',
  },
});
