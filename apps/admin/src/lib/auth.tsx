'use client';

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { isStaffRole, type AuthSessionDto, type AuthUserDto, type RoleName } from '@stormfiber/types';
import { apiGet, apiSend, getAccessToken, persistSession, refreshSession, setAccessToken } from './api';

interface AuthContextValue {
  user: AuthUserDto | null;
  ready: boolean;
  login: (identifier: string, password: string) => Promise<AuthUserDto>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function assertStaff(user: AuthUserDto): AuthUserDto {
  if (!user.roles.some((role) => isStaffRole(role as RoleName))) {
    throw new Error('This console is for staff accounts only');
  }
  return user;
}

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
          setUser(assertStaff(profile));
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
      async login(identifier, password) {
        const session = await apiSend<AuthSessionDto>('/auth/login', {
          identifier,
          password,
          rememberMe: true,
        });
        persistSession(session);
        try {
          const staff = assertStaff(session.user);
          setUser(staff);
          return staff;
        } catch (error) {
          setAccessToken(null);
          throw error;
        }
      },
      async logout() {
        await apiSend('/auth/logout', {}).catch(() => undefined);
        setAccessToken(null);
        setUser(null);
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
