import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { MainStackParamList, MainStackNavigationProp } from '../../navigation/types';
import {
  useTicket,
  useAddTicketMessage,
  useReopenTicket,
  useRateTicket,
} from '../../hooks/useApi';
import { colors, spacing, radius, shadows } from '../../theme/tokens';

type TicketDetailRouteProp = RouteProp<MainStackParamList, 'TicketDetail'>;

interface AttachmentItem {
  id: string;
  name: string;
  type: 'image' | 'video';
  sizeBytes: number;
}

export default function TicketDetailScreen() {
  const route = useRoute<TicketDetailRouteProp>();
  const navigation = useNavigation<MainStackNavigationProp>();
  const { ticketId } = route.params;

  const scrollViewRef = useRef<ScrollView>(null);

  // Queries & Mutations
  const { data: ticket, isLoading, refetch } = useTicket(ticketId);
  const addMessageMutation = useAddTicketMessage();
  const reopenMutation = useReopenTicket();
  const rateMutation = useRateTicket();

  // State
  const [replyText, setReplyText] = useState('');
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
  const [isAttachModalOpen, setIsAttachModalOpen] = useState(false);

  // CSAT Rating State
  const [csatScore, setCsatScore] = useState<number>(5);
  const [csatComment, setCsatComment] = useState('');
  const [csatSubmitted, setCsatSubmitted] = useState(false);

  // Scroll to bottom when messages update
  useEffect(() => {
    if (ticket?.messages?.length) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 300);
    }
  }, [ticket?.messages?.length]);

  const handleSendReply = () => {
    if (!replyText.trim()) {
      Alert.alert('Empty Message', 'Please enter a message before sending.');
      return;
    }

    addMessageMutation.mutate(
      {
        ticketId,
        content: replyText.trim(),
        ...(attachments.length > 0 ? { attachmentIds: attachments.map((a) => a.name) } : {}),
      },
      {
        onSuccess: () => {
          setReplyText('');
          setAttachments([]);
          refetch();
        },
        onError: (err: any) => {
          Alert.alert('Send Failed', err?.message || 'Could not send message.');
        },
      },
    );
  };

  const handleReopenTicket = () => {
    Alert.alert(
      'Reopen Ticket',
      'Are you sure you want to reopen this ticket? An agent will be notified immediately.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reopen',
          onPress: () => {
            reopenMutation.mutate(ticketId, {
              onSuccess: () => {
                Alert.alert('Ticket Reopened', 'Our specialist has received your update.');
                refetch();
              },
              onError: (err: any) => {
                Alert.alert('Reopen Failed', err?.message || 'Could not reopen ticket.');
              },
            });
          },
        },
      ],
    );
  };

  const handleSubmitCsat = () => {
    const rateArgs: { ticketId: string; score: number; comment?: string } = {
      ticketId,
      score: csatScore,
    };
    if (csatComment.trim()) {
      rateArgs.comment = csatComment.trim();
    }

    rateMutation.mutate(rateArgs, {
      onSuccess: () => {
        setCsatSubmitted(true);
        Alert.alert('Thank You', 'Your rating has been recorded.');
        refetch();
      },
      onError: (err: any) => {
        Alert.alert('Rating Failed', err?.message || 'Could not submit rating.');
      },
    });
  };

  const handleAddAttachment = (sample: { name: string; type: 'image' | 'video'; sizeBytes: number }) => {
    if (sample.type === 'image' && sample.sizeBytes > 10 * 1024 * 1024) {
      Alert.alert('File Too Large', 'Images must be under 10MB.');
      return;
    }
    if (sample.type === 'video' && sample.sizeBytes > 50 * 1024 * 1024) {
      Alert.alert('File Too Large', 'Videos must be under 50MB.');
      return;
    }

    setAttachments((prev) => [
      ...prev,
      {
        id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        ...sample,
      },
    ]);
    setIsAttachModalOpen(false);
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!ticket) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.danger} />
        <Text style={styles.errorTitle}>Ticket Not Found</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isResolvedOrClosed = ticket.status === 'RESOLVED' || ticket.status === 'CLOSED';
  const resolvedDate = new Date(ticket.resolvedAt || ticket.updatedAt);
  const daysSinceResolved = Math.floor((Date.now() - resolvedDate.getTime()) / (1000 * 60 * 60 * 24));
  const canReopen = isResolvedOrClosed && daysSinceResolved <= 7;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Ticket Header Card */}
      <View style={styles.headerCard}>
        <View style={styles.headerTop}>
          <Text style={styles.ticketNumber}>#{ticket.ticketNumber || ticket.id.slice(-8)}</Text>
          <View
            style={[
              styles.statusChip,
              {
                backgroundColor:
                  ticket.status === 'RESOLVED'
                    ? '#f0fdf4'
                    : ticket.status === 'PENDING_CUSTOMER'
                    ? '#fef2f2'
                    : '#eff6ff',
              },
            ]}
          >
            <Text
              style={[
                styles.statusChipText,
                {
                  color:
                    ticket.status === 'RESOLVED'
                      ? '#16a34a'
                      : ticket.status === 'PENDING_CUSTOMER'
                      ? '#dc2626'
                      : '#2563eb',
                },
              ]}
            >
              {ticket.status === 'PENDING_CUSTOMER' ? 'REPLY NEEDED' : ticket.status}
            </Text>
          </View>
        </View>

        <Text style={styles.ticketSubject}>{ticket.subject}</Text>

        <View style={styles.metaRow}>
          <Text style={styles.metaText}>
            Category: <Text style={{ fontWeight: '700' }}>{ticket.category}</Text>
          </Text>
          {ticket.orderId && (
            <Text style={styles.metaText}>
              • Order #{ticket.orderId.slice(-8)}
            </Text>
          )}
        </View>
      </View>

      {/* Messages Thread */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesScroll}
        contentContainerStyle={styles.messagesContent}
      >
        {ticket.messages?.map((msg: any) => {
          const isCustomer = msg.senderRole === 'CUSTOMER';
          return (
            <View
              key={msg.id}
              style={[
                styles.messageRow,
                isCustomer ? styles.messageRowCustomer : styles.messageRowSpecialist,
              ]}
            >
              {!isCustomer && (
                <View style={styles.specialistAvatar}>
                  <Ionicons name="headset" size={16} color="#fff" />
                </View>
              )}

              <View
                style={[
                  styles.messageBubble,
                  isCustomer ? styles.bubbleCustomer : styles.bubbleSpecialist,
                ]}
              >
                <View style={styles.messageBubbleHeader}>
                  <Text
                    style={[
                      styles.senderName,
                      isCustomer ? styles.senderNameCustomer : styles.senderNameSpecialist,
                    ]}
                  >
                    {isCustomer ? 'You' : 'Mitra Support Specialist'}
                  </Text>
                  <Text
                    style={[
                      styles.messageTime,
                      isCustomer ? styles.messageTimeCustomer : styles.messageTimeSpecialist,
                    ]}
                  >
                    {new Date(msg.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>

                <Text
                  style={[
                    styles.messageBody,
                    isCustomer ? styles.messageBodyCustomer : styles.messageBodySpecialist,
                  ]}
                >
                  {msg.body}
                </Text>

                {/* Attachments preview inside bubble */}
                {msg.attachments && msg.attachments.length > 0 && (
                  <View style={styles.bubbleAttachments}>
                    {msg.attachments.map((att: any) => (
                      <View key={att.id || att} style={styles.bubbleAttachmentChip}>
                        <Ionicons name="document-attach" size={13} color={isCustomer ? '#fff' : colors.primary} />
                        <Text
                          style={[
                            styles.bubbleAttachmentText,
                            { color: isCustomer ? '#fff' : colors.primary },
                          ]}
                          numberOfLines={1}
                        >
                          {att.fileName || att}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </View>
          );
        })}

        {/* 7-DAY REOPEN BANNER */}
        {canReopen && (
          <View style={styles.reopenBanner}>
            <Ionicons name="refresh-circle-outline" size={24} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.reopenTitle}>Issue not fully resolved?</Text>
              <Text style={styles.reopenDesc}>
                You can reopen this ticket within 7 days of resolution.
              </Text>
            </View>
            <TouchableOpacity
              style={styles.reopenButton}
              onPress={handleReopenTicket}
              disabled={reopenMutation.isPending}
            >
              {reopenMutation.isPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.reopenButtonText}>Reopen</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* 5-STAR CSAT RATING CARD */}
        {isResolvedOrClosed && !ticket.csatScore && !ticket.rating && !csatSubmitted && (
          <View style={styles.csatCard}>
            <Text style={styles.csatTitle}>How satisfied are you with the resolution?</Text>
            <Text style={styles.csatSubtitle}>Tap a star to rate your support experience:</Text>

            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => setCsatScore(star)}
                  style={styles.starTouch}
                >
                  <Ionicons
                    name={star <= csatScore ? 'star' : 'star-outline'}
                    size={28}
                    color="#f59e0b"
                  />
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.csatInput}
              placeholder="Leave optional feedback for the specialist..."
              placeholderTextColor={colors.textMuted}
              value={csatComment}
              onChangeText={setCsatComment}
              multiline
            />

            <TouchableOpacity
              style={styles.csatSubmitBtn}
              onPress={handleSubmitCsat}
              disabled={rateMutation.isPending}
            >
              {rateMutation.isPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.csatSubmitBtnText}>Submit Rating</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Already Rated confirmation */}
        {(ticket.csatScore || ticket.rating || csatSubmitted) && (
          <View style={styles.ratedCard}>
            <Ionicons name="checkmark-done-circle" size={20} color={colors.green} />
            <Text style={styles.ratedText}>
              Feedback submitted: {ticket.csatScore || ticket.rating?.score || csatScore} / 5 stars
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Reply Input Dock */}
      {!isResolvedOrClosed ? (
        <View style={styles.inputDock}>
          {attachments.length > 0 && (
            <View style={styles.dockAttachmentsRow}>
              {attachments.map((att) => (
                <View key={att.id} style={styles.dockAttachmentChip}>
                  <Ionicons name="attach" size={12} color={colors.primary} />
                  <Text style={styles.dockAttachmentName} numberOfLines={1}>
                    {att.name}
                  </Text>
                  <TouchableOpacity onPress={() => setAttachments((prev) => prev.filter((a) => a.id !== att.id))}>
                    <Ionicons name="close" size={14} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          <View style={styles.inputRow}>
            <TouchableOpacity
              style={styles.attachBtn}
              onPress={() => setIsAttachModalOpen(true)}
            >
              <Ionicons name="add-circle-outline" size={26} color={colors.textSecondary} />
            </TouchableOpacity>

            <TextInput
              style={styles.dockInput}
              placeholder="Type message to specialist..."
              placeholderTextColor={colors.textMuted}
              value={replyText}
              onChangeText={setReplyText}
              multiline
            />

            <TouchableOpacity
              style={[styles.sendBtn, !replyText.trim() && styles.sendBtnDisabled]}
              onPress={handleSendReply}
              disabled={!replyText.trim() || addMessageMutation.isPending}
            >
              {addMessageMutation.isPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="send" size={18} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.closedFooterBar}>
          <Text style={styles.closedFooterText}>
            This ticket is {ticket.status.toLowerCase()}. You can reopen it above or create a new inquiry.
          </Text>
        </View>
      )}

      {/* Attachment Selection Modal */}
      <Modal visible={isAttachModalOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Attach Media Evidence</Text>
              <TouchableOpacity onPress={() => setIsAttachModalOpen(false)}>
                <Ionicons name="close" size={22} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.modalOption}
              onPress={() =>
                handleAddAttachment({
                  name: `screenshot-${Date.now().toString().slice(-4)}.png`,
                  type: 'image',
                  sizeBytes: 1.8 * 1024 * 1024,
                })
              }
            >
              <Ionicons name="image" size={22} color={colors.primary} />
              <View>
                <Text style={styles.modalOptionTitle}>Screenshot / Device Flaw</Text>
                <Text style={styles.modalOptionSubtitle}>1.8 MB • Validated</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalOption}
              onPress={() =>
                handleAddAttachment({
                  name: `video-recording-${Date.now().toString().slice(-4)}.mp4`,
                  type: 'video',
                  sizeBytes: 14 * 1024 * 1024,
                })
              }
            >
              <Ionicons name="videocam" size={22} color={colors.primary} />
              <View>
                <Text style={styles.modalOptionTitle}>Screen Flickering / Power Clip</Text>
                <Text style={styles.modalOptionSubtitle}>14 MB • 12s duration</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.pageBg,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  headerCard: {
    backgroundColor: colors.cardBg,
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  ticketNumber: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  statusChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  statusChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  ticketSubject: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    lineHeight: 20,
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  messagesScroll: {
    flex: 1,
  },
  messagesContent: {
    padding: spacing.md,
    paddingBottom: 24,
    gap: spacing.md,
  },
  messageRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  messageRowCustomer: {
    justifyContent: 'flex-end',
  },
  messageRowSpecialist: {
    justifyContent: 'flex-start',
  },
  specialistAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  messageBubble: {
    maxWidth: '82%',
    borderRadius: radius.lg,
    padding: spacing.sm,
    ...shadows.sm,
  },
  bubbleCustomer: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  bubbleSpecialist: {
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderBottomLeftRadius: 4,
  },
  messageBubbleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: 4,
  },
  senderName: {
    fontSize: 11,
    fontWeight: '700',
  },
  senderNameCustomer: {
    color: '#fff',
  },
  senderNameSpecialist: {
    color: colors.primary,
  },
  messageTime: {
    fontSize: 10,
  },
  messageTimeCustomer: {
    color: 'rgba(255,255,255,0.7)',
  },
  messageTimeSpecialist: {
    color: colors.textMuted,
  },
  messageBody: {
    fontSize: 13,
    lineHeight: 18,
  },
  messageBodyCustomer: {
    color: '#fff',
  },
  messageBodySpecialist: {
    color: colors.textPrimary,
  },
  bubbleAttachments: {
    marginTop: spacing.xs,
    gap: 4,
  },
  bubbleAttachmentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.06)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  bubbleAttachmentText: {
    fontSize: 11,
    fontWeight: '600',
  },
  reopenBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#eff6ff',
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    marginVertical: spacing.sm,
  },
  reopenTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  reopenDesc: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  reopenButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  reopenButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  csatCard: {
    backgroundColor: colors.cardBg,
    borderRadius: radius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
    marginVertical: spacing.sm,
    ...shadows.sm,
  },
  csatTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  csatSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
    marginBottom: spacing.xs,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: spacing.sm,
  },
  starTouch: {
    padding: 2,
  },
  csatInput: {
    width: '100%',
    backgroundColor: '#f8fafc',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.sm,
    fontSize: 12,
    color: colors.textPrimary,
    minHeight: 60,
    marginBottom: spacing.sm,
  },
  csatSubmitBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: spacing.lg,
  },
  csatSubmitBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  ratedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#f0fdf4',
    borderRadius: radius.lg,
    padding: spacing.sm,
    marginVertical: spacing.xs,
  },
  ratedText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.green,
  },
  inputDock: {
    backgroundColor: colors.cardBg,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    padding: spacing.sm,
  },
  dockAttachmentsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: spacing.xs,
  },
  dockAttachmentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f1f5f9',
    borderRadius: radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  dockAttachmentName: {
    fontSize: 10,
    color: colors.textPrimary,
    maxWidth: 120,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  attachBtn: {
    padding: 4,
  },
  dockInput: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    fontSize: 13,
    color: colors.textPrimary,
    maxHeight: 100,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },
  closedFooterBar: {
    backgroundColor: '#f8fafc',
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    alignItems: 'center',
  },
  closedFooterText: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.cardBg,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: '#f8fafc',
    borderRadius: radius.lg,
    marginBottom: spacing.sm,
  },
  modalOptionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  modalOptionSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginVertical: spacing.sm,
  },
  backBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  backBtnText: {
    color: '#fff',
    fontWeight: '700',
  },
});
