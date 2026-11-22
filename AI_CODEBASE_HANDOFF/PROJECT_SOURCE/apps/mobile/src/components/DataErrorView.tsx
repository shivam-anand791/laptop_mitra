import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
import { colors, radius, spacing } from '../theme/tokens';

interface DataErrorViewProps {
  error?: unknown;
  onRetry: () => void;
  isRetrying?: boolean;
  title?: string;
  message?: string;
  style?: StyleProp<ViewStyle>;
}

export function DataErrorView({
  error,
  onRetry,
  isRetrying,
  title,
  message,
  style,
}: DataErrorViewProps) {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    let mounted = true;
    void NetInfo.fetch().then((state) => {
      if (mounted) {
        setIsOffline(!state.isConnected || state.isInternetReachable === false);
      }
    });

    const unsubscribe = NetInfo.addEventListener((state) => {
      if (mounted) {
        setIsOffline(!state.isConnected || state.isInternetReachable === false);
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  // Determine if error indicates offline / connection failure
  const errString = error instanceof Error ? error.message : String(error || '');
  const seemsOffline =
    isOffline ||
    errString.toLowerCase().includes('network') ||
    errString.toLowerCase().includes('failed to fetch') ||
    errString.toLowerCase().includes('connection refused');

  const displayTitle =
    title || (seemsOffline ? "You're Offline" : 'Unable to Load Content');

  const displayMessage =
    message ||
    (seemsOffline
      ? 'Please check your internet connection and tap retry.'
      : 'We had trouble reaching our servers. Please try again.');

  return (
    <View style={[styles.container, style]}>
      <View style={[styles.iconCircle, seemsOffline && styles.offlineCircle]}>
        <Ionicons
          name={seemsOffline ? 'cloud-offline-outline' : 'alert-circle-outline'}
          size={36}
          color={seemsOffline ? colors.orange : colors.danger}
        />
      </View>

      <Text style={styles.title}>{displayTitle}</Text>
      <Text style={styles.message}>{displayMessage}</Text>

      <TouchableOpacity
        style={[styles.retryBtn, isRetrying && styles.retryBtnDisabled]}
        onPress={onRetry}
        disabled={isRetrying}
      >
        <Ionicons name="refresh" size={16} color="#ffffff" style={{ marginRight: 6 }} />
        <Text style={styles.retryBtnText}>
          {isRetrying ? 'Retrying...' : 'Retry'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  offlineCircle: {
    backgroundColor: '#fef3c7',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  message: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
    maxWidth: 280,
    lineHeight: 18,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  retryBtnDisabled: {
    opacity: 0.6,
  },
  retryBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});
