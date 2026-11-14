import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  RefreshControl,
  Linking,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import {
  useReferralStats,
  usePayoutDetails,
  useSavePayoutDetails,
  useRequestWithdrawal,
  useProfile,
} from '../../hooks/useApi';
import { useAuth } from '../../providers/AuthProvider';
import { MainStackNavigationProp } from '../../navigation/types';
import { formatIndianRupees } from '../../utils/account-helpers';
import { colors, radius, spacing, shadows } from '../../theme/tokens';

const TIER_CONFIG = {
  BASIC: { label: 'Basic Mitra', color: '#64748b', bgColor: '#f1f5f9', icon: 'star-outline' as const },
  GOLD: { label: 'Gold Mitra', color: '#d97706', bgColor: '#fef3c7', icon: 'star' as const },
  PLATINUM: { label: 'Platinum Mitra', color: '#7c3aed', bgColor: '#ede9fe', icon: 'star' as const },
};

type DashboardTab = 'overview' | 'payouts' | 'history';

const MINIMUM_WITHDRAWAL = 500;

export default function MitraDashboardScreen() {
  const navigation = useNavigation<MainStackNavigationProp>();
  const { isAuthenticated, isGuest } = useAuth();
  const { data: profile } = useProfile();
  const {
    data: stats,
    isLoading: statsLoading,
    refetch: refetchStats,
    isRefetching: isRefetchingStats,
  } = useReferralStats();

  const {
    data: payoutDetails,
    isLoading: payoutLoading,
    refetch: refetchPayout,
  } = usePayoutDetails();

  const savePayoutMutation = useSavePayoutDetails();
  const withdrawMutation = useRequestWithdrawal();

  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');

  // Payout Details Form State
  const [isEditingPayout, setIsEditingPayout] = useState(false);
  const [payoutMethod, setPayoutMethod] = useState<'bank' | 'upi'>('bank');
  const [bankName, setBankName] = useState('');
  const [accountHolderName, setAccountHolderName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [upiId, setUpiId] = useState('');

  // Withdrawal Modal State
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('500');

  useFocusEffect(
    useCallback(() => {
      void refetchStats();
      void refetchPayout();
    }, [refetchStats, refetchPayout]),
  );

  const handleRefresh = async () => {
    await Promise.all([refetchStats(), refetchPayout()]);
  };

  const referralCode = stats?.referralCode || profile?.referralCode || '';
  const tierKey = (stats?.referralTier || profile?.referralTier || 'BASIC') as keyof typeof TIER_CONFIG;
  const tierConfig = TIER_CONFIG[tierKey] || TIER_CONFIG.BASIC;

  const availableBalance = Number(stats?.availableBalance ?? 0);
  const reservedEarnings = Number(stats?.referralReserved ?? 0);
  const totalWithdrawn = Number(stats?.referralWithdrawn ?? 0);
  const totalEarned = Number(stats?.referralEarnings ?? profile?.referralEarnings ?? 0);
  const referredCount = Number(stats?.referredUsersCount ?? 0);
  const clickCount = Number(stats?.referralLinkClickedCount ?? profile?.referralLinkClickedCount ?? 0);
  const payoutHistory = Array.isArray(stats?.payoutHistory) ? stats.payoutHistory : [];

  const handleShareCode = async () => {
    try {
      await Share.share({
        message: `Hey! Use my referral code *${referralCode}* on LaptopMitra to get flat ₹500 instant discount on certified enterprise refurbished laptops! Shop at: https://laptopmitra.in`,
        title: 'Share Referral Code',
      });
    } catch {
      // User cancelled share
    }
  };

  const handleShareWhatsApp = () => {
    const text = `Hey! Check out certified refurbished laptops on LaptopMitra with 32-point inspection and 1-year warranty. Use my Mitra code *${referralCode}* to get ₹500 discount!\nhttps://laptopmitra.in`;
    Linking.openURL(`https://wa.me/?text=${encodeURIComponent(text)}`).catch(() => {
      Alert.alert('Unable to open WhatsApp', 'Please ensure WhatsApp is installed.');
    });
  };

  const handleSavePayout = () => {
    if (payoutMethod === 'bank') {
      if (!bankName.trim()) {
        Alert.alert('Validation Error', 'Bank name is required.');
        return;
      }
      if (!accountHolderName.trim()) {
        Alert.alert('Validation Error', 'Account holder name is required.');
        return;
      }
      if (!accountNumber.trim() || accountNumber.trim().length < 8) {
        Alert.alert('Validation Error', 'Please enter a valid bank account number.');
        return;
      }
      if (!ifscCode.trim() || ifscCode.trim().length !== 11) {
        Alert.alert('Validation Error', 'IFSC code must be exactly 11 characters (e.g. SBIN0001234).');
        return;
      }

      savePayoutMutation.mutate(
        {
          bankName: bankName.trim(),
          accountHolderName: accountHolderName.trim(),
          accountNumber: accountNumber.trim(),
          ifscCode: ifscCode.trim().toUpperCase(),
        },
        {
          onSuccess: () => {
            setIsEditingPayout(false);
            Alert.alert('Payout Details Saved', 'Your bank account has been securely linked.');
          },
          onError: (err: any) => {
            Alert.alert('Save Failed', err?.message || 'Could not save bank details.');
          },
        },
      );
    } else {
      const trimmedUpi = upiId.trim();
      if (!trimmedUpi || !trimmedUpi.includes('@')) {
        Alert.alert('Validation Error', 'Please enter a valid UPI ID (e.g. name@okbank).');
        return;
      }

      savePayoutMutation.mutate(
        {
          upiId: trimmedUpi,
        },
        {
          onSuccess: () => {
            setIsEditingPayout(false);
            Alert.alert('Payout Details Saved', 'Your UPI ID has been securely linked.');
          },
          onError: (err: any) => {
            Alert.alert('Save Failed', err?.message || 'Could not save UPI details.');
          },
        },
      );
    }
  };

  const handleOpenWithdrawModal = () => {
    if (!payoutDetails?.configured) {
      Alert.alert(
        'Payout Details Required',
        'Please configure your bank account or UPI ID first before requesting a withdrawal.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Configure', onPress: () => setActiveTab('payouts') },
        ],
      );
      return;
    }

    if (availableBalance < MINIMUM_WITHDRAWAL) {
      Alert.alert(
        'Minimum Balance Not Met',
        `A minimum available balance of ₹${MINIMUM_WITHDRAWAL} is required to request a payout. Your available balance is ${formatIndianRupees(availableBalance)}.`,
      );
      return;
    }

    setWithdrawAmount(String(Math.min(availableBalance, 1000)));
    setIsWithdrawModalOpen(true);
  };

  const handleConfirmWithdrawal = () => {
    const amountNum = parseFloat(withdrawAmount);
    if (isNaN(amountNum) || amountNum < MINIMUM_WITHDRAWAL) {
      Alert.alert('Invalid Amount', `Minimum withdrawal amount is ₹${MINIMUM_WITHDRAWAL}.`);
      return;
    }
    if (amountNum > availableBalance) {
      Alert.alert('Insufficient Balance', `You cannot withdraw more than your available balance (${formatIndianRupees(availableBalance)}).`);
      return;
    }

    withdrawMutation.mutate(amountNum, {
      onSuccess: () => {
        setIsWithdrawModalOpen(false);
        Alert.alert(
          'Withdrawal Submitted',
          `Your payout request for ${formatIndianRupees(amountNum)} has been submitted. Funds will be credited after admin review within 2-3 business days.`,
        );
      },
      onError: (err: any) => {
        Alert.alert('Withdrawal Failed', err?.message || 'Could not process withdrawal request.');
      },
    });
  };

  if (!isAuthenticated || isGuest) {
    return (
      <View style={styles.centered}>
        <Ionicons name="wallet-outline" size={56} color="#94a3b8" />
        <Text style={styles.emptyTitle}>Sign in to Mitra Affiliate</Text>
        <Text style={styles.emptySubtitle}>
          Earn commission rewards on every laptop purchase made using your referral code.
        </Text>
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

  if (statsLoading && !stats) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading Mitra Affiliate data...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Top Navigation Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'overview' && styles.tabItemActive]}
          onPress={() => setActiveTab('overview')}
        >
          <Text style={[styles.tabItemText, activeTab === 'overview' && styles.tabItemTextActive]}>
            Overview
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'payouts' && styles.tabItemActive]}
          onPress={() => setActiveTab('payouts')}
        >
          <Text style={[styles.tabItemText, activeTab === 'payouts' && styles.tabItemTextActive]}>
            Bank / UPI Setup
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'history' && styles.tabItemActive]}
          onPress={() => setActiveTab('history')}
        >
          <Text style={[styles.tabItemText, activeTab === 'history' && styles.tabItemTextActive]}>
            Payouts ({payoutHistory.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefetchingStats}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'overview' && (
          <>
            {/* Referral Code Share Card */}
            <View style={styles.codeCard}>
              <Text style={styles.codeLabel}>Your Mitra Referral Code</Text>
              <View style={styles.codeRow}>
                <View style={styles.codeBox}>
                  <Text style={styles.codeText}>{referralCode || 'MITRA'}</Text>
                </View>
                <TouchableOpacity style={styles.shareButton} onPress={handleShareCode} activeOpacity={0.7}>
                  <Ionicons name="share-social-outline" size={18} color="#fff" />
                  <Text style={styles.shareButtonText}>Share</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.whatsAppButton}
                onPress={handleShareWhatsApp}
                activeOpacity={0.8}
              >
                <Ionicons name="logo-whatsapp" size={18} color="#16a34a" />
                <Text style={styles.whatsAppButtonText}>Share on WhatsApp</Text>
              </TouchableOpacity>
            </View>

            {/* Tier Badge Card */}
            <View style={[styles.tierCard, { backgroundColor: tierConfig.bgColor }]}>
              <Ionicons name={tierConfig.icon} size={28} color={tierConfig.color} />
              <View style={styles.tierInfo}>
                <Text style={[styles.tierLabel, { color: tierConfig.color }]}>Current Affiliate Level</Text>
                <Text style={[styles.tierName, { color: tierConfig.color }]}>{tierConfig.label}</Text>
              </View>
            </View>

            {/* Available Balance & Withdraw Card */}
            <View style={styles.balanceCard}>
              <View style={styles.balanceHeader}>
                <View>
                  <Text style={styles.balanceLabel}>Available for Withdrawal</Text>
                  <Text style={styles.balanceAmount}>{formatIndianRupees(availableBalance)}</Text>
                </View>
                <TouchableOpacity
                  style={[
                    styles.withdrawBtn,
                    availableBalance < MINIMUM_WITHDRAWAL && styles.withdrawBtnDisabled,
                  ]}
                  onPress={handleOpenWithdrawModal}
                  activeOpacity={0.8}
                >
                  <Ionicons name="arrow-up-circle-outline" size={18} color="#fff" />
                  <Text style={styles.withdrawBtnText}>Withdraw</Text>
                </TouchableOpacity>
              </View>

              {reservedEarnings > 0 ? (
                <View style={styles.reservedRow}>
                  <Ionicons name="time-outline" size={14} color="#d97706" />
                  <Text style={styles.reservedText}>
                    {formatIndianRupees(reservedEarnings)} pending return window completion
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Stats Grid */}
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{formatIndianRupees(totalEarned)}</Text>
                <Text style={styles.statLabel}>Lifetime Earned</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{formatIndianRupees(totalWithdrawn)}</Text>
                <Text style={styles.statLabel}>Total Withdrawn</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{referredCount}</Text>
                <Text style={styles.statLabel}>Successful Orders</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{clickCount}</Text>
                <Text style={styles.statLabel}>Link Clicks</Text>
              </View>
            </View>

            {/* How Commission Works */}
            <View style={styles.infoCard}>
              <Text style={styles.infoCardTitle}>How Mitra Rewards Work</Text>
              <View style={styles.infoStep}>
                <View style={styles.stepCircle}><Text style={styles.stepNum}>1</Text></View>
                <Text style={styles.stepText}>Share your code with friends or business clients.</Text>
              </View>
              <View style={styles.infoStep}>
                <View style={styles.stepCircle}><Text style={styles.stepNum}>2</Text></View>
                <Text style={styles.stepText}>They receive instant flat ₹500 discount on their purchase.</Text>
              </View>
              <View style={styles.infoStep}>
                <View style={styles.stepCircle}><Text style={styles.stepNum}>3</Text></View>
                <Text style={styles.stepText}>You earn commission, withdrawable to your bank or UPI.</Text>
              </View>
            </View>
          </>
        )}

        {activeTab === 'payouts' && (
          <View style={styles.tabContent}>
            {/* Configured Status Banner */}
            <View style={styles.payoutStatusCard}>
              <View style={styles.payoutStatusHeader}>
                <Ionicons
                  name={payoutDetails?.configured ? 'checkmark-circle' : 'alert-circle'}
                  size={24}
                  color={payoutDetails?.configured ? '#16a34a' : '#d97706'}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.payoutStatusTitle}>
                    {payoutDetails?.configured ? 'Payout Details Linked' : 'No Payout Method Linked'}
                  </Text>
                  <Text style={styles.payoutStatusSubtitle}>
                    {payoutDetails?.configured
                      ? 'Earnings are credited directly to your saved destination.'
                      : 'Please enter your bank account or UPI ID to enable payouts.'}
                  </Text>
                </View>
              </View>

              {payoutLoading && !payoutDetails ? (
                <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                  <ActivityIndicator size="small" color={colors.primary} />
                </View>
              ) : null}

              {payoutDetails?.configured && !isEditingPayout ? (
                <View style={styles.configuredDetailsBox}>
                  {payoutDetails.bankName ? (
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Bank Name</Text>
                      <Text style={styles.detailValue}>{payoutDetails.bankName}</Text>
                    </View>
                  ) : null}

                  {payoutDetails.accountNumberMasked ? (
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Account Number</Text>
                      <Text style={styles.detailValue}>{payoutDetails.accountNumberMasked}</Text>
                    </View>
                  ) : null}

                  {payoutDetails.ifscCodeMasked ? (
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>IFSC Code</Text>
                      <Text style={styles.detailValue}>{payoutDetails.ifscCodeMasked}</Text>
                    </View>
                  ) : null}

                  {payoutDetails.upiIdMasked ? (
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Linked UPI ID</Text>
                      <Text style={styles.detailValue}>{payoutDetails.upiIdMasked}</Text>
                    </View>
                  ) : null}

                  <TouchableOpacity
                    style={styles.editPayoutBtn}
                    onPress={() => setIsEditingPayout(true)}
                  >
                    <Ionicons name="pencil-outline" size={15} color={colors.primary} />
                    <Text style={styles.editPayoutBtnText}>Update Payout Details</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>

            {/* Payout Edit Form */}
            {(!payoutDetails?.configured || isEditingPayout) && (
              <View style={styles.formCard}>
                <Text style={styles.formCardTitle}>Link Payout Destination</Text>

                {/* Method Switcher */}
                <View style={styles.methodSwitcher}>
                  <TouchableOpacity
                    style={[styles.methodBtn, payoutMethod === 'bank' && styles.methodBtnActive]}
                    onPress={() => setPayoutMethod('bank')}
                  >
                    <Ionicons
                      name="business-outline"
                      size={16}
                      color={payoutMethod === 'bank' ? '#fff' : '#64748b'}
                    />
                    <Text style={[styles.methodBtnText, payoutMethod === 'bank' && styles.methodBtnTextActive]}>
                      Bank Account
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.methodBtn, payoutMethod === 'upi' && styles.methodBtnActive]}
                    onPress={() => setPayoutMethod('upi')}
                  >
                    <Ionicons
                      name="phone-portrait-outline"
                      size={16}
                      color={payoutMethod === 'upi' ? '#fff' : '#64748b'}
                    />
                    <Text style={[styles.methodBtnText, payoutMethod === 'upi' && styles.methodBtnTextActive]}>
                      UPI ID
                    </Text>
                  </TouchableOpacity>
                </View>

                {payoutMethod === 'bank' ? (
                  <View style={styles.inputsWrap}>
                    <Text style={styles.inputLabel}>Bank Name *</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. State Bank of India, HDFC Bank"
                      value={bankName}
                      onChangeText={setBankName}
                    />

                    <Text style={styles.inputLabel}>Account Holder Name *</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Full name as registered on passbook"
                      value={accountHolderName}
                      onChangeText={setAccountHolderName}
                    />

                    <Text style={styles.inputLabel}>Account Number *</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Account number"
                      value={accountNumber}
                      onChangeText={setAccountNumber}
                      keyboardType="number-pad"
                      secureTextEntry
                    />

                    <Text style={styles.inputLabel}>IFSC Code *</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="11-character IFSC (e.g. SBIN0001234)"
                      value={ifscCode}
                      onChangeText={(t) => setIfscCode(t.toUpperCase())}
                      autoCapitalize="characters"
                      maxLength={11}
                    />
                  </View>
                ) : (
                  <View style={styles.inputsWrap}>
                    <Text style={styles.inputLabel}>UPI ID *</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="yourname@okbank or 9876543210@paytm"
                      value={upiId}
                      onChangeText={setUpiId}
                      autoCapitalize="none"
                    />
                  </View>
                )}

                <View style={styles.formActions}>
                  <TouchableOpacity
                    style={styles.saveBtn}
                    onPress={handleSavePayout}
                    disabled={savePayoutMutation.isPending}
                  >
                    {savePayoutMutation.isPending ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.saveBtnText}>Save Payout Details</Text>
                    )}
                  </TouchableOpacity>

                  {isEditingPayout && (
                    <TouchableOpacity
                      style={styles.cancelBtn}
                      onPress={() => setIsEditingPayout(false)}
                    >
                      <Text style={styles.cancelBtnText}>Cancel</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}
          </View>
        )}

        {activeTab === 'history' && (
          <View style={styles.tabContent}>
            {payoutHistory.length === 0 ? (
              <View style={styles.centered}>
                <Ionicons name="document-text-outline" size={56} color="#cbd5e1" />
                <Text style={styles.emptyTitle}>No withdrawal requests yet</Text>
                <Text style={styles.emptySubtitle}>
                  When you request an affiliate commission payout, the record and transfer status will appear here.
                </Text>
              </View>
            ) : (
              payoutHistory.map((item) => {
                const s = (item.status || '').toUpperCase();
                const isPaid = s === 'PAID' || s === 'APPROVED' || s === 'COMPLETED';
                const isRejected = s === 'REJECTED';

                return (
                  <View key={item.id} style={styles.historyCard}>
                    <View style={styles.historyCardHeader}>
                      <View>
                        <Text style={styles.historyAmount}>{formatIndianRupees(item.amount)}</Text>
                        <Text style={styles.historyDate}>
                          Requested on {new Date(item.date).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.badge,
                          {
                            backgroundColor: isPaid ? '#f0fdf4' : isRejected ? '#fef2f2' : '#fef3c7',
                          },
                        ]}
                      >
                        <Ionicons
                          name={isPaid ? 'checkmark-circle' : isRejected ? 'close-circle' : 'time'}
                          size={12}
                          color={isPaid ? '#16a34a' : isRejected ? '#dc2626' : '#d97706'}
                        />
                        <Text
                          style={[
                            styles.badgeText,
                            { color: isPaid ? '#16a34a' : isRejected ? '#dc2626' : '#d97706' },
                          ]}
                        >
                          {isPaid ? 'Paid' : isRejected ? 'Rejected' : 'Under Review'}
                        </Text>
                      </View>
                    </View>

                    {item.adminNotes ? (
                      <Text style={styles.adminNotes}>Remark: {item.adminNotes}</Text>
                    ) : null}

                    {item.processedAt ? (
                      <Text style={styles.processedText}>
                        Processed: {new Date(item.processedAt).toLocaleDateString('en-IN')}
                      </Text>
                    ) : null}
                  </View>
                );
              })
            )}
          </View>
        )}
      </ScrollView>

      {/* Withdrawal Modal */}
      <Modal visible={isWithdrawModalOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Request Mitra Withdrawal</Text>
              <TouchableOpacity onPress={() => setIsWithdrawModalOpen(false)}>
                <Ionicons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBalanceBox}>
              <Text style={styles.modalBalanceLabel}>Available Balance:</Text>
              <Text style={styles.modalBalanceValue}>{formatIndianRupees(availableBalance)}</Text>
            </View>

            <Text style={styles.inputLabel}>Withdrawal Amount (₹) *</Text>
            <TextInput
              style={styles.modalInput}
              value={withdrawAmount}
              onChangeText={setWithdrawAmount}
              keyboardType="number-pad"
              placeholder={`Min. ₹${MINIMUM_WITHDRAWAL}`}
            />
            <Text style={styles.inputHint}>Minimum withdrawal limit is ₹{MINIMUM_WITHDRAWAL}.</Text>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.confirmWithdrawBtn}
                onPress={handleConfirmWithdrawal}
                disabled={withdrawMutation.isPending}
              >
                {withdrawMutation.isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.confirmWithdrawBtnText}>Confirm Withdrawal</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  tabItem: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    borderBottomColor: colors.primary,
  },
  tabItemText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  tabItemTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: 40,
  },
  tabContent: {
    gap: spacing.md,
  },
  codeCard: {
    backgroundColor: '#ffffff',
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    ...shadows.sm,
  },
  codeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: spacing.xs,
  },
  codeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  codeBox: {
    flex: 1,
    backgroundColor: '#eff6ff',
    borderWidth: 1.5,
    borderColor: '#bfdbfe',
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
    height: 44,
  },
  codeText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1e3a8a',
    letterSpacing: 1.5,
  },
  shareButton: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 16,
    borderRadius: radius.md,
    height: 44,
  },
  shareButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
  },
  whatsAppButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: radius.md,
    height: 40,
  },
  whatsAppButtonText: {
    color: '#16a34a',
    fontWeight: '700',
    fontSize: 13,
  },
  tierCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
  },
  tierInfo: {
    flex: 1,
  },
  tierLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  tierName: {
    fontSize: 16,
    fontWeight: '800',
    marginTop: 2,
  },
  balanceCard: {
    backgroundColor: '#ffffff',
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    ...shadows.sm,
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  balanceAmount: {
    fontSize: 22,
    fontWeight: '800',
    color: '#16a34a',
    marginTop: 2,
  },
  withdrawBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radius.md,
  },
  withdrawBtnDisabled: {
    backgroundColor: '#94a3b8',
  },
  withdrawBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
  },
  reservedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  reservedText: {
    fontSize: 11,
    color: '#d97706',
    fontWeight: '500',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#ffffff',
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  statLabel: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  infoCard: {
    backgroundColor: '#ffffff',
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  infoCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: spacing.sm,
  },
  infoStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 4,
  },
  stepCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNum: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  stepText: {
    fontSize: 12,
    color: '#475569',
    flex: 1,
  },
  payoutStatusCard: {
    backgroundColor: '#ffffff',
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    ...shadows.sm,
  },
  payoutStatusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  payoutStatusTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  payoutStatusSubtitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  configuredDetailsBox: {
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    gap: spacing.xs,
  },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailLabel: {
    fontSize: 11,
    color: '#64748b',
  },
  detailValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1e293b',
  },
  editPayoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
  },
  editPayoutBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  formCard: {
    backgroundColor: '#ffffff',
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    ...shadows.sm,
  },
  formCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: spacing.sm,
  },
  methodSwitcher: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  methodBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: radius.md,
    backgroundColor: '#f1f5f9',
  },
  methodBtnActive: {
    backgroundColor: colors.primary,
  },
  methodBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  methodBtnTextActive: {
    color: '#ffffff',
  },
  inputsWrap: {
    gap: spacing.xs,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
    marginTop: spacing.xs,
  },
  input: {
    height: 42,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    fontSize: 13,
    color: '#0f172a',
  },
  inputHint: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 2,
  },
  formActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  saveBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    height: 42,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    height: 42,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: radius.md,
  },
  cancelBtnText: {
    color: '#64748b',
    fontWeight: '600',
    fontSize: 13,
  },
  historyCard: {
    backgroundColor: '#ffffff',
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    ...shadows.sm,
  },
  historyCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyAmount: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  historyDate: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
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
  adminNotes: {
    fontSize: 11,
    color: '#475569',
    marginTop: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  processedText: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  modalBalanceBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.xs,
  },
  modalBalanceLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1e3a8a',
  },
  modalBalanceValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#16a34a',
  },
  modalInput: {
    height: 46,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  modalActions: {
    marginTop: spacing.md,
  },
  confirmWithdrawBtn: {
    backgroundColor: '#16a34a',
    height: 46,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmWithdrawBtnText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 14,
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
    maxWidth: 260,
    lineHeight: 18,
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
