import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { API_BASE_URL, isTunnelMode, isPhysicalDevice, hostUri } from '../config';
import { colors, radius, spacing } from '../theme/tokens';

interface Props {
  onRetry: () => void;
  isRetrying?: boolean;
  onContinueAnyway?: () => void;
}

export default function ServerUnreachableScreen({ onRetry, isRetrying, onContinueAnyway }: Props) {
  const isDev = typeof __DEV__ !== 'undefined' ? Boolean(__DEV__) : process.env.NODE_ENV !== 'production';
  const isRenderCloud = API_BASE_URL.includes('onrender.com');

  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <Ionicons name="cloud-offline-outline" size={48} color={colors.danger} />
      </View>

      <Text style={styles.title}>{"Can't Reach the Server"}</Text>
      <Text style={styles.subtitle}>
        The mobile app is unable to communicate with the LaptopMitra backend.
      </Text>

      {isDev && (
        <ScrollView style={styles.devCard} contentContainerStyle={styles.devCardContent}>
          <Text style={styles.devHeader}>[Development Diagnostic]</Text>
          <Text style={styles.devLabel}>
            Target API URL:{' '}
            <Text style={styles.devCode}>{API_BASE_URL}</Text>
          </Text>
          <Text style={styles.devLabel}>
            Runtime:{' '}
            <Text style={styles.devCode}>
              {isPhysicalDevice ? 'Physical Device' : 'Emulator / Simulator'}
            </Text>
          </Text>
          {hostUri && (
            <Text style={styles.devLabel}>
              Metro HostUri:{' '}
              <Text style={styles.devCode}>{hostUri}</Text>
            </Text>
          )}

          {isTunnelMode && (
            <View style={styles.warningBox}>
              <Text style={styles.warningText}>
                ⚠️ Tunnel mode detected. A physical device on tunnel cannot access your local PC via LAN unless EXPO_PUBLIC_API_URL is set to a public or tunnel URL.
              </Text>
            </View>
          )}

          {isRenderCloud && (
            <View style={styles.warningBox}>
              <Text style={styles.warningText}>
                Render Cloud Notice: Render free tier instances spin down after 15 minutes of inactivity and take 30-50 seconds to wake up on the first request. Tap Retry Connection or Continue to App.
              </Text>
            </View>
          )}

          <Text style={styles.checklistTitle}>Likely Causes & Fixes:</Text>
          <Text style={styles.checkItem}>1. Same Wi-Fi: Phone and PC must be on the same local network subnet.</Text>
          <Text style={styles.checkItem}>2. Windows Firewall: Open port 3001 in Windows Defender for incoming connections.</Text>
          <Text style={styles.checkItem}>3. API Server: Ensure backend is running (`pnpm --filter api start:dev`).</Text>
          <Text style={styles.checkItem}>4. Host Binding: Set EXPO_PUBLIC_API_URL=http://&lt;YOUR-PC-IP&gt;:3001 in apps/mobile/.env.</Text>
        </ScrollView>
      )}

      <TouchableOpacity
        style={[styles.retryBtn, isRetrying && { opacity: 0.6 }]}
        onPress={onRetry}
        disabled={isRetrying}
      >
        <Ionicons name="refresh" size={18} color="#ffffff" style={{ marginRight: 6 }} />
        <Text style={styles.retryBtnText}>{isRetrying ? 'Checking connection...' : 'Retry Connection'}</Text>
      </TouchableOpacity>

      {onContinueAnyway && (
        <TouchableOpacity style={styles.bypassBtn} onPress={onContinueAnyway}>
          <Text style={styles.bypassBtnText}>Continue to App Anyway</Text>
        </TouchableOpacity>
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
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fef2f2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: spacing.lg,
    maxWidth: 280,
    lineHeight: 20,
  },
  devCard: {
    maxHeight: 220,
    width: '100%',
    backgroundColor: '#f8fafc',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: spacing.lg,
  },
  devCardContent: {
    padding: spacing.md,
  },
  devHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  devLabel: {
    fontSize: 12,
    color: '#334155',
    marginBottom: 4,
  },
  devCode: {
    fontFamily: 'monospace',
    fontWeight: '600',
    color: '#0284c7',
  },
  warningBox: {
    backgroundColor: '#fffbeb',
    borderColor: '#fef3c7',
    borderWidth: 1,
    borderRadius: radius.sm,
    padding: spacing.xs + 2,
    marginVertical: spacing.xs,
  },
  warningText: {
    fontSize: 11,
    color: '#92400e',
    lineHeight: 15,
  },
  checklistTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: spacing.xs,
    marginBottom: 4,
  },
  checkItem: {
    fontSize: 11,
    color: '#64748b',
    lineHeight: 16,
    marginBottom: 2,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: radius.md,
  },
  retryBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  bypassBtn: {
    marginTop: spacing.sm,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
  },
  bypassBtnText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },
});
