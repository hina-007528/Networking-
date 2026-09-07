'use client';

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { AuthSessionDto, AuthUserDto } from '@stormfiber/types';
import { apiGet, apiSend, getAccessToken, persistSession, refreshSession, setAccessToken } from './api';

function assertCustomer(user: AuthUserDto): AuthUserDto {
  if (!user.customerId) {
    throw new Error('Staff accounts sign in at the admin console (localhost:3001), not here.');
  }
  return user;
}

interface AuthContextValue {
  user: AuthUserDto | null;
  ready: boolean;
  login: (identifier: string, password: string, rememberMe?: boolean) => Promise<AuthUserDto>;
  register: (input: Record<string, unknown>) => Promise<AuthUserDto>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUserDto | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        if (!getAccessToken()) {
          const restored = await refreshSession();
          if (!restored) return;
        }
        const profile = await apiGet<AuthUserDto>('/auth/me');
        if (cancelled) return;
        try {
          setUser(assertCustomer(profile));
        } catch {
          setAccessToken(null);
          setUser(null);
        }
      } catch {
        if (!cancelled) {
          setAccessToken(null);
          setUser(null);
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      ready,
      async login(identifier, password, rememberMe = false) {
        const session = await apiSend<AuthSessionDto>('/auth/login', { identifier, password, rememberMe });
        persistSession(session);
        try {
          const customer = assertCustomer(session.user);
          setUser(customer);
          return customer;
        } catch (error) {
          setAccessToken(null);
          throw error;
        }
      },
      async register(input) {
        const session = await apiSend<AuthSessionDto>('/auth/register', input);
        persistSession(session);
        const customer = assertCustomer(session.user);
        setUser(customer);
        return customer;
      },
      async logout() {
        await apiSend('/auth/logout', {}).catch(() => undefined);
        setAccessToken(null);
        setUser(null);
      },
      async refreshUser() {
        const profile = await assertCustomer(await apiGet<AuthUserDto>('/auth/me'));
        setUser(profile);
      },
    }),
    [user, ready],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
}
