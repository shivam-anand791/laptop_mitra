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
import {
  syncWithBackoff,
  isTransientSyncError,
  formatSyncErrorMessage,
  SyncErrorState,
} from './sync-recovery';

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  isLoading: boolean;
  isSyncing: boolean;
  isAuthenticated: boolean;
  isGuest: boolean;
  syncError: SyncErrorState | null;
  login: (email: string, pass: string) => Promise<User>;
  guestLogin: () => Promise<User>;
  register: (data: { name: string; email: string; password: string; referralCode?: string; phone?: string }) => Promise<User>;
  retrySync: (data?: { name?: string; phone?: string; referralCode?: string }) => Promise<User>;
  cancelSyncAndSignOut: () => Promise<void>;
  clearSyncError: () => void;
  logout: () => Promise<void>;
  updateUser: (data: Partial<User>) => void;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<SyncErrorState | null>(null);

  // Guards against race conditions between manual registration/login and background onIdTokenChanged
  const isRegisteringRef = useRef(false);
  const isSyncingRef = useRef(false);
  const hasAutoSyncedUidRef = useRef<string | null>(null);

  const clearSyncError = useCallback(() => {
    setSyncError(null);
  }, []);

  const syncCurrentUser = useCallback(
    async (profileData?: { name?: string; phone?: string; referralCode?: string }): Promise<User> => {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        setUser(null);
        setFirebaseUser(null);
        throw new Error('No authenticated Firebase session found.');
      }

      setIsSyncing(true);
      try {
        // Retry with exponential backoff for transient failures (e.g. database down, 503, network)
        const result = await syncWithBackoff(async () => {
          return await api.syncUser({
            name: profileData?.name ?? currentUser.displayName ?? undefined,
            phone: profileData?.phone ?? currentUser.phoneNumber ?? undefined,
            referralCode: profileData?.referralCode,
          });
        });

        setUser(result.user);
        setFirebaseUser(currentUser);
        setSyncError(null);
        return result.user;
      } catch (err: unknown) {
        setUser(null);
        setFirebaseUser(currentUser);
        const isTransient = isTransientSyncError(err);
        const message = formatSyncErrorMessage(err);
        setSyncError({
          message,
          isTransient,
          failedAt: Date.now(),
        });
        throw err;
      } finally {
        setIsSyncing(false);
      }
    },
    [],
  );

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
        setSyncError(null);
        hasAutoSyncedUidRef.current = null;
        localStorage.removeItem('lm_token');
        localStorage.removeItem('lm_refresh_token');
        localStorage.removeItem('lm_user');
        return;
      }

      // Prevent retry loops on page load: only attempt auto-sync once per UID in this session
      if (hasAutoSyncedUidRef.current === nextUid) {
        setIsLoading(false);
        return;
      }

      // Avoid overlapping sync calls
      if (isSyncingRef.current) return;
      isSyncingRef.current = true;
      setIsLoading(true);
      hasAutoSyncedUidRef.current = nextUid;

      try {
        await syncCurrentUser();
      } catch {
        // Error state already recorded inside syncCurrentUser with user-facing message and retry action
      } finally {
        isSyncingRef.current = false;
        if (active) setIsLoading(false);
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [syncCurrentUser]);

  const login = async (email: string, pass: string): Promise<User> => {
    setIsLoading(true);
    setSyncError(null);
    try {
      const credential = await signInWithEmailAndPassword(auth, email.trim(), pass);
      await credential.user.getIdToken(true);
      const syncedUser = await syncCurrentUser();
      return syncedUser;
    } catch (err: unknown) {
      if (auth.currentUser) {
        // Firebase auth succeeded, but backend /auth/sync failed after retries
        const syncFailureErr = new Error(
          'Your account is signed in, but we couldn’t finish setting up your session because the server database is temporarily unavailable.'
        );
        (syncFailureErr as any).isSyncFailure = true;
        (syncFailureErr as any).originalError = err;
        throw syncFailureErr;
      }
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const guestLogin = async (): Promise<User> => {
    setIsLoading(true);
    setSyncError(null);
    try {
      // If the client already holds an active anonymous user session, reuse it
      // rather than creating redundant anonymous Firebase accounts on repeated clicks or retries
      let current = auth.currentUser;
      if (!current || !current.isAnonymous) {
        const credential = await signInAnonymously(auth);
        current = credential.user;
      }

      await current.getIdToken(true);
      const syncedUser = await syncCurrentUser();
      return syncedUser;
    } catch (err: unknown) {
      if (auth.currentUser) {
        const syncFailureErr = new Error(
          'Your guest session started, but setting up your cart and account failed because the database is temporarily unavailable.'
        );
        (syncFailureErr as any).isSyncFailure = true;
        (syncFailureErr as any).originalError = err;
        throw syncFailureErr;
      }
      throw err;
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
    setSyncError(null);

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
        const syncedUser = await syncCurrentUser({
          name: data.name.trim(),
          phone: data.phone?.trim() || undefined,
          referralCode: data.referralCode?.trim() || undefined,
        });
        return syncedUser;
      } catch (syncErr: any) {
        const partialErr = new Error(
          'Your account credentials were created, but completing profile setup failed. Click "Complete Setup" to retry.'
        );
        (partialErr as any).code = 'sync_failed_after_registration';
        (partialErr as any).isSyncFailure = true;
        (partialErr as any).firebaseUser = credentialUser;
        (partialErr as any).originalError = syncErr;
        throw partialErr;
      }
    } finally {
      isRegisteringRef.current = false;
      setIsLoading(false);
    }
  };

  const retrySync = async (data?: { name?: string; phone?: string; referralCode?: string }): Promise<User> => {
    const current = auth.currentUser;
    if (!current) {
      throw new Error('No active account session found. Please sign in with your email and password.');
    }
    await current.getIdToken(true);
    return await syncCurrentUser(data);
  };

  const cancelSyncAndSignOut = async (): Promise<void> => {
    try {
      await signOut(auth);
    } finally {
      setUser(null);
      setFirebaseUser(null);
      setSyncError(null);
      hasAutoSyncedUidRef.current = null;
      localStorage.removeItem('lm_token');
      localStorage.removeItem('lm_refresh_token');
      localStorage.removeItem('lm_user');
      localStorage.removeItem('lm_cart');
      localStorage.removeItem('lm_wishlist');
    }
  };

  const logout = async () => {
    await cancelSyncAndSignOut();
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
        isSyncing,
        isAuthenticated: !isLoading && !!firebaseUser && !!user,
        isGuest: !!user?.isGuest,
        syncError,
        login,
        guestLogin,
        register,
        retrySync,
        cancelSyncAndSignOut,
        clearSyncError,
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
