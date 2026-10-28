'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { UserSafe, AuthContextType } from '@/types';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserSafe | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSetup, setIsSetup] = useState<boolean>(true);

  const checkAuth = useCallback(async () => {
    try {
      setIsLoading(true);

      // Check setup status first (ensure fresh response)
      const statusRes = await fetch('/api/auth/setup-status', {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
      });
      if (statusRes.ok) {
        const statusData = await statusRes.json();
        setIsSetup(statusData.isSetup);

        if (!statusData.isSetup) {
          setUser(null);
          setIsLoading(false);
          return;
        }
      }

      // Check current user session (ensure fresh response)
      const meRes = await fetch('/api/auth/me', {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
      });
      if (meRes.ok) {
        const meData = await meRes.json();
        setUser(meData.user || null);
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error('Failed to check authentication:', err);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      checkAuth();
    }, 0);
    return () => clearTimeout(timer);
  }, [checkAuth]);

  const login = async (identifier: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Login failed.' };
      }

      setUser(data.user);
      setIsSetup(true);
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: (err as Error).message || 'Network error during login.' };
    }
  };

  const setupMaster = async (
    name: string,
    username: string,
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/auth/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, username, email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        // If the server confirms setup is already done, mark isSetup to true
        if (data.error && (data.error.includes('already been completed') || data.error.includes('already completed'))) {
          setIsSetup(true);
        }
        return { success: false, error: data.error || 'Setup failed.' };
      }

      setUser(data.user);
      setIsSetup(true);
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: (err as Error).message || 'Network error during setup.' };
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setUser(null);
    }
  };

  const isAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isSetup,
        isAdmin,
        login,
        setupMaster,
        logout,
        refreshAuth: checkAuth,
        setIsSetup,
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
