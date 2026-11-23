import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../../providers/AuthProvider';
import { useNavigation } from '@react-navigation/native';
import { AuthNavigationProp } from '../../navigation/types';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../../theme/tokens';

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginScreen() {
  const navigation = useNavigation<AuthNavigationProp>();
  const { login: authLogin, guestLogin: authGuestLogin, sendVerificationEmail } = useAuth();
  const [isPending, setIsPending] = useState(false);
  const [isGuestPending, setIsGuestPending] = useState(false);
  const [authError, setAuthError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const isBusy = isPending || isGuestPending;

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setAuthError('');
    setIsPending(true);
    try {
      await authLogin(data.email, data.password);
      if (navigation.canGoBack()) {
        navigation.goBack();
      }
      const currentUser = (await import('../../firebase/firebase')).getFirebaseAuth().currentUser;
      if (currentUser && !currentUser.emailVerified) {
        Alert.alert(
          'Verify your email',
          'Your account email (' + (currentUser.email || data.email) + ') is not verified yet.',
          [
            { text: 'Later', style: 'cancel' },
            {
              text: 'Resend email',
              onPress: () => {
                void sendVerificationEmail().then(
                  (result) =>
                    Alert.alert(
                      result.alreadyVerified ? 'Email verified' : 'Email sent',
                      result.alreadyVerified
                        ? 'Your email is already verified.'
                        : 'Check your inbox for the new link.',
                    ),
                  (error: unknown) =>
                    Alert.alert(
                      'Could not send email',
                      error instanceof Error ? error.message : 'Please try again later.',
                    ),
                );
              },
            },
          ],
        );
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Invalid credentials. Please try again.';
      setAuthError(message);
      Alert.alert('Login Failed', message);
    } finally {
      setIsPending(false);
    }
  };

  const goToRegister = () => navigation.navigate('Register');
  const goToForgotPassword = () => navigation.navigate('ForgotPassword');

  const continueAsGuest = async () => {
    setAuthError('');
    setIsGuestPending(true);
    try {
      await authGuestLogin();
      if (navigation.canGoBack()) {
        navigation.goBack();
      }
    } catch (err) {
      Alert.alert('Guest Login Failed', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setIsGuestPending(false);
    }
  };

  const fillDemo = () => {
    setValue('email', 'customer@laptopmitra.com', { shouldValidate: true });
    setValue('password', 'Mitra@2026!', { shouldValidate: true });
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {navigation.canGoBack() && (
          <TouchableOpacity
            style={styles.dismissButton}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityLabel="Close and return to browsing"
          >
            <Ionicons name="close" size={22} color={colors.textSecondary} />
          </TouchableOpacity>
        )}

        {/* Brand Header */}
        <View style={styles.header}>
          <View style={styles.badgePill}>
            <Ionicons name="shield-checkmark" size={13} color={colors.primary} />
            <Text style={styles.badgePillText}>Certified Tech Retail</Text>
          </View>
          <Text style={styles.brandTitle}>LaptopMitra</Text>
          <Text style={styles.subtitle}>Welcome Back! Enter your details to sign in.</Text>
        </View>

        {/* Form Card */}
        <View style={styles.card}>
          <View style={styles.formContainer}>
            {/* Email Field */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email Address</Text>
              <Controller
                control={control}
                name="email"
                render={({ field: { onChange, onBlur, value } }) => (
                  <View style={[styles.inputWrapper, errors.email && styles.inputWrapperError]}>
                    <Ionicons name="mail-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="name@company.com"
                      placeholderTextColor={colors.textMuted}
                      autoCapitalize="none"
                      autoComplete="email"
                      keyboardType="email-address"
                      returnKeyType="next"
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                      editable={!isBusy}
                    />
                  </View>
                )}
              />
              {errors.email && <Text style={styles.errorText}>{errors.email.message}</Text>}
            </View>

            {/* Password Field */}
            <View style={styles.inputGroup}>
              <View style={styles.inputRow}>
                <Text style={styles.label}>Password</Text>
                <TouchableOpacity onPress={goToForgotPassword} style={styles.forgotLink} disabled={isBusy}>
                  <Text style={styles.forgotText}>Forgot password?</Text>
                </TouchableOpacity>
              </View>
              <Controller
                control={control}
                name="password"
                render={({ field: { onChange, onBlur, value } }) => (
                  <View style={[styles.inputWrapper, errors.password && styles.inputWrapperError]}>
                    <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="••••••••"
                      placeholderTextColor={colors.textMuted}
                      secureTextEntry={!showPassword}
                      autoComplete="password"
                      returnKeyType="go"
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                      editable={!isBusy}
                      onSubmitEditing={handleSubmit(onSubmit)}
                    />
                    <TouchableOpacity
                      onPress={() => setShowPassword(!showPassword)}
                      style={styles.eyeButton}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      disabled={isBusy}
                    >
                      <Ionicons
                        name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={18}
                        color={colors.textMuted}
                      />
                    </TouchableOpacity>
                  </View>
                )}
              />
              {errors.password && <Text style={styles.errorText}>{errors.password.message}</Text>}
            </View>

            {/* API Error Box */}
            {authError ? (
              <View style={styles.apiError}>
                <Ionicons name="alert-circle" size={18} color={colors.danger} />
                <Text style={styles.apiErrorText}>{authError}</Text>
              </View>
            ) : null}

            {/* Primary Login Button */}
            <TouchableOpacity
              style={[styles.primaryButton, isBusy && styles.buttonDisabled]}
              onPress={handleSubmit(onSubmit)}
              disabled={isBusy}
              activeOpacity={0.85}
            >
              {isPending ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.primaryButtonText}>Sign In →</Text>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Guest Login */}
            <TouchableOpacity
              style={[styles.guestButton, isBusy && styles.buttonDisabled]}
              onPress={continueAsGuest}
              disabled={isBusy}
              activeOpacity={0.85}
            >
              {isGuestPending ? (
                <ActivityIndicator color={colors.primary} size="small" />
              ) : (
                <View style={styles.guestButtonContent}>
                  <Ionicons name="person-outline" size={16} color={colors.primary} />
                  <Text style={styles.guestButtonText}>Continue as Guest</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Quick Fill Demo Helper */}
            <TouchableOpacity
              style={styles.demoButton}
              onPress={fillDemo}
              disabled={isBusy}
              activeOpacity={0.7}
            >
              <Ionicons name="flash-outline" size={14} color="#D97706" />
              <Text style={styles.demoButtonText}>Quick Fill Demo Account</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Footer Links */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Don&apos;t have an account? </Text>
          <TouchableOpacity onPress={goToRegister} disabled={isBusy}>
            <Text style={styles.linkText}>Create free account →</Text>
          </TouchableOpacity>
        </View>

        {/* Trust Badges */}
        <View style={styles.trustBadges}>
          <View style={styles.trustBadgeItem}>
            <Ionicons name="shield-checkmark-outline" size={13} color="#16A34A" />
            <Text style={styles.trustBadgeText}>32-Point Quality Certified</Text>
          </View>
          <Text style={styles.trustBadgeDot}>•</Text>
          <View style={styles.trustBadgeItem}>
            <Ionicons name="lock-closed-outline" size={13} color={colors.textMuted} />
            <Text style={styles.trustBadgeText}>256-Bit SSL Encrypted</Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.pageBg,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
    justifyContent: 'center',
  },
  dismissButton: {
    alignSelf: 'flex-start',
    padding: spacing.xs,
    marginBottom: spacing.md,
    backgroundColor: colors.cardBg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#EFF6FF',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    marginBottom: spacing.xs,
  },
  badgePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.navy,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
  },
  card: {
    backgroundColor: colors.cardBg,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.xl,
  },
  formContainer: {
    width: '100%',
    gap: 16,
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
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.md,
    backgroundColor: '#FAF6EF',
    paddingHorizontal: 12,
  },
  inputWrapperError: {
    borderColor: colors.danger,
    backgroundColor: '#FEF2F2',
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 14,
    color: colors.textPrimary,
  },
  eyeButton: {
    padding: 4,
  },
  errorText: {
    fontSize: 11,
    color: colors.danger,
    marginTop: 2,
  },
  forgotLink: {
    paddingVertical: 2,
  },
  forgotText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
  apiError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    borderRadius: radius.md,
    padding: 12,
  },
  apiErrorText: {
    flex: 1,
    fontSize: 12,
    color: colors.dangerText,
    fontWeight: '500',
  },
  primaryButton: {
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.cardBorder,
  },
  dividerText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
  },
  guestButton: {
    height: 46,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.md,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  guestButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  guestButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  demoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 40,
    backgroundColor: '#FAF6EF',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.md,
  },
  demoButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xl,
    gap: 4,
  },
  footerText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  linkText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  trustBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: spacing.lg,
  },
  trustBadgeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trustBadgeText: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '500',
  },
  trustBadgeDot: {
    color: colors.textMuted,
    fontSize: 11,
  },
});