import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../theme/tokens';

interface Props {
  missingVars: string[];
}

export default function FirebaseConfigErrorScreen({ missingVars }: Props) {
  const isDev = typeof __DEV__ !== 'undefined' ? Boolean(__DEV__) : process.env.NODE_ENV !== 'production';

  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <Ionicons name="warning-outline" size={44} color={colors.orange} />
      </View>

      <Text style={styles.title}>Firebase Setup Required</Text>
      <Text style={styles.subtitle}>
        The mobile app is missing required Firebase client configuration to authenticate users.
      </Text>

      {isDev ? (
        <ScrollView style={styles.card} contentContainerStyle={styles.cardContent}>
          <Text style={styles.cardHeader}>Missing Environment Variables:</Text>
          {missingVars.map((varName) => (
            <View key={varName} style={styles.varRow}>
              <Ionicons name="close-circle" size={16} color={colors.danger} style={{ marginRight: 6 }} />
              <Text style={styles.varText}>{varName}</Text>
            </View>
          ))}

          <Text style={styles.instructionsTitle}>How to Fix in Development:</Text>
          <Text style={styles.instructionsText}>
            1. Copy keys from your Firebase Console project settings.
          </Text>
          <Text style={styles.instructionsText}>
            2. Add them to <Text style={styles.codeText}>apps/mobile/.env</Text> or your shell environment.
          </Text>
          <Text style={styles.instructionsText}>
            3. Restart Metro bundler with <Text style={styles.codeText}>npx expo start -c</Text>.
          </Text>
        </ScrollView>
      ) : (
        <View style={styles.prodBox}>
          <Text style={styles.prodText}>
            Please contact LaptopMitra support if this configuration issue persists in production.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#fef3c7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.sm,
  },
  card: {
    width: '100%',
    maxHeight: 280,
    backgroundColor: '#f8fafc',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: spacing.lg,
  },
  cardContent: {
    padding: spacing.md,
  },
  cardHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.danger,
    marginBottom: spacing.sm,
  },
  varRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  varText: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#334155',
  },
  instructionsTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  instructionsText: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: 4,
  },
  codeText: {
    fontFamily: 'monospace',
    color: '#0f172a',
    backgroundColor: '#e2e8f0',
  },
  prodBox: {
    padding: spacing.md,
    backgroundColor: '#f8fafc',
    borderRadius: radius.md,
  },
  prodText: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
