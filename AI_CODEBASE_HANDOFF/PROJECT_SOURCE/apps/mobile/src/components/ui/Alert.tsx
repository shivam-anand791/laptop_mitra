import { View, Text, TouchableOpacity, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography, accessibility } from '../../theme/tokens';

export type AlertVariant = 'info' | 'success' | 'warning' | 'error';

export interface AlertProps {
  variant?: AlertVariant;
  title?: string;
  message: string;
  onDismiss?: () => void;
  style?: StyleProp<ViewStyle>;
}

export default function Alert({
  variant = 'info',
  title,
  message,
  onDismiss,
  style,
}: AlertProps) {
  const getVariantConfig = () => {
    switch (variant) {
      case 'success':
        return {
          bg: colors.greenLight,
          border: colors.greenBorder,
          iconColor: colors.green,
          textColor: colors.greenText,
          icon: 'checkmark-circle-outline' as const,
        };
      case 'warning':
        return {
          bg: colors.orangeLight,
          border: colors.orangeBorder,
          iconColor: colors.orange,
          textColor: colors.orangeText,
          icon: 'warning-outline' as const,
        };
      case 'error':
        return {
          bg: colors.dangerLight,
          border: colors.dangerBorder,
          iconColor: colors.danger,
          textColor: colors.dangerText,
          icon: 'alert-circle-outline' as const,
        };
      case 'info':
      default:
        return {
          bg: colors.primaryLight,
          border: colors.primaryBorder,
          iconColor: colors.primary,
          textColor: colors.primary,
          icon: 'information-circle-outline' as const,
        };
    }
  };

  const config = getVariantConfig();

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: config.bg, borderColor: config.border },
        style,
      ]}
      accessibilityRole="alert"
      accessibilityLiveRegion={variant === 'error' ? 'assertive' : 'polite'}
    >
      <Ionicons
        name={config.icon}
        size={20}
        color={config.iconColor}
        style={styles.icon}
      />

      <View style={styles.textContainer}>
        {title && (
          <Text
            style={[styles.title, { color: config.textColor }]}
            maxFontSizeMultiplier={accessibility.maxFontMultiplier}
          >
            {title}
          </Text>
        )}
        <Text
          style={[styles.message, { color: config.textColor }]}
          maxFontSizeMultiplier={accessibility.maxFontMultiplier}
        >
          {message}
        </Text>
      </View>

      {onDismiss && (
        <TouchableOpacity
          onPress={onDismiss}
          style={styles.dismissButton}
          accessibilityRole="button"
          accessibilityLabel="Dismiss alert"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close" size={18} color={config.textColor} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    marginVertical: spacing.xs,
  },
  icon: {
    marginRight: spacing.sm,
    marginTop: 1,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    ...typography.bodyBold,
    marginBottom: 2,
  },
  message: {
    ...typography.caption,
    lineHeight: 16,
  },
  dismissButton: {
    marginLeft: spacing.sm,
    padding: spacing.xxs,
  },
});
