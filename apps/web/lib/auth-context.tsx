'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
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
  login: (email: string, pass: string) => Promise<void>;
  guestLogin: () => Promise<void>;
  register: (data: { name: string; email: string; password: string; referralCode?: string; phone?: string }) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (data: Partial<User>) => void;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const syncCurrentUser = useCallback(async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      setUser(null);
      return;
    }
    const result = await api.syncUser({
      name: currentUser.displayName ?? undefined,
      phone: currentUser.phoneNumber ?? undefined,
    });
    setUser(result.user);
  }, []);

  useEffect(() => {
    let active = true;
    let lastUid: string | null = null;
    localStorage.removeItem('lm_token');
    localStorage.removeItem('lm_refresh_token');
    localStorage.removeItem('lm_user');
    const unsubscribe = onIdTokenChanged(auth, async (nextFirebaseUser) => {
      if (!active) return;
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
        if (active) setIsLoading(false);
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const login = async (email: string, pass: string) => {
    await signInWithEmailAndPassword(auth, email.trim(), pass);
    await syncCurrentUser();
  };

  const guestLogin = async () => {
    await signInAnonymously(auth);
    await syncCurrentUser();
  };

  const register = async (data: {
    name: string;
    email: string;
    password: string;
    referralCode?: string;
    phone?: string;
  }) => {
    const credential = await createUserWithEmailAndPassword(auth, data.email.trim(), data.password);
    const { updateProfile } = await import('firebase/auth');
    await updateProfile(credential.user, { displayName: data.name.trim() });
    const result = await api.syncUser({ name: data.name, phone: data.phone, referralCode: data.referralCode });
    setUser(result.user);
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
