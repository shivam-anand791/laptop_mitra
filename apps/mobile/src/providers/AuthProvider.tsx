import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import { LaptopMitraApiClient } from '@laptopmitra/api-client';
import { User } from '@laptopmitra/types';
import { API_BASE_URL } from '../config';

const TOKEN_KEY = 'lm_access_token';
const REFRESH_TOKEN_KEY = 'lm_refresh_token';
const USER_KEY = 'lm_user';

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (accessToken: string, refreshToken: string | undefined, user: User) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
  getClient: () => LaptopMitraApiClient;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshTokenVal, setRefreshTokenVal] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session on mount
  useEffect(() => {
    (async () => {
      try {
        const [storedToken, storedRefreshToken, storedUser] = await Promise.all([
          SecureStore.getItemAsync(TOKEN_KEY),
          SecureStore.getItemAsync(REFRESH_TOKEN_KEY),
          SecureStore.getItemAsync(USER_KEY),
        ]);

        if (storedToken && storedUser) {
          // Token exists — try to refresh it to validate
          if (storedRefreshToken) {
            try {
              const client = new LaptopMitraApiClient({
                baseUrl: API_BASE_URL,
              });
              const refreshed = await client.refreshAccessToken(storedRefreshToken);
              // Persist refreshed tokens
              await Promise.all([
                SecureStore.setItemAsync(TOKEN_KEY, refreshed.accessToken),
                SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshed.refreshToken),
              ]);
              setAccessToken(refreshed.accessToken);
              setRefreshTokenVal(refreshed.refreshToken);
              setUser(JSON.parse(storedUser));
            } catch {
              // Refresh failed — clear stored auth
              await Promise.all([
                SecureStore.deleteItemAsync(TOKEN_KEY),
                SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
                SecureStore.deleteItemAsync(USER_KEY),
              ]);
              setAccessToken(null);
              setRefreshTokenVal(null);
              setUser(null);
            }
          } else {
            // No refresh token — treat as logged out
            await Promise.all([
              SecureStore.deleteItemAsync(TOKEN_KEY),
              SecureStore.deleteItemAsync(USER_KEY),
            ]);
            setAccessToken(null);
            setUser(null);
          }
        }
      } catch (error) {
        console.error('Failed to restore auth state:', error);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const login = useCallback(async (newAccessToken: string, newRefreshToken: string | undefined, newUser: User) => {
    await SecureStore.setItemAsync(TOKEN_KEY, newAccessToken);
    if (newRefreshToken) {
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, newRefreshToken);
    }
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(newUser));
    setAccessToken(newAccessToken);
    setRefreshTokenVal(newRefreshToken ?? null);
    setUser(newUser);
  }, []);

  const logout = useCallback(async () => {
    // Attempt server-side logout if we have tokens
    if (refreshTokenVal) {
      try {
        const client = new LaptopMitraApiClient({
          baseUrl: API_BASE_URL,
          getToken: () => accessToken,
        });
        await client.logout(refreshTokenVal);
      } catch {
        // Best-effort — clear local state regardless
      }
    }
    await Promise.all([
      SecureStore.deleteItemAsync(TOKEN_KEY),
      SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
      SecureStore.deleteItemAsync(USER_KEY),
    ]);
    setAccessToken(null);
    setRefreshTokenVal(null);
    setUser(null);
  }, [accessToken, refreshTokenVal]);

  const updateUser = useCallback((updatedUser: User) => {
    setUser(updatedUser);
    SecureStore.setItemAsync(USER_KEY, JSON.stringify(updatedUser));
  }, []);

  const getClient = useCallback(() => {
    return new LaptopMitraApiClient({
      baseUrl: API_BASE_URL,
      getToken: () => accessToken,
    });
  }, [accessToken]);

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        refreshToken: refreshTokenVal,
        isLoading,
        isAuthenticated: !!accessToken && !!user,
        login,
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
