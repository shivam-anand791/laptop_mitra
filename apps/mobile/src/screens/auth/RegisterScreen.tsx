import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRegister } from '../../hooks/useApi';
import { useAuth } from '../../providers/AuthProvider';
import { useNavigation } from '@react-navigation/native';
import { AuthNavigationProp } from '../../navigation/types';

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name too long'),
  email: z.string().min(1, 'Email is required').email('Invalid email format'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password too long')
    .regex(/[a-z]/, 'Password must contain a lowercase letter')
    .regex(/[A-Z]/, 'Password must contain an uppercase letter')
    .regex(/[0-9]/, 'Password must contain a number')
    .regex(/[@$!%*?&]/, 'Password must contain a special character (@$!%*?&)'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
  phone: z.string().optional().refine(
    (val) => !val || /^\+?[1-9]\d{1,14}$/.test(val),
    'Invalid phone format (e.g., +919876543210)'
  ),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterScreen() {
  const navigation = useNavigation<AuthNavigationProp>();
  const { login: authLogin } = useAuth();
  const { mutate: apiRegister, isPending, isError, error } = useRegister();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      phone: '',
    },
  });

  const onSubmit = async (data: RegisterFormData) => {
    const { confirmPassword: _confirmPassword, ...registerData } = data;
    apiRegister(registerData, {
      onSuccess: async (response) => {
        const { access_token, user } = response as { access_token: string; user: any };
        await authLogin(access_token, undefined, user);
        // Navigation will auto-switch via RootNavigator
      },
      onError: (err: Error) => {
        Alert.alert('Registration Failed', err.message || 'Registration failed. Please try again.');
      },
    });
  };

  const goToLogin = () => navigation.navigate('Login');

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.logo}>LaptopMitra</Text>
          <Text style={styles.subtitle}>Create your account</Text>
        </View>

        <View style={styles.formContainer}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={styles.input}
              placeholder="John Doe"
              autoCapitalize="words"
              autoCompleteType="name"
              returnKeyType="next"
              {...(control as any)}
            />
            {errors.name && <Text style={styles.errorText}>{errors.name.message}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              autoCapitalize="none"
              autoCompleteType="email"
              keyboardType="email-address"
              returnKeyType="next"
              {...(control as any)}
            />
            {errors.email && <Text style={styles.errorText}>{errors.email.message}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="+91 98765 43210"
              autoCapitalize="none"
              autoCompleteType="tel"
              keyboardType="phone-pad"
              returnKeyType="next"
              {...(control as any)}
            />
            {errors.phone && <Text style={styles.errorText}>{errors.phone.message}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              secureTextEntry
              autoCompleteType="new-password"
              returnKeyType="next"
              {...(control as any)}
            />
            {errors.password && <Text style={styles.errorText}>{errors.password.message}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Confirm Password</Text>
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

          {isError && error && (
            <View style={styles.apiError}>
              <Text style={styles.apiErrorText}>{error.message || 'Registration failed. Please try again.'}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.button, isPending && styles.buttonDisabled]}
            onPress={handleSubmit(onSubmit)}
            disabled={isPending}
            activeOpacity={0.8}
          >
            {isPending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.buttonText}>Create Account</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <TouchableOpacity onPress={goToLogin} style={styles.link}>
            <Text style={styles.linkText}>Login</Text>
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