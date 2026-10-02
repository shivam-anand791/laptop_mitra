import { View, Text, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../../theme/tokens';

interface TrustStripProps {
  style?: StyleProp<ViewStyle>;
}

export default function TrustStrip({ style }: TrustStripProps) {
  const items = [
    {
      icon: 'shield-checkmark' as const,
      title: '32-Point Check',
      subtitle: 'Certified Quality',
    },
    {
      icon: 'ribbon' as const,
      title: '1-Yr Warranty',
      subtitle: 'Pan-India Cover',
    },
    {
      icon: 'swap-horizontal' as const,
      title: '7-Day Return',
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
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.cardBg,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    marginHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  item: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    flex: 1,
  },
  title: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.navy,
  },
  subtitle: {
    fontSize: 9,
    fontWeight: '500',
    color: colors.textSecondary,
    marginTop: 1,
  },
});
