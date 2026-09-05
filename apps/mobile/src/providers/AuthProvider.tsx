import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '@laptopmitra/types';
import apiClient from '../api/client';
import {
  getAccessToken,
  setAccessToken,
  getRefreshToken,
  setRefreshToken,
  getUser,
  setUser,
  clearAuth,
} from '../utils/storage';

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  login: (accessToken: string, refreshToken: string | undefined, user: User) => Promise<void>;
  logout: () => Promise<void>;
  refreshAccessToken: () => Promise<string | null>;
  restoreSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [accessToken, setAccessTokenState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const restoreSession = async () => {
    try {
      const [storedToken, storedRefreshToken, storedUser] = await Promise.all([
        getAccessToken(),
        getRefreshToken(),
        getUser(),
      ]);
      if (storedToken) setAccessTokenState(storedToken);
      if (storedRefreshToken) {
        // Store refresh token for later use
      }
      if (storedUser) setUserState(storedUser);
    } catch (e) {
      console.warn('Failed to restore session:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    restoreSession();
  }, []);

  const login = async (newAccessToken: string, newRefreshToken: string | undefined, newUser: User) => {
    await Promise.all([
      setAccessToken(newAccessToken),
      newRefreshToken ? setRefreshToken(newRefreshToken) : Promise.resolve(),
      setUser(newUser),
    ]);
    setAccessTokenState(newAccessToken);
    setUserState(newUser);
  };

  const logout = async () => {
    await clearAuth();
    setAccessTokenState(null);
    setUserState(null);
  };

  const refreshAccessToken = async (): Promise<string | null> => {
    try {
      const currentRefreshToken = await getRefreshToken();
      if (!currentRefreshToken) return null;

      const { accessToken: newAccessToken, refreshToken: newRefreshToken } =
        await apiClient.refreshAccessToken(currentRefreshToken);

      // Store new tokens
      await Promise.all([
        setAccessToken(newAccessToken),
        setRefreshToken(newRefreshToken),
      ]);

      setAccessTokenState(newAccessToken);

      return newAccessToken;
    } catch {
      // Refresh failed → logout and redirect to login
      await logout();
      return null;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        isLoading,
        login,
        logout,
        refreshAccessToken,
        restoreSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}