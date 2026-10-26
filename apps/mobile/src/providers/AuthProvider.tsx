import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { onIdTokenChanged, signOut as firebaseSignOut, User as FirebaseUser } from 'firebase/auth';
import { useQueryClient } from '@tanstack/react-query';
import { LaptopMitraApiClient } from '@laptopmitra/api-client';
import { User } from '@laptopmitra/types';
import { API_BASE_URL } from '../config';
import { getFirebaseAuth } from '../firebase/firebase';
import { clearAuth } from '../utils/storage';

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isGuest: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { name: string; email: string; password: string; phone?: string | undefined; referralCode?: string | undefined }) => Promise<void>;
  guestLogin: () => Promise<void>;
  linkGuestAccount: (data: { email: string; password: string; name?: string | undefined }) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
  getClient: () => LaptopMitraApiClient;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();

  const getClient = useCallback(() => new LaptopMitraApiClient({
    baseUrl: API_BASE_URL,
    getToken: async () => {
      const currentUser = getFirebaseAuth().currentUser;
      return currentUser ? currentUser.getIdToken() : null;
    },
    onUnauthorized: async () => {
      await firebaseSignOut(getFirebaseAuth()).catch(() => undefined);
      setUser(null);
      setFirebaseUser(null);
      queryClient.clear();
      await clearAuth().catch(() => undefined);
    },
  }), [queryClient]);

  const syncUser = useCallback(async (
    currentUser: FirebaseUser,
    profile?: { name?: string | undefined; phone?: string | undefined; referralCode?: string | undefined },
  ) => {
    const token = await currentUser.getIdToken();
    const client = new LaptopMitraApiClient({ baseUrl: API_BASE_URL, getToken: () => token });
    const payload: { name?: string; phone?: string; referralCode?: string } = {};
    if (profile?.name) payload.name = profile.name;
    if (profile?.phone) payload.phone = profile.phone;
    if (profile?.referralCode) payload.referralCode = profile.referralCode;
    const result = await client.syncUser(Object.keys(payload).length > 0 ? payload : undefined);
    setUser(result.user);
    return result.user;
  }, []);

  useEffect(() => {
    let active = true;
    let lastUid: string | null = null;
    let unsubscribe: (() => void) | undefined;

    void clearAuth();

    try {
      unsubscribe = onIdTokenChanged(getFirebaseAuth(), async (currentUser) => {
        if (!active) return;
        const nextUid = currentUser?.uid ?? null;
        if (lastUid !== nextUid) {
          queryClient.clear();
          setUser(null);
          lastUid = nextUid;
        }
        setFirebaseUser(currentUser);
        if (!currentUser) {
          setIsLoading(false);
          return;
        }

        setIsLoading(true);
        try {
          await syncUser(currentUser);
        } catch (error: any) {
          if (!active) return;
          setUser(null);
          if (error?.status === 401) {
            await firebaseSignOut(getFirebaseAuth()).catch(() => undefined);
          }
        } finally {
          if (active) setIsLoading(false);
        }
      });
    } catch {
      setIsLoading(false);
    }

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [queryClient, syncUser]);

  const login = useCallback(async (email: string, password: string) => {
    const { signInWithEmailAndPassword } = await import('firebase/auth');
    const credential = await signInWithEmailAndPassword(getFirebaseAuth(), email.trim(), password);
    await syncUser(credential.user);
  }, [syncUser]);

  const register = useCallback(async (data: {
    name: string;
    email: string;
    password: string;
    phone?: string | undefined;
    referralCode?: string | undefined;
  }) => {
    const { createUserWithEmailAndPassword, updateProfile } = await import('firebase/auth');
    const credential = await createUserWithEmailAndPassword(getFirebaseAuth(), data.email.trim(), data.password);
    await updateProfile(credential.user, { displayName: data.name.trim() });
    await syncUser(credential.user, {
      name: data.name,
      ...(data.phone ? { phone: data.phone } : {}),
      ...(data.referralCode ? { referralCode: data.referralCode } : {}),
    });
  }, [syncUser]);

  const guestLogin = useCallback(async () => {
    const { signInAnonymously } = await import('firebase/auth');
    const credential = await signInAnonymously(getFirebaseAuth());
    await syncUser(credential.user);
  }, [syncUser]);

  const linkGuestAccount = useCallback(async (data: { email: string; password: string; name?: string | undefined }) => {
    const { linkWithCredential, EmailAuthProvider, updateProfile } = await import('firebase/auth');
    const currentUser = getFirebaseAuth().currentUser;
    if (!currentUser) throw new Error('No active guest session to link.');
    const credential = EmailAuthProvider.credential(data.email.trim(), data.password);
    const result = await linkWithCredential(currentUser, credential);
    if (data.name?.trim()) {
      await updateProfile(result.user, { displayName: data.name.trim() });
    }
    await syncUser(result.user, {
      ...(data.name ? { name: data.name.trim() } : {}),
    });
  }, [syncUser]);

  const logout = useCallback(async () => {
    try {
      const currentUser = getFirebaseAuth().currentUser;
      if (currentUser) await firebaseSignOut(getFirebaseAuth());
    } finally {
      setUser(null);
      setFirebaseUser(null);
      queryClient.clear();
      await clearAuth();
    }
  }, [queryClient]);

  const updateUser = useCallback((updatedUser: User) => setUser(updatedUser), []);

  return (
    <AuthContext.Provider
      value={{
        user,
        firebaseUser,
        isLoading,
        isAuthenticated: !isLoading && !!firebaseUser && !!user,
        isGuest: !!user?.isGuest,
        login,
        register,
        guestLogin,
        linkGuestAccount,
        logout,
        updateUser,
        getClient,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
