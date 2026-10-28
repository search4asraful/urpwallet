'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useSyncExternalStore } from 'react';
import { ThemeMode } from '@/types';

export type ResolvedTheme = 'dark' | 'light' | 'midnight' | 'emerald';

interface ThemeContextType {
  themeMode: ThemeMode;
  resolvedTheme: ResolvedTheme;
  systemTheme: 'dark' | 'light';
  setTheme: (theme: ThemeMode) => void;
}

const emptySubscribe = () => () => {};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function getSystemTheme(): 'dark' | 'light' {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function resolveTheme(mode: ThemeMode, sysTheme: 'dark' | 'light'): ResolvedTheme {
  if (mode === 'system') {
    return sysTheme;
  }
  return mode as ResolvedTheme;
}

function applyThemeToDOM(resolved: ResolvedTheme) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;

  // Trigger smooth transition
  root.classList.add('theme-transitioning');

  root.setAttribute('data-theme', resolved);
  if (resolved === 'light') {
    root.classList.remove('dark');
    root.classList.add('light');
  } else {
    root.classList.remove('light');
    root.classList.add('dark');
  }

  // Remove transition class after animation completes
  setTimeout(() => {
    root.classList.remove('theme-transitioning');
  }, 250);
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [systemTheme, setSystemTheme] = useState<'dark' | 'light'>(() => getSystemTheme());
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => {
    if (typeof window === 'undefined') return 'system';
    return ((localStorage.getItem('urpwallet_theme') || localStorage.getItem('wallet_theme')) as ThemeMode) || 'system';
  });
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);

  // Initialize theme on mount
  useEffect(() => {
    const sys = getSystemTheme();
    const savedMode = ((localStorage.getItem('urpwallet_theme') || localStorage.getItem('wallet_theme')) as ThemeMode) || 'system';
    const resolved = resolveTheme(savedMode, sys);
    applyThemeToDOM(resolved);
  }, []);

  // System theme change listener (auto-detection)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      const newSysTheme = e.matches ? 'dark' : 'light';
      setSystemTheme(newSysTheme);

      // If user is on 'system' mode, update active theme immediately
      setThemeModeState((currentMode) => {
        if (currentMode === 'system') {
          applyThemeToDOM(newSysTheme);
        }
        return currentMode;
      });
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const setTheme = useCallback(
    (newMode: ThemeMode) => {
      setThemeModeState(newMode);
      try {
        localStorage.setItem('urpwallet_theme', newMode);
      } catch (e) {
        console.error('Failed to save theme in localStorage', e);
      }

      const resolved = resolveTheme(newMode, systemTheme);
      applyThemeToDOM(resolved);

      // Persist to server settings DB in background
      fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: newMode }),
      }).catch((err) => console.warn('Could not sync theme to database:', err));
    },
    [systemTheme]
  );

  const resolvedTheme = resolveTheme(themeMode, systemTheme);

  return (
    <ThemeContext.Provider
      value={{
        themeMode,
        resolvedTheme,
        systemTheme,
        setTheme,
      }}
    >
      <div className={!mounted ? 'invisible' : undefined}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
};

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
