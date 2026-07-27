import React, { createContext, useContext, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { useAction, useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';

const TOKEN_KEY = 'faceattend_token';

type AuthContextValue = {
  token: string | null;
  isLoading: boolean;
  student: any;
  login: (studentId: string, password: string) => Promise<void>;
  register: (studentId: string, fullName: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const loginAction = useAction(api.auth.login);
  const registerAction = useAction(api.auth.register);

  const student = useQuery(api.auth.me, token ? { token } : 'skip');

  useEffect(() => {
    SecureStore.getItemAsync(TOKEN_KEY)
      .then((stored) => {
        setToken(stored);
      })
      .catch((err) => {
        console.warn('Failed to read stored session, starting logged out:', err);
        setToken(null);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);
  const persistToken = async (t: string) => {
    await SecureStore.setItemAsync(TOKEN_KEY, t);
    setToken(t);
  };

  const login = async (studentId: string, password: string) => {
    const { token: t } = await loginAction({ studentId, password });
    await persistToken(t);
  };

  const register = async (studentId: string, fullName: string, email: string, password: string) => {
    const { token: t } = await registerAction({ studentId, fullName, email, password });
    await persistToken(t);
  };

  const logout = async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ token, isLoading, student, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
