import { View, Text, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../../theme/tokens';
import { useSupportConfig } from '../../hooks/useApi';

interface TrustStripProps {
  style?: StyleProp<ViewStyle>;
}

export default function TrustStrip({ style }: TrustStripProps) {
  const { data: supportConfig } = useSupportConfig();
  const warrantyMonths = supportConfig
    ? Math.max(1, Math.round(supportConfig.standardWarrantyDays / 30))
    : null;
  const items = [
    {
      icon: 'shield-checkmark' as const,
      title: '32-Point Check',
      subtitle: 'Certified Quality',
    },
    {
      icon: 'ribbon' as const,
      title: warrantyMonths ? `${warrantyMonths}-Month Warranty` : 'Warranty',
      subtitle: 'Pan-India Cover',
    },
    {
      icon: 'swap-horizontal' as const,
      title: supportConfig?.returnWindowDays
        ? `${supportConfig.returnWindowDays}-Day Return`
        : 'Returns',
      subtitle: 'Easy Replacement',
    },
  ];

  return (
    <View style={[styles.container, style]}>
      {items.map((item, index) => (
        <View key={index} style={styles.item}>
          <View style={styles.iconCircle}>
            <Ionicons name={item.icon} size={16} color={colors.primary} />
          </View>
          <View style={styles.textWrap}>
            <Text style={styles.title} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              {item.subtitle}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'space-between',
    gap: spacing.xs,
    marginHorizontal: spacing.lg,
    backgroundColor: 'transparent',
    paddingVertical: 0,
    paddingHorizontal: 0,
  },
  item: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    backgroundColor: colors.cardBg,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  iconCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  textWrap: {
    alignItems: 'center',
  },
  title: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.navy,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 8.5,
    fontWeight: '500',
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 2,
  },
});
