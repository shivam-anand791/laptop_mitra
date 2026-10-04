'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
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
  setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('lm_user');
      if (stored) {
        setUser(JSON.parse(stored));
      }
    } catch {
      // Ignore parse error
    }

    let isMounted = true;

    try {
      const unsubscribe = onIdTokenChanged(auth, async (fbUser) => {
        if (!isMounted) return;
        setFirebaseUser(fbUser);
        if (fbUser) {
          try {
            const token = await fbUser.getIdToken();
            localStorage.setItem('lm_token', token);
            const res = await api.syncUser();
            setUser(res.user);
          } catch (err) {
            console.warn('Failed to sync Firebase token with backend profile:', err);
          }
        }
        setIsLoading(false);
      });

      return () => {
        isMounted = false;
        unsubscribe();
      };
    } catch {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, pass: string) => {
    const cred = await signInWithEmailAndPassword(auth, email.trim(), pass);
    const idToken = await cred.user.getIdToken();
    if (typeof window !== 'undefined') {
      localStorage.setItem('lm_token', idToken);
    }
    const res = await api.syncUser();
    setUser(res.user);
  };

  const guestLogin = async () => {
    const cred = await signInAnonymously(auth);
    const idToken = await cred.user.getIdToken();
    if (typeof window !== 'undefined') {
      localStorage.setItem('lm_token', idToken);
    }
    const res = await api.syncUser();
    setUser(res.user);
  };

  const register = async (data: { name: string; email: string; password: string; referralCode?: string; phone?: string }) => {
    const cred = await createUserWithEmailAndPassword(auth, data.email.trim(), data.password);
    const idToken = await cred.user.getIdToken();
    if (typeof window !== 'undefined') {
      localStorage.setItem('lm_token', idToken);
    }
    const res = await api.syncUser({
      name: data.name,
      phone: data.phone,
      referralCode: data.referralCode,
    });
    setUser(res.user);
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch {
      // ignore
    }
    await api.logout();
    setUser(null);
    setFirebaseUser(null);
  };

  const updateUser = (data: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return null;
      const updated = { ...prev, ...data };
      try {
        localStorage.setItem('lm_user', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const isAuthenticated = !!user;
  const isGuest = !!user?.isGuest;

  return (
    <AuthContext.Provider
      value={{
        user,
        firebaseUser,
        isLoading,
        isAuthenticated,
        isGuest,
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
