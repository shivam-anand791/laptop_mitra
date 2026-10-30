import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { MainStackNavigationProp } from '../../navigation/types';
import { useTickets } from '../../hooks/useApi';
import { useAuth } from '../../providers/AuthProvider';
import { colors, spacing, radius, shadows } from '../../theme/tokens';

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  OPEN: { label: 'Open', bg: '#eff6ff', text: '#2563eb' },
  PENDING_CUSTOMER: { label: 'Reply Needed', bg: '#fef2f2', text: '#dc2626' },
  WAITING_FOR_CUSTOMER: { label: 'Reply Needed', bg: '#fef2f2', text: '#dc2626' },
  PENDING_STAFF: { label: 'In Review', bg: '#fef3c7', text: '#d97706' },
  IN_PROGRESS: { label: 'In Progress', bg: '#fef3c7', text: '#d97706' },
  RESOLVED: { label: 'Resolved', bg: '#f0fdf4', text: '#16a34a' },
  CLOSED: { label: 'Closed', bg: '#f1f5f9', text: '#64748b' },
};

export default function TicketListScreen() {
  const navigation = useNavigation<MainStackNavigationProp>();
  const { isAuthenticated } = useAuth();
  const [selectedFilter, setSelectedFilter] = useState<'ALL' | 'ACTIVE' | 'RESOLVED'>('ALL');

  const { data: tickets = [], isLoading, refetch, isRefetching } = useTickets();

  const filteredTickets = tickets.filter((t: any) => {
    if (selectedFilter === 'ACTIVE') {
      return t.status !== 'RESOLVED' && t.status !== 'CLOSED';
    }
    if (selectedFilter === 'RESOLVED') {
      return t.status === 'RESOLVED' || t.status === 'CLOSED';
    }
    return true;
  });

  if (!isAuthenticated) {
    return (
      <View style={styles.centered}>
        <Ionicons name="lock-closed-outline" size={48} color={colors.primary} />
        <Text style={styles.authTitle}>Sign in to view your tickets</Text>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => navigation.navigate('MainTabs')}
        >
          <Text style={styles.primaryButtonText}>Go to Account</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Top Filter Chips & Raise Ticket CTA */}
      <View style={styles.topBar}>
        <View style={styles.filterPillsRow}>
          {(['ALL', 'ACTIVE', 'RESOLVED'] as const).map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[styles.filterPill, selectedFilter === filter && styles.filterPillActive]}
              onPress={() => setSelectedFilter(filter)}
            >
              <Text
                style={[
                  styles.filterPillText,
                  selectedFilter === filter && styles.filterPillTextActive,
                ]}
              >
                {filter === 'ALL' ? 'All Tickets' : filter === 'ACTIVE' ? 'Active' : 'Resolved'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={styles.newTicketBtn}
          onPress={() => navigation.navigate('GuidedSupportFlow', {})}
        >
          <Ionicons name="add" size={16} color="#fff" />
          <Text style={styles.newTicketBtnText}>New Ticket</Text>
        </TouchableOpacity>
      </View>

      {/* Ticket List */}
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : filteredTickets.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="ticket-outline" size={56} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>No support tickets</Text>
          <Text style={styles.emptySubtitle}>
            {selectedFilter !== 'ALL'
              ? 'No tickets match the selected status filter.'
              : 'Have an issue with your laptop or order? Our support team is ready to help.'}
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => navigation.navigate('GuidedSupportFlow', {})}
          >
            <Text style={styles.primaryButtonText}>Raise Support Ticket</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredTickets}
          keyExtractor={(item: any) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={colors.primary}
            />
          }
          renderItem={({ item }: { item: any }) => {
            const fallbackConfig = { label: 'Open', bg: '#eff6ff', text: '#2563eb' };
            const statusConfig = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.OPEN ?? fallbackConfig;
            const needsCustomerReply = !!item.hasUnread;
            const lastMsg = item.messages?.[item.messages.length - 1];

            return (
              <TouchableOpacity
                style={[styles.ticketCard, needsCustomerReply && styles.ticketCardActionRequired]}
                onPress={() => navigation.navigate('TicketDetail', { ticketId: item.id })}
                activeOpacity={0.7}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.ticketIdRow}>
                    {needsCustomerReply && <View style={styles.unreadDot} />}
                    <Text style={styles.ticketNumber}>
                      #{item.ticketNumber || item.id.slice(-8)}
                    </Text>
                    {item.category && (
                      <View style={styles.categoryPill}>
                        <Text style={styles.categoryPillText}>{item.category}</Text>
                      </View>
                    )}
                  </View>

                  <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
                    <Text style={[styles.statusBadgeText, { color: statusConfig.text }]}>
                      {statusConfig.label}
                    </Text>
                  </View>
                </View>

                <Text style={styles.ticketSubject} numberOfLines={2}>
                  {item.subject}
                </Text>

                {lastMsg && (
                  <Text style={styles.lastMessageText} numberOfLines={2}>
                    <Text style={{ fontWeight: '700' }}>
                      {lastMsg.senderRole === 'CUSTOMER' ? 'You: ' : 'Specialist: '}
                    </Text>
                    {lastMsg.body}
                  </Text>
                )}

                <View style={styles.cardFooter}>
                  <View style={styles.footerLeft}>
                    <Ionicons name="time-outline" size={13} color={colors.textMuted} />
                    <Text style={styles.timestampText}>
                      {new Date(item.updatedAt || item.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>

                  <View style={styles.footerRight}>
                    {item.messages && item.messages.length > 0 && (
                      <View style={styles.messageCount}>
                        <Ionicons name="chatbubble-ellipses-outline" size={13} color={colors.textMuted} />
                        <Text style={styles.messageCountText}>{item.messages.length}</Text>
                      </View>
                    )}
                    <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.pageBg,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.cardBg,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  filterPillsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  filterPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
    backgroundColor: '#f1f5f9',
  },
  filterPillActive: {
    backgroundColor: colors.primary,
  },
  filterPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  filterPillTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  newTicketBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  newTicketBtnText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  listContent: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  ticketCard: {
    backgroundColor: colors.cardBg,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    ...shadows.sm,
  },
  ticketCardActionRequired: {
    borderColor: '#fca5a5',
    backgroundColor: '#fffcfc',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  ticketIdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.danger,
  },
  ticketNumber: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  categoryPill: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  categoryPillText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  ticketSubject: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    lineHeight: 18,
    marginBottom: 4,
  },
  lastMessageText: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
    marginBottom: spacing.xs,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.cardBorderLight,
    paddingTop: spacing.xs,
    marginTop: 4,
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timestampText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  footerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  messageCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  messageCountText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: spacing.sm,
  },
  emptySubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: spacing.lg,
    lineHeight: 18,
  },
  authTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginVertical: spacing.md,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 12,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
});
