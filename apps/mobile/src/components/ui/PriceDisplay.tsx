import { View, Text, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { colors, spacing, typography, accessibility } from '../../theme/tokens';

export interface PriceDisplayProps {
  price: number | string;
  compareAtPrice?: number | string | null;
  size?: 'sm' | 'md' | 'lg';
  showEMI?: boolean;
  style?: StyleProp<ViewStyle>;
}

function formatINR(val: number | string): string {
  const num = typeof val === 'string' ? parseFloat(val) : val;
  if (isNaN(num)) return '₹0';
  return `₹${Math.round(num).toLocaleString('en-IN')}`;
}

export default function PriceDisplay({
  price,
  compareAtPrice,
  size = 'md',
  showEMI = false,
  style,
}: PriceDisplayProps) {
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  const numCompare =
    compareAtPrice !== null && compareAtPrice !== undefined
      ? typeof compareAtPrice === 'string'
        ? parseFloat(compareAtPrice)
        : compareAtPrice
      : null;

  const hasSavings = numCompare !== null && numCompare > numPrice;
  const savings = hasSavings ? numCompare! - numPrice : 0;
  const discountPercent = hasSavings ? Math.round((savings / numCompare!) * 100) : 0;

  const emiPerMonth = Math.round(numPrice / 12);

  return (
    <View
      style={[styles.container, style]}
      accessible={true}
      accessibilityRole="text"
      accessibilityLabel={`Price ${formatINR(numPrice)}${
        hasSavings ? `, original price ${formatINR(numCompare!)}` : ''
      }`}
    >
      <View style={styles.priceRow}>
        <Text
          style={[
            styles.price,
            size === 'sm' && styles.priceSm,
            size === 'lg' && styles.priceLg,
          ]}
          maxFontSizeMultiplier={accessibility.maxFontMultiplier}
        >
          {formatINR(numPrice)}
        </Text>

        {hasSavings && (
          <Text
            style={[styles.comparePrice, size === 'sm' && styles.comparePriceSm]}
            maxFontSizeMultiplier={accessibility.maxFontMultiplier}
          >
            {formatINR(numCompare!)}
          </Text>
        )}
      </View>

      {hasSavings && (
        <Text
          style={styles.savingsText}
          maxFontSizeMultiplier={accessibility.maxFontMultiplier}
        >
          Save {formatINR(savings)} ({discountPercent}% off)
        </Text>
      )}

      {showEMI && numPrice > 5000 && (
        <Text
          style={styles.emiText}
          maxFontSizeMultiplier={accessibility.maxFontMultiplier}
        >
          Or {formatINR(emiPerMonth)}/mo No-Cost EMI
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  price: {
    ...typography.h2,
    color: colors.textPrimary,
    fontWeight: '800',
  },
  priceSm: {
    fontSize: 16,
    lineHeight: 20,
  },
  priceLg: {
    fontSize: 24,
    lineHeight: 28,
  },
  comparePrice: {
    ...typography.caption,
    textDecorationLine: 'line-through',
    color: colors.textMuted,
  },
  comparePriceSm: {
    fontSize: 10,
  },
  savingsText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.greenText,
    marginTop: 1,
  },
  emiText: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textSecondary,
    marginTop: 1,
  },
});
