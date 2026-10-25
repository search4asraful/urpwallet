'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import {
  ShieldCheck,
  Lock,
  User as UserIcon,
  Mail,
  KeyRound,
  AlertCircle,
  Eye,
  EyeOff,
  Sun,
  Moon,
  CircleDot,
  Sparkles,
  Loader2,
  Check,
} from 'lucide-react';
import { ThemeMode } from '@/types';

export function AuthSetupScreen() {
  const { setupMaster, isSetup } = useAuth();
  const { themeMode, setTheme } = useTheme();
  const router = useRouter();

  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // If setup has already been completed, redirect immediately to login
  useEffect(() => {
    if (isSetup) {
      router.replace('/login');
    }
  }, [isSetup, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !username.trim() || !email.trim() || !password) {
      setError('Please fill in all required fields.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long for security.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    setLoading(true);
    const result = await setupMaster(name, username, email, password);
    setLoading(false);

    if (!result.success) {
      if (result.error && (result.error.includes('already been completed') || result.error.includes('already completed'))) {
        setError('Setup has already been completed. Redirecting to login page...');
        setTimeout(() => {
          router.replace('/login');
        }, 1200);
      } else {
        setError(result.error || 'Failed to initialize master account.');
      }
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
      {/* Top Header with Brand & Theme Switcher */}
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

      {/* Main Setup Card */}
      <main className="w-full max-w-md sm:max-w-lg mx-auto my-auto py-8">
        <div className="bg-theme-card border border-theme rounded-2xl p-6 sm:p-8 shadow-xl shadow-black/10">
          {/* Card Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 mb-3 shadow-inner">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-theme-title">
              Initial Master Setup
            </h1>
            <p className="text-xs text-theme-muted mt-1 leading-relaxed">
              Create your primary administrator account to secure your financial records
            </p>
          </div>

          {/* Error Notice */}
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-500 text-xs flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
              {(error.includes('already been completed') || error.includes('already completed')) && (
                <Link
                  href="/login"
                  className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-500 text-zinc-950 hover:bg-emerald-400 transition-colors shrink-0"
                >
                  Go to Login →
                </Link>
              )}
            </div>
          )}

          {/* Setup Form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-theme-muted mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 absolute left-3 top-3 text-theme-muted pointer-events-none" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Asraful Islam"
                  className="w-full bg-theme-input border border-theme-input rounded-xl pl-9 pr-3.5 py-2.5 text-xs sm:text-sm text-theme-title placeholder:text-theme-faint transition-colors focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-theme-muted mb-1.5">
                Username
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-theme-faint text-sm select-none">@</span>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  className="w-full bg-theme-input border border-theme-input rounded-xl pl-8 pr-3 py-2.5 text-xs sm:text-sm text-theme-title placeholder:text-theme-faint transition-colors focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-theme-muted mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-3 text-theme-muted pointer-events-none" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full bg-theme-input border border-theme-input rounded-xl pl-9 pr-3 py-2.5 text-xs sm:text-sm text-theme-title placeholder:text-theme-faint transition-colors focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-theme-muted mb-1.5">
                  Master Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-3 text-theme-muted pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="min. 8 characters"
                    className="w-full bg-theme-input border border-theme-input rounded-xl pl-9 pr-9 py-2.5 text-xs sm:text-sm text-theme-title placeholder:text-theme-faint transition-colors focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
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

              <div>
                <label className="block text-xs font-semibold text-theme-muted mb-1.5">
                  Confirm Password
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 absolute left-3 top-3 text-theme-muted pointer-events-none" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="repeat password"
                    className="w-full bg-theme-input border border-theme-input rounded-xl pl-9 pr-9 py-2.5 text-xs sm:text-sm text-theme-title placeholder:text-theme-faint transition-colors focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-3 text-theme-muted hover:text-theme-title transition-colors cursor-pointer"
                    title={showConfirmPassword ? 'Hide password' : 'Show password'}
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-theme-faint">
              Passwords are salted with 128-bit cryptographic randomness and hashed with scrypt.
            </p>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm text-zinc-950 bg-emerald-500 hover:bg-emerald-400 active:scale-[0.99] transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Initializing wallet...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 stroke-[2.5]" />
                  <span>Initialize Wallet & Secure Account</span>
                </>
              )}
            </button>
          </form>

          {/* Footer Link */}
          <div className="mt-6 pt-4 border-t border-theme flex items-center justify-center gap-1.5 text-xs text-theme-muted">
            <span>Already completed setup?</span>
            <Link
              href="/login"
              className="text-emerald-500 hover:text-emerald-400 font-semibold underline underline-offset-2 transition-colors"
            >
              Sign In to Wallet
            </Link>
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

