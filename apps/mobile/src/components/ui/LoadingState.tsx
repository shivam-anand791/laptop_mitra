import { View, Text, ActivityIndicator, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { colors, spacing, typography, accessibility } from '../../theme/tokens';

export interface LoadingStateProps {
  message?: string;
  style?: StyleProp<ViewStyle>;
}

export default function LoadingState({
  message = 'Loading...',
  style,
}: LoadingStateProps) {
  return (
    <View
      style={[styles.container, style]}
      accessibilityRole="progressbar"
      accessibilityLabel={message}
    >
      <ActivityIndicator size="large" color={colors.primary} />
      {message && (
        <Text
          style={styles.message}
          maxFontSizeMultiplier={accessibility.maxFontMultiplier}
        >
          {message}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.lg,
  },
  message: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
});
