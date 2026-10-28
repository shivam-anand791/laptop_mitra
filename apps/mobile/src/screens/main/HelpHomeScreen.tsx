import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Linking,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { MainStackNavigationProp } from '../../navigation/types';
import {
  useHelpCategories,
  useHelpArticles,
  useTickets,
} from '../../hooks/useApi';
import { useAuth } from '../../providers/AuthProvider';
import { colors, spacing, radius, shadows, typography } from '../../theme/tokens';
import { SUPPORT_PHONE, SUPPORT_PHONE_DISPLAY, WHATSAPP_NUMBER } from '../../config';

const CATEGORY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  ORDER_DELIVERY: 'cube-outline',
  RETURN_REFUND: 'repeat-outline',
  WARRANTY_REPAIR: 'shield-checkmark-outline',
  PAYMENT: 'card-outline',
  BUYBACK: 'swap-horizontal-outline',
  RENT_LEASE: 'business-outline',
  ACCOUNT: 'person-outline',
  OTHER: 'help-circle-outline',
};

export default function HelpHomeScreen() {
  const navigation = useNavigation<MainStackNavigationProp>();
  const { isAuthenticated } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');

  const {
    data: categories = [],
    isLoading: loadingCategories,
    refetch: refetchCategories,
  } = useHelpCategories();

  const queryParams = searchQuery.trim() ? { search: searchQuery.trim() } : undefined;
  const {
    data: articles = [],
    isLoading: loadingArticles,
    refetch: refetchArticles,
  } = useHelpArticles(queryParams);

  const { data: tickets = [] } = useTickets();
  const openTicketsCount = tickets.filter(
    (t: any) => t.status !== 'RESOLVED' && t.status !== 'CLOSED',
  ).length;

  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchCategories(), refetchArticles()]);
    setRefreshing(false);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
      }
    >
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={colors.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search questions, warranty, returns..."
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Guided Flow Banner */}
      <TouchableOpacity
        style={styles.guidedCard}
        onPress={() => navigation.navigate('GuidedSupportFlow', {})}
        activeOpacity={0.85}
      >
        <View style={styles.guidedIconWrapper}>
          <Ionicons name="sparkles" size={24} color="#fff" />
        </View>
        <View style={styles.guidedInfo}>
          <View style={styles.guidedBadgeRow}>
            <Text style={styles.guidedBadge}>INSTANT RESOLUTION</Text>
          </View>
          <Text style={styles.guidedTitle}>Need Help With An Order?</Text>
          <Text style={styles.guidedDesc}>
            Track packages, initiate 7-day returns, verify warranty, or raise a priority ticket.
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.primary} />
      </TouchableOpacity>

      {/* Open Tickets Shortcut */}
      {isAuthenticated && (
        <TouchableOpacity
          style={styles.ticketsShortcutCard}
          onPress={() => navigation.navigate('TicketList')}
          activeOpacity={0.8}
        >
          <View style={styles.ticketsShortcutLeft}>
            <View style={styles.ticketIconBg}>
              <Ionicons name="chatbubbles-outline" size={20} color={colors.primary} />
            </View>
            <View>
              <Text style={styles.ticketsShortcutTitle}>My Support Tickets</Text>
              <Text style={styles.ticketsShortcutDesc}>
                {openTicketsCount > 0
                  ? `${openTicketsCount} active ticket${openTicketsCount > 1 ? 's' : ''} in progress`
                  : 'View past ticket history and resolutions'}
              </Text>
            </View>
          </View>
          {openTicketsCount > 0 ? (
            <View style={styles.unreadCountBadge}>
              <Text style={styles.unreadCountText}>{openTicketsCount}</Text>
            </View>
          ) : (
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          )}
        </TouchableOpacity>
      )}

      {/* Emergency Contact Actions */}
      <View style={styles.contactRow}>
        <TouchableOpacity
          style={[styles.contactButton, styles.callButton]}
          onPress={() => Linking.openURL(`tel:${SUPPORT_PHONE}`)}
          activeOpacity={0.8}
        >
          <Ionicons name="call" size={18} color="#fff" />
          <View>
            <Text style={styles.contactBtnTitle}>Call Specialist</Text>
            <Text style={styles.contactBtnSubtitle}>{SUPPORT_PHONE_DISPLAY}</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.contactButton, styles.whatsappButton]}
          onPress={() =>
            Linking.openURL(
              `https://wa.me/${WHATSAPP_NUMBER}?text=Hi%20LaptopMitra,%20I%20need%20support%20with%20my%20laptop`,
            )
          }
          activeOpacity={0.8}
        >
          <Ionicons name="logo-whatsapp" size={18} color="#fff" />
          <View>
            <Text style={styles.contactBtnTitle}>WhatsApp</Text>
            <Text style={styles.contactBtnSubtitle}>Quick chat response</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Help Categories Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Browse By Category</Text>
        {loadingCategories ? (
          <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 16 }} />
        ) : (
          <View style={styles.categoriesGrid}>
            {categories.map((cat: any) => {
              const iconName = CATEGORY_ICONS[cat.slug] || CATEGORY_ICONS.OTHER;
              return (
                <TouchableOpacity
                  key={cat.id || cat.slug}
                  style={styles.categoryCard}
                  onPress={() => setSearchQuery(cat.title || cat.name || '')}
                  activeOpacity={0.7}
                >
                  <View style={styles.categoryIconCircle}>
                    <Ionicons name={iconName} size={22} color={colors.primary} />
                  </View>
                  <Text style={styles.categoryName} numberOfLines={2}>
                    {cat.title || cat.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>

      {/* Articles / FAQs Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>
            {searchQuery ? `Search Results (${articles.length})` : 'Popular Support Articles'}
          </Text>
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Text style={styles.clearSearchLink}>Clear</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {loadingArticles ? (
          <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 20 }} />
        ) : articles.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={36} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No articles found</Text>
            <Text style={styles.emptySubtitle}>Try searching with different keywords or launch Guided Support.</Text>
          </View>
        ) : (
          <View style={styles.articlesList}>
            {articles.map((art: any) => (
              <TouchableOpacity
                key={art.id || art.slug}
                style={styles.articleItem}
                onPress={() =>
                  navigation.navigate('HelpArticleDetail', {
                    slug: art.slug,
                    title: art.title,
                  })
                }
                activeOpacity={0.7}
              >
                <View style={styles.articleInfo}>
                  {art.category?.name && (
                    <Text style={styles.articleCategoryBadge}>{art.category.name}</Text>
                  )}
                  <Text style={styles.articleTitle}>{art.title}</Text>
                  {art.summary && (
                    <Text style={styles.articleSummary} numberOfLines={2}>
                      {art.summary}
                    </Text>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            ))}
          </View>
        )}
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBg,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.body.fontSize,
    color: colors.textPrimary,
    padding: 0,
  },
  guidedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    borderWidth: 1.5,
    borderColor: '#bfdbfe',
    borderRadius: radius.xl,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  guidedIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  guidedInfo: {
    flex: 1,
  },
  guidedBadgeRow: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  guidedBadge: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.primary,
    backgroundColor: '#dbeafe',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    letterSpacing: 0.5,
  },
  guidedTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 2,
  },
  guidedDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  ticketsShortcutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.cardBg,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  ticketsShortcutLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  ticketIconBg: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ticketsShortcutTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  ticketsShortcutDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 1,
  },
  unreadCountBadge: {
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  unreadCountText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  contactRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  contactButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: radius.lg,
    gap: spacing.xs,
  },
  callButton: {
    backgroundColor: colors.navy,
  },
  whatsappButton: {
    backgroundColor: '#16a34a',
  },
  contactBtnTitle: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  contactBtnSubtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 10,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  clearSearchLink: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  categoryCard: {
    width: '48%',
    backgroundColor: colors.cardBg,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
    ...shadows.sm,
  },
  categoryIconCircle: {
    width: 42,
    height: 42,
    borderRadius: radius.full,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  categoryName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  articlesList: {
    backgroundColor: colors.cardBg,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    overflow: 'hidden',
    ...shadows.sm,
  },
  articleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorderLight,
  },
  articleInfo: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  articleCategoryBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  articleTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    lineHeight: 18,
  },
  articleSummary: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
    lineHeight: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: colors.cardBg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: spacing.xs,
  },
  emptySubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
  },
});
