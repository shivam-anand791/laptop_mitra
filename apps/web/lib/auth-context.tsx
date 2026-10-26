'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { User } from './types';
import { api } from './api';
import {
  auth,
  signOut,
  onIdTokenChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
  FirebaseUser,
} from './firebase';

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isGuest: boolean;
  login: (email: string, pass: string) => Promise<User>;
  guestLogin: () => Promise<User>;
  register: (data: { name: string; email: string; password: string; referralCode?: string; phone?: string }) => Promise<User>;
  retrySync: (data?: { name?: string; phone?: string; referralCode?: string }) => Promise<User>;
  logout: () => Promise<void>;
  updateUser: (data: Partial<User>) => void;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Guards against race conditions between manual registration/login and background onIdTokenChanged
  const isRegisteringRef = useRef(false);
  const isSyncingRef = useRef(false);

  const syncCurrentUser = useCallback(async (profileData?: { name?: string; phone?: string; referralCode?: string }): Promise<User> => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      setUser(null);
      throw new Error('No authenticated Firebase session found.');
    }
    const result = await api.syncUser({
      name: profileData?.name ?? currentUser.displayName ?? undefined,
      phone: profileData?.phone ?? currentUser.phoneNumber ?? undefined,
      referralCode: profileData?.referralCode,
    });
    setUser(result.user);
    setFirebaseUser(currentUser);
    return result.user;
  }, []);

  useEffect(() => {
    let active = true;
    let lastUid: string | null = null;
    localStorage.removeItem('lm_token');
    localStorage.removeItem('lm_refresh_token');
    localStorage.removeItem('lm_user');

    const unsubscribe = onIdTokenChanged(auth, async (nextFirebaseUser) => {
      if (!active) return;

      // If an explicit registration or login flow is executing, let it manage state directly
      if (isRegisteringRef.current) {
        setFirebaseUser(nextFirebaseUser);
        return;
      }

      const nextUid = nextFirebaseUser?.uid ?? null;
      if (nextUid !== lastUid) {
        setUser(null);
        lastUid = nextUid;
      }
      setFirebaseUser(nextFirebaseUser);

      if (!nextFirebaseUser) {
        setIsLoading(false);
        localStorage.removeItem('lm_token');
        localStorage.removeItem('lm_refresh_token');
        localStorage.removeItem('lm_user');
        return;
      }

      // Avoid overlapping sync calls
      if (isSyncingRef.current) return;
      isSyncingRef.current = true;
      setIsLoading(true);

      try {
        const result = await api.syncUser({
          name: nextFirebaseUser.displayName ?? undefined,
          phone: nextFirebaseUser.phoneNumber ?? undefined,
        });
        if (active) setUser(result.user);
      } catch {
        if (active) setUser(null);
      } finally {
        isSyncingRef.current = false;
        if (active) setIsLoading(false);
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const login = async (email: string, pass: string): Promise<User> => {
    setIsLoading(true);
    try {
      const credential = await signInWithEmailAndPassword(auth, email.trim(), pass);
      await credential.user.getIdToken(true);
      const syncedUser = await syncCurrentUser();
      return syncedUser;
    } finally {
      setIsLoading(false);
    }
  };

  const guestLogin = async (): Promise<User> => {
    setIsLoading(true);
    try {
      const credential = await signInAnonymously(auth);
      await credential.user.getIdToken(true);
      const syncedUser = await syncCurrentUser();
      return syncedUser;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: {
    name: string;
    email: string;
    password: string;
    referralCode?: string;
    phone?: string;
  }): Promise<User> => {
    isRegisteringRef.current = true;
    setIsLoading(true);

    let credentialUser: FirebaseUser | null = null;
    try {
      // 1. Create Firebase authenticated identity
      const credential = await createUserWithEmailAndPassword(auth, data.email.trim(), data.password);
      credentialUser = credential.user;
      setFirebaseUser(credential.user);

      // 2. Set display name in Firebase if provided
      if (data.name?.trim()) {
        try {
          const { updateProfile } = await import('firebase/auth');
          await updateProfile(credential.user, { displayName: data.name.trim() });
        } catch {
          // Non-critical if client profile update throws; name is authoritatively persisted in /auth/sync
        }
      }

      // 3. Ensure token has updated claims and is valid
      await credential.user.getIdToken(true);

      // 4. Synchronize with authoritative NestJS backend
      try {
        const result = await api.syncUser({
          name: data.name.trim(),
          phone: data.phone?.trim() || undefined,
          referralCode: data.referralCode?.trim() || undefined,
        });

        setUser(result.user);
        setIsLoading(false);
        return result.user;
      } catch (syncErr: any) {
        // Partial-success case: Firebase user was successfully created, but backend sync failed
        const partialErr = new Error(
          'Your account credentials were created, but completing profile setup failed. Click "Complete Setup" to retry.'
        );
        (partialErr as any).code = 'sync_failed_after_registration';
        (partialErr as any).isSyncFailure = true;
        (partialErr as any).firebaseUser = credential.user;
        (partialErr as any).originalError = syncErr;
        throw partialErr;
      }
    } finally {
      isRegisteringRef.current = false;
      setIsLoading(false);
    }
  };

  const retrySync = async (data?: { name?: string; phone?: string; referralCode?: string }): Promise<User> => {
    setIsLoading(true);
    try {
      const current = auth.currentUser;
      if (!current) {
        throw new Error('No active account session found. Please sign in with your email and password.');
      }
      await current.getIdToken(true);
      const result = await api.syncUser({
        name: data?.name?.trim() || current.displayName || undefined,
        phone: data?.phone?.trim() || current.phoneNumber || undefined,
        referralCode: data?.referralCode?.trim() || undefined,
      });
      setUser(result.user);
      setFirebaseUser(current);
      return result.user;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } finally {
      setUser(null);
      setFirebaseUser(null);
      localStorage.removeItem('lm_token');
      localStorage.removeItem('lm_refresh_token');
      localStorage.removeItem('lm_user');
      localStorage.removeItem('lm_cart');
      localStorage.removeItem('lm_wishlist');
    }
  };

  const updateUser = (data: Partial<User>) => {
    setUser((prev) => (prev ? { ...prev, ...data } : null));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        firebaseUser,
        isLoading,
        isAuthenticated: !isLoading && !!firebaseUser && !!user,
        isGuest: !!user?.isGuest,
        login,
        guestLogin,
        register,
        retrySync,
        logout,
        updateUser,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
