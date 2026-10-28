import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { MainStackParamList, MainStackNavigationProp } from '../../navigation/types';
import { useHelpArticle, useVoteHelpArticle } from '../../hooks/useApi';
import { colors, spacing, radius, shadows } from '../../theme/tokens';

type HelpArticleDetailRouteProp = RouteProp<MainStackParamList, 'HelpArticleDetail'>;

export default function HelpArticleDetailScreen() {
  const route = useRoute<HelpArticleDetailRouteProp>();
  const navigation = useNavigation<MainStackNavigationProp>();
  const { slug } = route.params;

  const { data: article, isLoading, error } = useHelpArticle(slug);
  const voteMutation = useVoteHelpArticle();

  const [hasVoted, setHasVoted] = useState<boolean>(false);
  const [helpfulCount, setHelpfulCount] = useState<number | null>(null);

  const handleVote = (helpful: boolean) => {
    if (!article || hasVoted) return;

    voteMutation.mutate(
      { id: article.id, helpful },
      {
        onSuccess: (res: any) => {
          setHasVoted(true);
          if (res?.helpfulCount !== undefined) {
            setHelpfulCount(res.helpfulCount);
          }
          Alert.alert('Feedback Recorded', 'Thank you for helping us improve our support knowledge base.');
        },
        onError: (err: any) => {
          Alert.alert('Error', err?.message || 'Failed to submit feedback');
        },
      },
    );
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error || !article) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.danger} />
        <Text style={styles.errorTitle}>Article Not Found</Text>
        <Text style={styles.errorDesc}>The requested support article could not be loaded.</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Return to Help Center</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const currentHelpful = helpfulCount !== null ? helpfulCount : (article.helpfulCount ?? 0);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header Info */}
      <View style={styles.header}>
        {(article.category?.title || article.category?.name) && (
          <Text style={styles.categoryBadge}>{article.category.title || article.category.name}</Text>
        )}
        <Text style={styles.title}>{article.title}</Text>
        <View style={styles.metaRow}>
          <Ionicons name="time-outline" size={14} color={colors.textMuted} />
          <Text style={styles.metaText}>Updated recently</Text>
          <Text style={styles.metaDot}>•</Text>
          <Ionicons name="thumbs-up-outline" size={14} color={colors.textMuted} />
          <Text style={styles.metaText}>{currentHelpful} found this helpful</Text>
        </View>
      </View>

      {/* Article Content */}
      <View style={styles.contentCard}>
        <Text style={styles.bodyText}>{article.content}</Text>
      </View>

      {/* Was this helpful feedback block */}
      <View style={styles.feedbackCard}>
        <Text style={styles.feedbackTitle}>Was this article helpful?</Text>
        {hasVoted ? (
          <View style={styles.votedNotice}>
            <Ionicons name="checkmark-circle" size={18} color={colors.green} />
            <Text style={styles.votedText}>Thanks for your feedback!</Text>
          </View>
        ) : (
          <View style={styles.voteButtonsRow}>
            <TouchableOpacity
              style={[styles.voteButton, styles.voteYes]}
              onPress={() => handleVote(true)}
              disabled={voteMutation.isPending}
              activeOpacity={0.7}
            >
              <Ionicons name="thumbs-up" size={16} color={colors.primary} />
              <Text style={styles.voteYesText}>Yes, it solved my issue</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.voteButton, styles.voteNo]}
              onPress={() => handleVote(false)}
              disabled={voteMutation.isPending}
              activeOpacity={0.7}
            >
              <Ionicons name="thumbs-down" size={16} color={colors.textSecondary} />
              <Text style={styles.voteNoText}>No</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Still Need Help CTA */}
      <View style={styles.stillNeedHelpCard}>
        <Ionicons name="headset" size={28} color={colors.primary} />
        <View style={styles.stillNeedHelpContent}>
          <Text style={styles.stillNeedHelpTitle}>Still need personalized assistance?</Text>
          <Text style={styles.stillNeedHelpDesc}>
            Launch our guided flow to check return eligibility or raise a priority ticket with a technician.
          </Text>
          <TouchableOpacity
            style={styles.guidedCtaButton}
            onPress={() => navigation.navigate('GuidedSupportFlow', {})}
            activeOpacity={0.8}
          >
            <Text style={styles.guidedCtaText}>Start Guided Support</Text>
            <Ionicons name="arrow-forward" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.pageBg,
  },
  content: {
    padding: spacing.md,
    paddingBottom: 40,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: colors.pageBg,
  },
  header: {
    marginBottom: spacing.md,
  },
  categoryBadge: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primary,
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
    alignSelf: 'flex-start',
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
    lineHeight: 26,
    marginBottom: spacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  metaDot: {
    color: colors.textMuted,
    marginHorizontal: 4,
  },
  contentCard: {
    backgroundColor: colors.cardBg,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  bodyText: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.textPrimary,
  },
  feedbackCard: {
    backgroundColor: colors.cardBg,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  feedbackTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  voteButtonsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  voteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  voteYes: {
    borderColor: colors.primary,
    backgroundColor: '#eff6ff',
  },
  voteYesText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  voteNo: {
    borderColor: colors.cardBorder,
    backgroundColor: '#f8fafc',
  },
  voteNoText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  votedNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  votedText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.green,
  },
  stillNeedHelpCard: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderRadius: radius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    gap: spacing.sm,
  },
  stillNeedHelpContent: {
    flex: 1,
  },
  stillNeedHelpTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  stillNeedHelpDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    marginVertical: 4,
    lineHeight: 16,
  },
  guidedCtaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.md,
    alignSelf: 'flex-start',
    gap: 6,
    marginTop: 4,
  },
  guidedCtaText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: spacing.sm,
  },
  errorDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    marginVertical: spacing.xs,
  },
  backButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    marginTop: spacing.sm,
  },
  backButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
});
