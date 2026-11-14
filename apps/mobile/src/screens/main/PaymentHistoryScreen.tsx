import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { usePaymentHistory } from '../../hooks/useApi';
import { useAuth } from '../../providers/AuthProvider';
import { PaymentRecord } from '@laptopmitra/types';
import { MainStackNavigationProp } from '../../navigation/types';
import { formatIndianRupees } from '../../utils/account-helpers';
import { colors, radius, spacing, shadows } from '../../theme/tokens';

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

function getPaymentStatusBadge(status?: string | null) {
  const s = (status || '').toUpperCase();
  if (s === 'COMPLETED' || s === 'PAID' || s === 'CAPTURED' || s === 'SUCCESS') {
    return {
      label: 'Paid',
      bg: '#f0fdf4',
      text: '#16a34a',
      icon: 'checkmark-circle' as const,
    };
  }
  if (s === 'PENDING' || s === 'AUTHORIZED') {
    return {
      label: 'Pending',
      bg: '#fef3c7',
      text: '#d97706',
      icon: 'time' as const,
    };
  }
  if (s === 'FAILED' || s === 'CANCELLED') {
    return {
      label: 'Failed',
      bg: '#fef2f2',
      text: '#dc2626',
      icon: 'alert-circle' as const,
    };
  }
  return {
    label: s || 'Processed',
    bg: '#f1f5f9',
    text: '#64748b',
    icon: 'card-outline' as const,
  };
}

export default function PaymentHistoryScreen() {
  const navigation = useNavigation<MainStackNavigationProp>();
  const { isAuthenticated, isGuest } = useAuth();
  const { data: payments = [], isLoading, refetch, isRefetching } = usePaymentHistory();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch]),
  );

  const handleCopy = (id: string) => {
    setCopiedId(id);
    Alert.alert('Transaction Reference', `Copied Reference: ${id}`);
    setTimeout(() => setCopiedId(null), 2500);
  };

  if (!isAuthenticated || isGuest) {
    return (
      <View style={styles.centered}>
        <Ionicons name="card-outline" size={56} color="#94a3b8" />
        <Text style={styles.emptyTitle}>Sign in to view payments</Text>
        <Text style={styles.emptySubtitle}>Log in to access all your transaction history</Text>
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => navigation.navigate('Auth' as any)}
          activeOpacity={0.8}
        >
          <Text style={styles.primaryBtnText}>Log In / Register</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const renderPaymentItem = ({ item }: { item: PaymentRecord }) => {
    const badge = getPaymentStatusBadge(item.status);
    const orderId = item.orderId;
    const orderNumber = item.orderNumber || (item as any).order?.orderNumber;
    const txnRef = item.razorpayPaymentId || item.id;
    const paymentModeLabel = item.razorpayPaymentId
      ? 'ONLINE (RAZORPAY)'
      : 'PAY ON DELIVERY (COD)';

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <Text style={styles.amountText}>{formatIndianRupees(item.amount)}</Text>
            <Text style={styles.methodText}>{paymentModeLabel}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: badge.bg }]}>
            <Ionicons name={badge.icon} size={12} color={badge.text} />
            <Text style={[styles.badgeText, { color: badge.text }]}>{badge.label}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Date & Time</Text>
            <Text style={styles.metaValue}>{formatDate(item.createdAt)}</Text>
          </View>
          {orderNumber ? (
            <TouchableOpacity
              style={styles.orderLink}
              onPress={() => {
                if (orderId) {
                  navigation.navigate('OrderDetail', { orderId });
                }
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.orderLinkLabel}>Order #{orderNumber}</Text>
              <Ionicons name="chevron-forward" size={14} color={colors.primary} />
            </TouchableOpacity>
          ) : null}
        </View>

        {txnRef ? (
          <View style={styles.txnRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.txnLabel}>Reference ID</Text>
              <Text style={styles.txnText} numberOfLines={1}>
                {txnRef}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.copyBtn}
              onPress={() => handleCopy(txnRef)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name={copiedId === txnRef ? 'checkmark-circle' : 'copy-outline'}
                size={16}
                color={copiedId === txnRef ? '#16a34a' : colors.primary}
              />
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading payment history...</Text>
        </View>
      ) : payments.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="receipt-outline" size={64} color="#cbd5e1" />
          <Text style={styles.emptyTitle}>No payment transactions</Text>
          <Text style={styles.emptySubtitle}>Completed orders and refunds will appear here.</Text>
        </View>
      ) : (
        <FlatList
          data={payments}
          renderItem={renderPaymentItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={colors.primary}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  listContent: {
    padding: spacing.md,
    gap: spacing.md,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    ...shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    gap: 2,
  },
  amountText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  methodText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    letterSpacing: 0.3,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaItem: {
    gap: 2,
  },
  metaLabel: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '500',
  },
  metaValue: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '600',
  },
  orderLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#eff6ff',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.md,
  },
  orderLinkLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  txnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
    backgroundColor: '#f8fafc',
    padding: spacing.sm,
    borderRadius: radius.md,
  },
  txnLabel: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  txnText: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: '#475569',
    fontWeight: '500',
    marginTop: 1,
  },
  copyBtn: {
    padding: 6,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    marginTop: spacing.sm,
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginTop: spacing.md,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 240,
  },
  primaryBtn: {
    marginTop: spacing.lg,
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: radius.md,
  },
  primaryBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
});
