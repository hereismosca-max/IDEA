'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { User } from '@/types';
import { getToken, setToken, removeToken } from '@/lib/auth';
import { loginUser, registerUser, getCurrentUser, deleteAccount as deleteAccountApi } from '@/lib/api';

// ── Types ─────────────────────────────────────────────────────────────────────

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  register: (email: string, password: string, displayName: string, captchaToken?: string) => Promise<void>;
  deleteAccount: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

// ── Context ───────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On mount: restore session from localStorage
  useEffect(() => {
    const storedToken = getToken();
    if (!storedToken) {
      setIsLoading(false);
      return;
    }
    setTokenState(storedToken);
    getCurrentUser()
      .then((u) => setUser(u))
      .catch(() => {
        // Token is stale or invalid — clear it
        removeToken();
        setTokenState(null);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const response = await loginUser(email, password);
    setToken(response.access_token);
    setTokenState(response.access_token);
    const me = await getCurrentUser();
    setUser(me);
  }, []);

  const logout = useCallback(() => {
    removeToken();
    setTokenState(null);
    setUser(null);
  }, []);

  const register = useCallback(
    async (email: string, password: string, displayName: string, captchaToken = '') => {
      await registerUser(email, password, displayName, captchaToken);
      await login(email, password);
    },
    [login]
  );

  const deleteAccount = useCallback(async () => {
    await deleteAccountApi();
    removeToken();
    setTokenState(null);
    setUser(null);
  }, []);

  // Refresh current user from the server (e.g. after a profile update)
  const refreshUser = useCallback(async () => {
    try {
      const me = await getCurrentUser();
      setUser(me);
    } catch {
      // Silent — if the token is invalid, logout will be triggered elsewhere
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout, register, deleteAccount, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }
  return ctx;
}
