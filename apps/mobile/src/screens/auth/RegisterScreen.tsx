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
import CountryPicker, { Country, COUNTRIES } from '../../components/CountryPicker';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../../theme/tokens';

const registerSchema = z
  .object({
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
    phone: z
      .string()
      .optional()
      .refine(
        (val) => !val || /^\d{7,15}$/.test(val),
        'Phone must be 7-15 digits (country code is selected separately)',
      ),
    referralCode: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterScreen() {
  const navigation = useNavigation<AuthNavigationProp>();
  const { register: authRegister, sendVerificationEmail } = useAuth();
  const [isPending, setIsPending] = useState(false);
  const [authError, setAuthError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<Country>(COUNTRIES[0]!); // Default: India

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      phone: '',
      referralCode: '',
    },
  });

  const referralCodeValue = watch('referralCode');
  const hasReferralCode = Boolean(referralCodeValue && referralCodeValue.trim().length > 0);

  const onSubmit = async (data: RegisterFormData) => {
    const { confirmPassword: _confirmPassword, phone, referralCode, ...rest } = data;

    // Build phone with country code: only if user entered a phone number
    const fullPhone =
      phone && phone.trim().length > 0
        ? `${selectedCountry.dialCode}${phone.trim()}`
        : undefined;

    const registerPayload: {
      name: string;
      email: string;
      password: string;
      phone?: string | undefined;
      referralCode?: string | undefined;
    } = {
      ...rest,
      ...(fullPhone ? { phone: fullPhone } : {}),
      ...(referralCode && referralCode.trim().length > 0
        ? { referralCode: referralCode.trim().toUpperCase() }
        : {}),
    };

    setAuthError('');
    setIsPending(true);
    try {
      await authRegister(registerPayload);
      try {
        const result = await sendVerificationEmail();
        Alert.alert(
          result.alreadyVerified ? 'Email already verified' : 'Check your email',
          result.alreadyVerified
            ? 'Your account email is already verified.'
            : 'We sent a verification link to ' + data.email.trim() + '.',
        );
      } catch {
        Alert.alert(
          'Account created',
          'Your account was created, but we could not send the verification email. Sign in and retry from Account.',
        );
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Registration failed. Please try again.';
      setAuthError(message);
      Alert.alert('Registration Failed', message);
    } finally {
      setIsPending(false);
    }
  };

  const goToLogin = () => navigation.navigate('Login');

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
        {/* Brand Header */}
        <View style={styles.header}>
          <View style={styles.badgePill}>
            <Ionicons name="gift-outline" size={13} color="#16A34A" />
            <Text style={styles.badgePillText}>₹500 Off First Purchase</Text>
          </View>
          <Text style={styles.brandTitle}>LaptopMitra</Text>
          <Text style={styles.subtitle}>Enter your details to register.</Text>
        </View>

        {/* Form Card */}
        <View style={styles.card}>
          <View style={styles.formContainer}>
            {/* Full Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Full Name *</Text>
              <Controller
                control={control}
                name="name"
                render={({ field: { onChange, onBlur, value } }) => (
                  <View style={[styles.inputWrapper, errors.name && styles.inputWrapperError]}>
                    <Ionicons name="person-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. Priya Patel"
                      placeholderTextColor={colors.textMuted}
                      autoCapitalize="words"
                      autoComplete="name"
                      returnKeyType="next"
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                      editable={!isPending}
                    />
                  </View>
                )}
              />
              {errors.name && <Text style={styles.errorText}>{errors.name.message}</Text>}
            </View>

            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email Address *</Text>
              <Controller
                control={control}
                name="email"
                render={({ field: { onChange, onBlur, value } }) => (
                  <View style={[styles.inputWrapper, errors.email && styles.inputWrapperError]}>
                    <Ionicons name="mail-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="you@company.com"
                      placeholderTextColor={colors.textMuted}
                      autoCapitalize="none"
                      autoComplete="email"
                      keyboardType="email-address"
                      returnKeyType="next"
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                      editable={!isPending}
                    />
                  </View>
                )}
              />
              {errors.email && <Text style={styles.errorText}>{errors.email.message}</Text>}
            </View>

            {/* Phone Number */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Mobile Phone (Optional)</Text>
              <View style={[styles.phoneRow, errors.phone && styles.inputWrapperError]}>
                <CountryPicker selectedCountry={selectedCountry} onSelect={setSelectedCountry} />
                <Controller
                  control={control}
                  name="phone"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      style={styles.phoneInput}
                      placeholder="98765 43210"
                      placeholderTextColor={colors.textMuted}
                      autoCapitalize="none"
                      autoComplete="tel"
                      keyboardType="phone-pad"
                      returnKeyType="next"
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value ?? ''}
                      maxLength={15}
                      editable={!isPending}
                    />
                  )}
                />
              </View>
              {errors.phone && <Text style={styles.errorText}>{errors.phone.message}</Text>}
            </View>

            {/* Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password *</Text>
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
                      autoComplete="new-password"
                      returnKeyType="next"
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                      editable={!isPending}
                    />
                    <TouchableOpacity
                      onPress={() => setShowPassword(!showPassword)}
                      style={styles.eyeButton}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
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

            {/* Confirm Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Confirm Password *</Text>
              <Controller
                control={control}
                name="confirmPassword"
                render={({ field: { onChange, onBlur, value } }) => (
                  <View style={[styles.inputWrapper, errors.confirmPassword && styles.inputWrapperError]}>
                    <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="••••••••"
                      placeholderTextColor={colors.textMuted}
                      secureTextEntry={!showConfirmPassword}
                      autoComplete="new-password"
                      returnKeyType="next"
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                      editable={!isPending}
                    />
                    <TouchableOpacity
                      onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                      style={styles.eyeButton}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons
                        name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={18}
                        color={colors.textMuted}
                      />
                    </TouchableOpacity>
                  </View>
                )}
              />
              {errors.confirmPassword && (
                <Text style={styles.errorText}>{errors.confirmPassword.message}</Text>
              )}
            </View>

            {/* Password Requirement Notes */}
            <View style={styles.passwordHint}>
              <Text style={styles.hintTitle}>Password requirements:</Text>
              <Text style={styles.hintItem}>• Minimum 8 characters with 1 number</Text>
              <Text style={styles.hintItem}>• At least 1 uppercase & 1 special character (@$!%*?&)</Text>
            </View>

            {/* Referral Code (Optional) */}
            <View style={styles.inputGroup}>
              <View style={styles.referralHeaderRow}>
                <Text style={styles.label}>Mitra Referral Code (Optional)</Text>
                {hasReferralCode && (
                  <View style={styles.appliedBadge}>
                    <Text style={styles.appliedBadgeText}>₹500 Applied</Text>
                  </View>
                )}
              </View>
              <Controller
                control={control}
                name="referralCode"
                render={({ field: { onChange, onBlur, value } }) => (
                  <View style={styles.inputWrapper}>
                    <Ionicons name="pricetag-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
                    <TextInput
                      style={[styles.input, styles.monoInput]}
                      placeholder="e.g. MITRA4521"
                      placeholderTextColor={colors.textMuted}
                      autoCapitalize="characters"
                      returnKeyType="done"
                      onBlur={onBlur}
                      onChangeText={(val) => onChange(val.toUpperCase())}
                      value={value ?? ''}
                      editable={!isPending}
                      onSubmitEditing={handleSubmit(onSubmit)}
                    />
                  </View>
                )}
              />
              <Text style={styles.helperText}>
                Entering a referral code gives you ₹500 instant discount on your first order.
              </Text>
            </View>

            {/* API Error Box */}
            {authError ? (
              <View style={styles.apiError}>
                <Ionicons name="alert-circle" size={18} color={colors.danger} />
                <Text style={styles.apiErrorText}>{authError}</Text>
              </View>
            ) : null}

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.primaryButton, isPending && styles.buttonDisabled]}
              onPress={handleSubmit(onSubmit)}
              disabled={isPending}
              activeOpacity={0.85}
            >
              {isPending ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.primaryButtonText}>Create Account →</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Footer Link */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <TouchableOpacity onPress={goToLogin} disabled={isPending}>
            <Text style={styles.linkText}>Sign in here →</Text>
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
    backgroundColor: '#F0FDF4',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    marginBottom: spacing.xs,
  },
  badgePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
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
    gap: 15,
  },
  inputGroup: {
    gap: 5,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  referralHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  appliedBadge: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  appliedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#15803D',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 46,
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
  monoInput: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontWeight: '600',
    letterSpacing: 1,
  },
  eyeButton: {
    padding: 4,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 46,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.md,
    backgroundColor: '#FAF6EF',
    overflow: 'hidden',
  },
  phoneInput: {
    flex: 1,
    height: '100%',
    fontSize: 14,
    color: colors.textPrimary,
    paddingHorizontal: 12,
  },
  errorText: {
    fontSize: 11,
    color: colors.danger,
    marginTop: 2,
  },
  helperText: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 1,
  },
  passwordHint: {
    backgroundColor: '#EFF6FF',
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    padding: 10,
    marginTop: 2,
  },
  hintTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 2,
  },
  hintItem: {
    fontSize: 10,
    color: '#1E40AF',
    lineHeight: 14,
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