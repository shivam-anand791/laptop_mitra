import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Share, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useProfile } from '../../hooks/useApi';

const TIER_CONFIG = {
  BASIC: { label: 'Basic', color: '#64748b', bgColor: '#f1f5f9', icon: 'star-outline' as const },
  GOLD: { label: 'Gold', color: '#d97706', bgColor: '#fef3c7', icon: 'star' as const },
  PLATINUM: { label: 'Platinum', color: '#7c3aed', bgColor: '#ede9fe', icon: 'star' as const },
};

export default function MitraDashboardScreen() {
  const { data: profile, isLoading } = useProfile();

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  const tier = (profile?.referralTier as keyof typeof TIER_CONFIG) || 'BASIC';
  const tierConfig = TIER_CONFIG[tier] || TIER_CONFIG.BASIC;
  const earnings = Number(profile?.referralEarnings ?? 0);
  const referralCode = profile?.referralCode || '';
  const referredCount = profile?.referralLinkClickedCount ?? 0;

  const handleShareCode = async () => {
    try {
      await Share.share({
        message: `Hey! Use my referral code *${referralCode}* on LaptopMitra to get exclusive deals on certified pre-owned laptops. Shop now at LaptopMitra!`,
        title: 'Share Referral Code',
      });
    } catch {}
  };

  const handleShareLink = async () => {
    try {
      const link = `https://laptopmitra.com/ref/${referralCode}`;
      await Share.share({
        message: `Check out LaptopMitra for certified pre-owned laptops! Use my referral link: ${link}`,
        title: 'Share LaptopMitra',
      });
    } catch {}
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Referral Code Card */}
      <View style={styles.codeCard}>
        <Text style={styles.codeLabel}>Your Referral Code</Text>
        <View style={styles.codeRow}>
          <View style={styles.codeBox}>
            <Text style={styles.codeText}>{referralCode}</Text>
          </View>
          <TouchableOpacity style={styles.shareButton} onPress={handleShareCode} activeOpacity={0.7}>
            <Ionicons name="share-social-outline" size={20} color="#fff" />
            <Text style={styles.shareButtonText}>Share Code</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.linkButton} onPress={handleShareLink} activeOpacity={0.7}>
          <Ionicons name="link-outline" size={16} color="#2563eb" />
          <Text style={styles.linkButtonText}>Share Referral Link</Text>
        </TouchableOpacity>
      </View>

      {/* Tier Badge */}
      <View style={[styles.tierCard, { backgroundColor: tierConfig.bgColor }]}>
        <Ionicons name={tierConfig.icon} size={28} color={tierConfig.color} />
        <View style={styles.tierInfo}>
          <Text style={[styles.tierLabel, { color: tierConfig.color }]}>Mitra Tier</Text>
          <Text style={[styles.tierName, { color: tierConfig.color }]}>{tierConfig.label}</Text>
        </View>
      </View>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>₹{earnings.toLocaleString('en-IN')}</Text>
          <Text style={styles.statLabel}>Total Earned</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{referredCount}</Text>
          <Text style={styles.statLabel}>Referral Clicks</Text>
        </View>
      </View>

      {/* How It Works */}
      <View style={styles.howSection}>
        <Text style={styles.howTitle}>How It Works</Text>
        <View style={styles.howItem}>
          <View style={[styles.howStep, { backgroundColor: '#eff6ff' }]}>
            <Text style={[styles.howStepText, { color: '#2563eb' }]}>1</Text>
          </View>
          <View style={styles.howContent}>
            <Text style={styles.howItemTitle}>Share Your Code</Text>
            <Text style={styles.howItemDesc}>Send your referral code to friends via WhatsApp, SMS, or any app</Text>
          </View>
        </View>
        <View style={styles.howItem}>
          <View style={[styles.howStep, { backgroundColor: '#f0fdf4' }]}>
            <Text style={[styles.howStepText, { color: '#22c55e' }]}>2</Text>
          </View>
          <View style={styles.howContent}>
            <Text style={styles.howItemTitle}>Friend Shops</Text>
            <Text style={styles.howItemDesc}>Your friend uses your code at checkout on LaptopMitra</Text>
          </View>
        </View>
        <View style={styles.howItem}>
          <View style={[styles.howStep, { backgroundColor: '#fef3c7' }]}>
            <Text style={[styles.howStepText, { color: '#d97706' }]}>3</Text>
          </View>
          <View style={styles.howContent}>
            <Text style={styles.howItemTitle}>Earn Rewards</Text>
            <Text style={styles.howItemDesc}>Get commission on every purchase your referrals make</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fb',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f7fb',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  codeCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  codeLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  codeBox: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
  },
  codeText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1e293b',
    letterSpacing: 2,
    textAlign: 'center',
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 6,
  },
  shareButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  linkButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2563eb',
  },
  tierCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 16,
    gap: 14,
  },
  tierInfo: {
    flex: 1,
  },
  tierLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tierName: {
    fontSize: 20,
    fontWeight: '800',
    marginTop: 2,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748b',
    marginTop: 4,
  },
  howSection: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  howTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 16,
  },
  howItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    marginBottom: 16,
  },
  howStep: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  howStepText: {
    fontSize: 14,
    fontWeight: '700',
  },
  howContent: {
    flex: 1,
  },
  howItemTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
  },
  howItemDesc: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
    lineHeight: 18,
  },
});
