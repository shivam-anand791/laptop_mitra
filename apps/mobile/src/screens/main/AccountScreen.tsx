import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Modal, TextInput } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useProfile, useSignoutEverywhere, useDeleteAccount, useLinkGuestAccount } from '../../hooks/useApi';
import { useAuth } from '../../providers/AuthProvider';
import { MainStackNavigationProp } from '../../navigation/types';
import { API_BASE_URL } from '../../config';

export default function AccountScreen() {
  const navigation = useNavigation<MainStackNavigationProp>();
  const { data: profile, isLoading } = useProfile();
  const { logout, isGuest } = useAuth();

  const signoutEverywhere = useSignoutEverywhere();
  const deleteAccount = useDeleteAccount();
  const linkGuest = useLinkGuestAccount();

  // Guest linking modal
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [linkEmail, setLinkEmail] = useState('');
  const [linkPassword, setLinkPassword] = useState('');
  const [linkName, setLinkName] = useState('');

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to log out of this device?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: () => logout(),
      },
    ]);
  };

  const handleSignoutEverywhere = () => {
    Alert.alert(
      'Sign Out Everywhere',
      'This will revoke all active sessions across all your mobile devices and browsers. Proceed?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out Everywhere',
          style: 'destructive',
          onPress: () => {
            signoutEverywhere.mutate(undefined, {
              onSuccess: () => {
                Alert.alert('Sessions Revoked', 'You have been signed out from all devices.');
                logout();
              },
              onError: (err) => Alert.alert('Error', err.message),
            });
          },
        },
      ],
    );
  };

  const handleDeleteAccount = () => {
    Alert.prompt
      ? Alert.prompt(
        'Delete Account',
        'This action is irreversible. Type DELETE to permanently anonymize your account:',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: (text?: string) => {
              if (text === 'DELETE') {
                deleteAccount.mutate(undefined, {
                  onSuccess: () => {
                    Alert.alert('Account Deleted', 'Your personal data has been erased.');
                    logout();
                  },
                  onError: (err) => Alert.alert('Error', err.message),
                });
              } else {
                Alert.alert('Error', 'You must type DELETE exactly.');
              }
            },
          },
        ],
      )
      : Alert.alert(
        'Delete Account',
        'Are you sure you want to permanently anonymize your account? This cannot be undone.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete Permanently',
            style: 'destructive',
            onPress: () => {
              deleteAccount.mutate(undefined, {
                onSuccess: () => {
                  Alert.alert('Account Deleted', 'Your personal data has been erased.');
                  logout();
                },
                onError: (err) => Alert.alert('Error', err.message),
              });
            },
          },
        ],
      );
  };

  const handleLinkGuestSubmit = () => {
    if (!linkEmail.trim()) {
      Alert.alert('Validation Error', 'Email is required to link your guest account.');
      return;
    }
    const payload: { email: string; password?: string; name?: string } = {
      email: linkEmail.trim(),
    };
    if (linkPassword.trim()) payload.password = linkPassword.trim();
    if (linkName.trim()) payload.name = linkName.trim();

    linkGuest.mutate(payload, {
      onSuccess: () => {
        setIsLinkModalOpen(false);
        Alert.alert('Account Created & Linked', 'Your guest orders and addresses have been saved!');
      },
      onError: (err) => Alert.alert('Error', err.message),
    });
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  const menuSections = [
    {
      title: 'Orders & Shopping',
      items: [
        { icon: 'receipt-outline' as const, label: 'My Orders & Invoices', route: 'OrderHistory' as const },
        { icon: 'location-outline' as const, label: 'Saved Addresses', route: 'AddressBook' as const },
      ],
    },
    {
      title: 'Mitra Partner',
      items: [
        { icon: 'wallet-outline' as const, label: 'Mitra Affiliate & Referral Earnings', route: 'MitraDashboard' as const },
      ],
    },
    {
      title: 'Account Settings',
      items: [
        { icon: 'person-circle-outline' as const, label: 'Personal Information', route: 'Profile' as const },
        { icon: 'lock-closed-outline' as const, label: 'Change Password', route: 'ChangePassword' as const },
      ],
    },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Dev API URL Banner (dev builds only) */}
      {__DEV__ && (
        <View style={styles.devBanner}>
          <Ionicons name="server-outline" size={14} color="#64748b" />
          <Text style={styles.devBannerText} numberOfLines={1}>
            API Endpoint: {API_BASE_URL}
          </Text>
        </View>
      )}

      {/* Guest Banner */}
      {isGuest && (
        <View style={styles.guestBanner}>
          <View style={styles.guestBannerLeft}>
            <Ionicons name="information-circle" size={20} color="#b45309" />
            <View style={{ flex: 1 }}>
              <Text style={styles.guestBannerTitle}>Browsing as Guest</Text>
              <Text style={styles.guestBannerSubtitle}>Save your addresses and orders across all devices.</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.guestBannerButton}
            onPress={() => setIsLinkModalOpen(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.guestBannerButtonText}>Save Account</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Profile Summary Card */}
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{profile?.name?.charAt(0)?.toUpperCase() || 'U'}</Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{profile?.name || (isGuest ? 'Guest Shopper' : 'User')}</Text>
          <Text style={styles.profileEmail}>{profile?.email || (isGuest ? 'Guest session' : '')}</Text>
          {profile?.phone ? <Text style={styles.profilePhone}>{profile.phone}</Text> : null}
        </View>
      </View>

      {/* Menu Sections */}
      {menuSections.map((section) => (
        <View key={section.title} style={styles.menuSection}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <View style={styles.menuCard}>
            {section.items.map((item, index) => (
              <TouchableOpacity
                key={item.label}
                style={[styles.menuRow, index < section.items.length - 1 && styles.menuRowBorder]}
                onPress={() => navigation.navigate(item.route)}
                activeOpacity={0.6}
              >
                <Ionicons name={item.icon} size={22} color="#64748b" style={styles.menuIcon} />
                <Text style={styles.menuLabel}>{item.label}</Text>
                <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ))}

      {/* Security & Multi-Device Sessions */}
      <View style={styles.menuSection}>
        <Text style={styles.sectionTitle}>Security & Privacy</Text>
        <View style={styles.menuCard}>
          <TouchableOpacity
            style={[styles.menuRow, styles.menuRowBorder]}
            onPress={handleSignoutEverywhere}
            activeOpacity={0.6}
          >
            <Ionicons name="phone-portrait-outline" size={22} color="#64748b" style={styles.menuIcon} />
            <Text style={styles.menuLabel}>Sign Out Everywhere</Text>
            <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuRow}
            onPress={handleDeleteAccount}
            activeOpacity={0.6}
          >
            <Ionicons name="trash-outline" size={22} color="#ef4444" style={styles.menuIcon} />
            <Text style={[styles.menuLabel, { color: '#ef4444' }]}>Delete Account & Anonymize</Text>
            <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Logout Button */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.7}>
        <Ionicons name="log-out-outline" size={20} color="#ef4444" />
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>

      {/* Link Guest Modal */}
      <Modal visible={isLinkModalOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Save & Link Your Account</Text>
            <Text style={styles.modalSubtitle}>
              Link your guest session to an email and password to permanently keep your orders, carts, and addresses.
            </Text>

            <Text style={styles.inputLabel}>Full Name</Text>
            <TextInput
              style={styles.modalInput}
              value={linkName}
              onChangeText={setLinkName}
              placeholder="Your full name"
            />

            <Text style={styles.inputLabel}>Email Address *</Text>
            <TextInput
              style={styles.modalInput}
              value={linkEmail}
              onChangeText={setLinkEmail}
              placeholder="name@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={styles.inputLabel}>Set Password (Optional)</Text>
            <TextInput
              style={styles.modalInput}
              value={linkPassword}
              onChangeText={setLinkPassword}
              placeholder="Create a password"
              secureTextEntry
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setIsLinkModalOpen(false)}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSubmitButton}
                onPress={handleLinkGuestSubmit}
                disabled={linkGuest.isPending}
              >
                {linkGuest.isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalSubmitButtonText}>Link Account</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fb',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f7fb',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  devBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 12,
  },
  devBannerText: {
    fontSize: 11,
    color: '#475569',
    fontFamily: 'monospace',
  },
  guestBanner: {
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  guestBannerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  guestBannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#92400e',
  },
  guestBannerSubtitle: {
    fontSize: 12,
    color: '#b45309',
    marginTop: 1,
  },
  guestBannerButton: {
    backgroundColor: '#d97706',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  guestBannerButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    gap: 14,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#bfdbfe',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2563eb',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  profileEmail: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 2,
  },
  profilePhone: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 1,
  },
  menuSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  menuCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  menuRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  menuIcon: {
    marginRight: 12,
  },
  menuLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#1e293b',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#fee2e2',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ef4444',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 16,
    lineHeight: 18,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 4,
  },
  modalInput: {
    height: 46,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#1e293b',
    backgroundColor: '#f8fafc',
    marginBottom: 12,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  modalCancelButton: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  modalSubmitButton: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalSubmitButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
});
