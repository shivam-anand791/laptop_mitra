import type { ReactNode } from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
  StyleProp,
} from 'react-native';
import { colors, radius, spacing } from '../../theme/tokens';

export type ButtonVariant = 'primary' | 'navy' | 'outline' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  testID?: string;
}

export default function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'left',
  loading = false,
  disabled = false,
  fullWidth = false,
  style,
  textStyle,
  testID,
}: ButtonProps) {
  const getContainerStyle = (): ViewStyle => {
    const base: ViewStyle = {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.md,
      opacity: disabled ? 0.55 : 1,
    };

    // Size
    if (size === 'sm') {
      base.paddingVertical = spacing.xs + 2;
      base.paddingHorizontal = spacing.md;
      base.minHeight = 36;
    } else if (size === 'lg') {
      base.paddingVertical = spacing.md + 2;
      base.paddingHorizontal = spacing.xxl;
      base.minHeight = 52;
      base.borderRadius = radius.lg;
    } else {
      // md
      base.paddingVertical = spacing.sm + 2;
      base.paddingHorizontal = spacing.lg;
      base.minHeight = 44;
    }

    // Variant
    switch (variant) {
      case 'navy':
        base.backgroundColor = colors.navy;
        break;
      case 'secondary':
        base.backgroundColor = colors.primaryLight;
        break;
      case 'outline':
        base.backgroundColor = 'transparent';
        base.borderWidth = 1.5;
        base.borderColor = colors.primary;
        break;
      case 'ghost':
        base.backgroundColor = 'transparent';
        break;
      case 'danger':
        base.backgroundColor = colors.danger;
        break;
      case 'primary':
      default:
        base.backgroundColor = colors.primary;
        break;
    }

    if (fullWidth) {
      base.width = '100%';
    }

    return base;
  };

  const getTextStyle = (): TextStyle => {
    const base: TextStyle = {
      fontWeight: '700',
    };

    if (size === 'sm') {
      base.fontSize = 12;
    } else if (size === 'lg') {
      base.fontSize = 16;
    } else {
      base.fontSize = 14;
    }

    switch (variant) {
      case 'secondary':
        base.color = colors.primary;
        break;
      case 'outline':
        base.color = colors.primary;
        break;
      case 'ghost':
        base.color = colors.navy;
        break;
      case 'navy':
      case 'danger':
      case 'primary':
      default:
        base.color = colors.textWhite;
        break;
    }

    return base;
  };

  const spinnerColor =
    variant === 'outline' || variant === 'secondary'
      ? colors.primary
      : variant === 'ghost'
        ? colors.navy
        : colors.textWhite;

  return (
    <TouchableOpacity
      testID={testID}
      style={[getContainerStyle(), style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
    >
      {loading ? (
        <ActivityIndicator size="small" color={spinnerColor} />
      ) : (
        <>
          {icon && iconPosition === 'left' && <>{icon}</>}
          <Text
            style={[
              getTextStyle(),
              icon && iconPosition === 'left' ? styles.iconLeftMargin : null,
              icon && iconPosition === 'right' ? styles.iconRightMargin : null,
              textStyle,
            ]}
          >
            {title}
          </Text>
          {icon && iconPosition === 'right' && <>{icon}</>}
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  iconLeftMargin: {
    marginLeft: spacing.xs + 2,
  },
  iconRightMargin: {
    marginRight: spacing.xs + 2,
  },
});
