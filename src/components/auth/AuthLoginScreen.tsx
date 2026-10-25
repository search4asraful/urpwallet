'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import {
  Lock,
  User as UserIcon,
  Shield,
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  Sun,
  Moon,
  CircleDot,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { ThemeMode } from '@/types';

export function AuthLoginScreen() {
  const { login, user, isSetup } = useAuth();
  const { themeMode, setTheme } = useTheme();
  const router = useRouter();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // If already logged in, redirect to dashboard
  useEffect(() => {
    if (user) {
      router.replace('/');
    }
  }, [user, router]);

  // If setup has not been completed, redirect to setup
  useEffect(() => {
    if (!isSetup) {
      router.replace('/setup');
    }
  }, [isSetup, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!identifier.trim() || !password) {
      setError('Please enter your username/email and password.');
      return;
    }

    setLoading(true);
    const result = await login(identifier, password);
    setLoading(false);

    if (!result.success) {
      setError(result.error || 'Invalid credentials.');
    } else {
      router.replace('/');
    }
  };

  const cycleTheme = () => {
    const modes: ThemeMode[] = ['dark', 'light', 'midnight', 'emerald'];
    const nextIdx = (modes.indexOf(themeMode) + 1) % modes.length;
    setTheme(modes[nextIdx]);
  };

  const getThemeIcon = () => {
    switch (themeMode) {
      case 'light':
        return <Sun className="w-3.5 h-3.5" />;
      case 'midnight':
        return <CircleDot className="w-3.5 h-3.5" />;
      case 'emerald':
        return <Sparkles className="w-3.5 h-3.5" />;
      default:
        return <Moon className="w-3.5 h-3.5" />;
    }
  };

  return (
    <div className="min-h-screen bg-theme-app text-theme-main flex flex-col justify-between p-4 sm:p-6 transition-colors">
      {/* Top Header with Brand & Quick Theme Switcher */}
      <header className="w-full max-w-4xl mx-auto flex items-center justify-between py-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-theme-subtle border border-theme flex items-center justify-center p-1.5 shadow-xs">
            <Image src="/icon.svg" alt="urpwallet logo" width={24} height={24} className="w-5 h-5" />
          </div>
          <span className="font-bold text-sm tracking-tight text-theme-title">urpwallet</span>
        </div>

        <button
          type="button"
          onClick={cycleTheme}
          title={`Theme: ${themeMode} (click to cycle)`}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-theme-card hover:bg-theme-subtle border border-theme text-xs text-theme-muted hover:text-theme-title transition-colors cursor-pointer"
        >
          {getThemeIcon()}
          <span className="capitalize text-[11px] font-medium hidden sm:inline">{themeMode}</span>
        </button>
      </header>

      {/* Main Authentication Card */}
      <main className="w-full max-w-sm sm:max-w-md mx-auto my-auto py-8">
        <div className="bg-theme-card border border-theme rounded-2xl p-6 sm:p-8 shadow-xl shadow-black/10">
          {/* Card Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 mb-3 shadow-inner">
              <Lock className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-theme-title">
              Sign In to Wallet
            </h1>
            <p className="text-xs text-theme-muted mt-1 leading-relaxed">
              Unlock your offline accounts and financial records
            </p>
          </div>

          {/* Error Notice */}
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-500 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-theme-muted mb-1.5">
                Username or Email
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 absolute left-3 top-3 text-theme-muted pointer-events-none" />
                <input
                  type="text"
                  required
                  autoComplete="username"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="admin or user@example.com"
                  className="w-full bg-theme-input border border-theme-input rounded-xl pl-9 pr-3.5 py-2.5 text-xs sm:text-sm text-theme-title placeholder:text-theme-faint transition-colors focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-theme-muted mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-3 text-theme-muted pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-theme-input border border-theme-input rounded-xl pl-9 pr-10 py-2.5 text-xs sm:text-sm text-theme-title placeholder:text-theme-faint transition-colors focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-theme-muted hover:text-theme-title transition-colors cursor-pointer"
                  title={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm text-zinc-950 bg-emerald-500 hover:bg-emerald-400 active:scale-[0.99] transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Unlocking wallet...</span>
                </>
              ) : (
                <>
                  <span>Unlock Wallet</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Footer Navigation */}
          <div className="mt-6 pt-4 border-t border-theme flex flex-col items-center justify-center gap-2 text-xs text-theme-muted">
            {!isSetup && (
              <div className="flex items-center gap-1.5 mb-1">
                <span>First time using urpwallet?</span>
                <Link
                  href="/setup"
                  className="text-emerald-500 hover:text-emerald-400 font-semibold underline underline-offset-2 transition-colors"
                >
                  Initial Setup
                </Link>
              </div>
            )}
            <div className="flex items-center gap-1.5 text-[11px] text-theme-faint">
              <Shield className="w-3.5 h-3.5 text-emerald-500" />
              <span>Offline SQLite • Salted Scrypt Cryptography</span>
            </div>
          </div>
        </div>
      </main>

      {/* Subdued Bottom Footnote */}
      <footer className="w-full max-w-4xl mx-auto py-2 text-center text-[11px] text-theme-faint">
        urpwallet — Your Personal Wallet • Open-source & private
      </footer>
    </div>
  );
}

