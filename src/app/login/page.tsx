'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { AuthLoginScreen } from '@/components/auth/AuthLoginScreen';

export default function LoginPage() {
  const { user, isLoading, isSetup } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!isSetup) {
        router.replace('/setup');
      } else if (user) {
        router.replace('/');
      }
    }
  }, [isLoading, isSetup, user, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400">
        <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 mb-3 animate-pulse">
          <span className="font-bold text-base">W</span>
        </div>
        <p className="text-xs font-medium text-slate-400">Verifying secure session...</p>
      </div>
    );
  }

  if (!isSetup || user) {
    return null;
  }

  return <AuthLoginScreen />;
}
