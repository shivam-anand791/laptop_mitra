import { View, Text, StyleSheet, ViewStyle, TextStyle, StyleProp } from 'react-native';
import { colors, radius, spacing } from '../../theme/tokens';

export type BadgeVariant =
  | 'refurb'
  | 'bestSeller'
  | 'newArrival'
  | 'hotDeal'
  | 'dispatch'
  | 'discount'
  | 'grade'
  | 'outline'
  | 'neutral';

interface BadgeProps {
  label?: string;
  variant?: BadgeVariant;
  stockCount?: number;
  grade?: string;
  discountPercent?: number;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export default function Badge({
  label,
  variant = 'neutral',
  stockCount,
  grade,
  discountPercent,
  style,
  textStyle,
}: BadgeProps) {
  let computedLabel = label || '';
  let containerStyle: ViewStyle = {};
  let computedTextStyle: TextStyle = {};

  switch (variant) {
    case 'refurb':
      computedLabel = label || 'REFURB';
      containerStyle = {
        backgroundColor: colors.navy,
      };
      computedTextStyle = {
        color: colors.textWhite,
        fontWeight: '800',
        letterSpacing: 0.5,
      };
      break;

    case 'bestSeller':
      computedLabel = label || 'Best Seller';
      containerStyle = {
        backgroundColor: colors.orange,
      };
      computedTextStyle = {
        color: colors.textWhite,
        fontWeight: '700',
      };
      break;

    case 'newArrival':
      computedLabel = label || 'New Arrival';
      containerStyle = {
        backgroundColor: colors.primary,
      };
      computedTextStyle = {
        color: colors.textWhite,
        fontWeight: '700',
      };
      break;

    case 'hotDeal':
      computedLabel = label || 'HOT DEAL';
      containerStyle = {
        backgroundColor: colors.danger,
      };
      computedTextStyle = {
        color: colors.textWhite,
        fontWeight: '800',
        letterSpacing: 0.5,
      };
      break;

    case 'dispatch':
      computedLabel = stockCount !== undefined
        ? `Ready for Dispatch • ${stockCount} available`
        : label || 'Ready for Dispatch';
      containerStyle = {
        backgroundColor: colors.greenLight,
        borderColor: colors.greenBorder,
        borderWidth: 1,
      };
      computedTextStyle = {
        color: colors.greenText,
        fontWeight: '600',
      };
      break;

    case 'discount':
      computedLabel = discountPercent !== undefined
        ? `${discountPercent}% OFF`
        : label || 'OFF';
      containerStyle = {
        backgroundColor: colors.greenLight,
        borderColor: colors.greenBorder,
        borderWidth: 1,
      };
      computedTextStyle = {
        color: colors.greenText,
        fontWeight: '700',
      };
      break;

    case 'grade':
      computedLabel = grade ? `Grade ${grade}` : label || 'Grade A';
      containerStyle = {
        backgroundColor: '#F1F5F9',
        borderColor: '#CBD5E1',
        borderWidth: 1,
      };
      computedTextStyle = {
        color: colors.navy,
        fontWeight: '700',
      };
      break;

    case 'outline':
      containerStyle = {
        backgroundColor: 'transparent',
        borderColor: colors.primaryBorder,
        borderWidth: 1,
      };
      computedTextStyle = {
        color: colors.primary,
        fontWeight: '600',
      };
      break;

    case 'neutral':
    default:
      containerStyle = {
        backgroundColor: '#F1F5F9',
      };
      computedTextStyle = {
        color: colors.textSecondary,
        fontWeight: '600',
      };
      break;
  }

  return (
    <View style={[styles.baseBadge, containerStyle, style]}>
      {variant === 'dispatch' && <View style={styles.greenDot} />}
      <Text style={[styles.baseText, computedTextStyle, textStyle]}>
        {computedLabel}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  baseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs + 1,
    borderRadius: radius.xs,
    alignSelf: 'flex-start',
  },
  baseText: {
    fontSize: 10,
    textTransform: 'uppercase',
  },
  greenDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.green,
    marginRight: 4,
  },
});
