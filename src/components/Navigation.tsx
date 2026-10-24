'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  LayoutDashboard, Receipt, PieChart, MoreHorizontal, Plus,
  CreditCard, Calendar, Users, BarChart3, Settings, Eye, EyeOff,
  ArrowDownRight, ArrowUpRight, ArrowLeftRight, Wallet as WalletIcon,
  ChevronRight, Sun, Moon, Monitor, Sparkles, CircleDot, Check
} from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { ThemeMode } from '@/types';
import { Badge, Button } from '@/components/ui';

interface NavigationProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  privacyMode: boolean;
  onTogglePrivacy: () => void;
  onOpenAddModal: (type?: 'expense' | 'income' | 'transfer') => void;
  children?: React.ReactNode;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onSelectTab,
  privacyMode,
  onTogglePrivacy,
  onOpenAddModal,
  children,
}) => {
  const [showFabMenu, setShowFabMenu] = useState(false);
  const [showMoreMobileMenu, setShowMoreMobileMenu] = useState(false);
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const themeMenuRef = useRef<HTMLDivElement>(null);

  const { themeMode, resolvedTheme, systemTheme, setTheme } = useTheme();

  // Close theme dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (themeMenuRef.current && !themeMenuRef.current.contains(event.target as Node)) {
        setShowThemeMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const mainNavItems = [
    { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
    { id: 'transactions', label: 'Transactions', icon: Receipt },
    { id: 'accounts', label: 'Accounts & Cards', icon: CreditCard },
    { id: 'budgets', label: 'Budgets', icon: PieChart },
  ];

  const secondaryNavItems = [
    { id: 'planned', label: 'Recurring & Bills', icon: Calendar },
    { id: 'debts', label: 'Debts & Loans', icon: Users },
    { id: 'reports', label: 'Analytics', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const tabTitles: Record<string, { title: string; subtitle: string }> = {
    dashboard: { title: 'Financial Overview', subtitle: 'Real-time net worth and active balances' },
    transactions: { title: 'Transactions Ledger', subtitle: 'Track and filter every income, expense, and transfer' },
    accounts: { title: 'Accounts & Cards', subtitle: 'Manage cash wallets, bank accounts, and credit limits' },
    budgets: { title: 'Spending Budgets', subtitle: 'Monitor category limits and monthly allowances' },
    planned: { title: 'Recurring & Bills', subtitle: 'Upcoming scheduled expenses and subscriptions' },
    debts: { title: 'Debts & Loans', subtitle: 'Track money you owe and loans owed to you' },
    reports: { title: 'Analytics & Insights', subtitle: 'Cash flow patterns and spending breakdowns' },
    settings: { title: 'Preferences & Storage', subtitle: 'Currencies, themes, categories, and database controls' },
  };

  const themeOptions: { mode: ThemeMode; label: string; icon: React.ElementType; desc: string }[] = [
    { mode: 'system', label: 'System (Auto)', icon: Monitor, desc: `Matches device (${systemTheme})` },
    { mode: 'light', label: 'Light', icon: Sun, desc: 'Clean high-contrast theme' },
    { mode: 'dark', label: 'Dark', icon: Moon, desc: 'Classic Obsidian dark' },
    { mode: 'midnight', label: 'Midnight', icon: CircleDot, desc: 'Pure OLED black' },
    { mode: 'emerald', label: 'Emerald', icon: Sparkles, desc: 'Deep forest finance theme' },
  ];

  return (
    <>
      {/* 1. DESKTOP FULL-HEIGHT SIDEBAR (fixed inset-y-0 left-0 w-64) */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 w-64 bg-theme-sidebar border-r border-theme flex-col z-30 select-none">
        {/* Brand Header */}
        <div className="h-16 px-5 flex items-center gap-3 border-b border-theme shrink-0">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-500 shadow-xs">
            <WalletIcon className="w-5 h-5 text-emerald-500" />
          </div>
          <div>
            <h1 className="text-sm font-extrabold text-theme-title tracking-tight">urpwallet</h1>
            <p className="text-[10px] text-theme-muted font-medium">Your Personal Wallet</p>
          </div>
        </div>

        {/* Scrollable Navigation Body */}
        <div className="flex-1 p-3 space-y-6 overflow-y-auto">
          {/* Main Menu */}
          <div>
            <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-theme-faint">
              Main Menu
            </div>
            <div className="space-y-1">
              {mainNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onSelectTab(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shadow-xs font-bold'
                        : 'text-theme-muted hover:text-theme-title hover:bg-theme-subtle'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-500' : 'text-theme-muted'}`} />
                      <span>{item.label}</span>
                    </div>
                    {isActive && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-xs" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Secondary Tools */}
          <div>
            <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-theme-faint">
              Planning & Tools
            </div>
            <div className="space-y-1">
              {secondaryNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onSelectTab(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shadow-xs font-bold'
                        : 'text-theme-muted hover:text-theme-title hover:bg-theme-subtle'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-500' : 'text-theme-muted'}`} />
                      <span>{item.label}</span>
                    </div>
                    {isActive && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-xs" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Sidebar Footer: Theme bar & Local SQLite */}
        <div className="p-3 border-t border-theme space-y-2 shrink-0 bg-theme-sidebar">
          {/* Quick Theme Selector Bar in Sidebar */}
          <div className="p-1.5 rounded-xl bg-theme-subtle border border-theme flex items-center justify-between">
            {themeOptions.map((opt) => {
              const OptIcon = opt.icon;
              const isSelected = themeMode === opt.mode;
              return (
                <button
                  key={opt.mode}
                  onClick={() => setTheme(opt.mode)}
                  title={`${opt.label}: ${opt.desc}`}
                  className={`relative p-1.5 rounded-lg text-xs transition-all ${
                    isSelected
                      ? 'bg-emerald-500 text-zinc-950 font-bold shadow-xs'
                      : 'text-theme-muted hover:text-theme-title hover:bg-theme-subtle'
                  }`}
                >
                  <OptIcon className="w-3.5 h-3.5" />
                </button>
              );
            })}
          </div>

          {/* SQLite Status Card */}
          <div className="p-2.5 rounded-xl bg-theme-subtle border border-theme text-[11px] text-theme-muted">
            <div className="flex items-center justify-between font-semibold mb-0.5 text-theme-main">
              <span>Local SQLite</span>
            </div>
            <p className="text-[10px] text-theme-faint leading-tight">Instant local persistence with zero network lag.</p>
          </div>
          
          {/* Contributor Info */}
          <div className="text-center text-[10px] text-theme-faint font-medium">
            <span>Open Sourced</span>
            <span>&nbsp; by </span>
            <a href="https://github.com/search4asraful" target="_blank" rel="noopener noreferrer" className="text-theme-muted hover:text-theme-title">Asraful Islam</a>
          </div>
        </div>
      </aside>

      {/* 2. MAIN CONTENT WRAPPER: offset by md:pl-64 so it sits strictly to the right of the sidebar on desktop */}
      <div className="md:pl-64 flex flex-col flex-1 min-h-screen">
        {/* Top App Bar Header */}
        <header className="sticky top-0 z-20 w-full bg-theme-header backdrop-blur-md border-b border-theme px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between gap-4">
            {/* Left: Mobile Brand Logo / Desktop Page Title */}
            <div className="flex items-center gap-3">
              {/* Mobile Brand */}
              <div className="flex md:hidden items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
                  <WalletIcon className="w-4 h-4" />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold text-theme-title tracking-tight">urpwallet</span>
                  <Badge variant="emerald" size="sm">Open Source</Badge>
                </div>
              </div>

              {/* Desktop Current Page Breadcrumb & Title */}
              <div className="hidden md:block">
                <h1 className="text-base font-bold text-theme-title tracking-tight">
                  {tabTitles[activeTab]?.title || 'Overview'}
                </h1>
                <p className="text-[11px] text-theme-muted">
                  {tabTitles[activeTab]?.subtitle || 'Manage your wealth'}
                </p>
              </div>
            </div>

            {/* Right Header Controls */}
            <div className="flex items-center gap-2">
              {/* Multi-Theme Selector Dropdown */}
              <div className="relative" ref={themeMenuRef}>
                <button
                  onClick={() => setShowThemeMenu(!showThemeMenu)}
                  title={`Theme: ${themeMode} (resolved: ${resolvedTheme})`}
                  className="h-8 px-2.5 rounded-lg border border-theme bg-theme-card hover:bg-theme-subtle text-theme-muted hover:text-theme-title text-xs font-medium flex items-center gap-1.5 transition-colors shadow-xs"
                >
                  {themeMode === 'system' && <Monitor className="w-3.5 h-3.5 text-emerald-500" />}
                  {themeMode === 'light' && <Sun className="w-3.5 h-3.5 text-emerald-500" />}
                  {themeMode === 'dark' && <Moon className="w-3.5 h-3.5 text-emerald-500" />}
                  {themeMode === 'midnight' && <CircleDot className="w-3.5 h-3.5 text-emerald-500" />}
                  {themeMode === 'emerald' && <Sparkles className="w-3.5 h-3.5 text-emerald-500" />}
                  <span className="hidden sm:inline text-[11px] capitalize">
                    {themeMode === 'system' ? `Auto (${systemTheme})` : themeMode}
                  </span>
                </button>

                {/* Theme Dropdown Menu */}
                {showThemeMenu && (
                  <div className="absolute right-0 top-10 w-56 bg-theme-card border border-theme rounded-xl p-1.5 shadow-2xl z-50 animate-in zoom-in-95 duration-100">
                    <div className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-theme-faint border-b border-theme mb-1">
                      Appearance & Theme
                    </div>
                    {themeOptions.map((opt) => {
                      const OptIcon = opt.icon;
                      const isSelected = themeMode === opt.mode;
                      return (
                        <button
                          key={opt.mode}
                          onClick={() => {
                            setTheme(opt.mode);
                            setShowThemeMenu(false);
                          }}
                          className={`w-full flex items-center justify-between p-2 rounded-lg text-xs transition-colors ${
                            isSelected
                              ? 'bg-emerald-500/10 text-emerald-500 font-bold'
                              : 'text-theme-muted hover:text-theme-title hover:bg-theme-subtle'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <OptIcon className={`w-4 h-4 ${isSelected ? 'text-emerald-500' : 'text-theme-muted'}`} />
                            <div className="text-left">
                              <div className="font-semibold">{opt.label}</div>
                              <div className="text-[10px] text-theme-faint font-normal">{opt.desc}</div>
                            </div>
                          </div>
                          {isSelected && <Check className="w-3.5 h-3.5 text-emerald-500" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Privacy Mode Toggle */}
              <button
                onClick={onTogglePrivacy}
                title={privacyMode ? 'Show Balances' : 'Mask Balances (Privacy)'}
                className={`h-8 px-2.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-colors ${
                  privacyMode
                    ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                    : 'bg-theme-card text-theme-muted border-theme hover:text-theme-title hover:bg-theme-subtle'
                }`}
              >
                {privacyMode ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline text-[11px]">
                  {privacyMode ? 'Masked' : 'Private'}
                </span>
              </button>

              {/* New Entry Button */}
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Plus className="w-3.5 h-3.5 stroke-[2.5]" />}
                onClick={() => onOpenAddModal('expense')}
                className="h-8"
              >
                <span className="hidden sm:inline">New Entry</span>
                <span className="sm:hidden">Entry</span>
              </Button>
            </div>
          </div>
        </header>

        {/* Children (Main section) */}
        {children}
      </div>

      {/* 3. MOBILE BOTTOM NAVIGATION (Fixed bottom on small screens) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-theme-sidebar/95 backdrop-blur-lg border-t border-theme px-2 py-1.5">
        <div className="relative flex items-center justify-around max-w-md mx-auto">
          {/* Overview */}
          <button
            onClick={() => {
              setShowMoreMobileMenu(false);
              onSelectTab('dashboard');
            }}
            className={`flex flex-col items-center gap-1 py-1 text-[10px] font-medium transition-colors ${
              activeTab === 'dashboard' ? 'text-emerald-500 font-bold' : 'text-theme-muted'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Overview</span>
          </button>

          {/* Transactions */}
          <button
            onClick={() => {
              setShowMoreMobileMenu(false);
              onSelectTab('transactions');
            }}
            className={`flex flex-col items-center gap-1 py-1 text-[10px] font-medium transition-colors ${
              activeTab === 'transactions' ? 'text-emerald-500 font-bold' : 'text-theme-muted'
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>Records</span>
          </button>

          {/* Center FAB */}
          <div className="relative -top-3">
            <button
              onClick={() => setShowFabMenu(!showFabMenu)}
              className="w-11 h-11 rounded-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 flex items-center justify-center shadow-md active:scale-95 transition-all"
            >
              <Plus className={`w-5 h-5 stroke-[2.5] transition-transform ${showFabMenu ? 'rotate-45' : ''}`} />
            </button>

            {/* Quick Action Popover */}
            {showFabMenu && (
              <div className="absolute bottom-14 left-1/2 -translate-x-1/2 w-44 bg-theme-card border border-theme rounded-xl p-1.5 shadow-2xl flex flex-col gap-1 animate-in zoom-in-95 duration-100">
                <button
                  onClick={() => {
                    setShowFabMenu(false);
                    onOpenAddModal('expense');
                  }}
                  className="flex items-center gap-2 p-2 rounded-lg text-xs font-semibold text-rose-500 hover:bg-theme-subtle transition-colors"
                >
                  <ArrowDownRight className="w-3.5 h-3.5" /> Expense
                </button>
                <button
                  onClick={() => {
                    setShowFabMenu(false);
                    onOpenAddModal('income');
                  }}
                  className="flex items-center gap-2 p-2 rounded-lg text-xs font-semibold text-emerald-500 hover:bg-theme-subtle transition-colors"
                >
                  <ArrowUpRight className="w-3.5 h-3.5" /> Income
                </button>
                <button
                  onClick={() => {
                    setShowFabMenu(false);
                    onOpenAddModal('transfer');
                  }}
                  className="flex items-center gap-2 p-2 rounded-lg text-xs font-semibold text-sky-500 hover:bg-theme-subtle transition-colors"
                >
                  <ArrowLeftRight className="w-3.5 h-3.5" /> Transfer
                </button>
              </div>
            )}
          </div>

          {/* Budgets */}
          <button
            onClick={() => {
              setShowMoreMobileMenu(false);
              onSelectTab('budgets');
            }}
            className={`flex flex-col items-center gap-1 py-1 text-[10px] font-medium transition-colors ${
              activeTab === 'budgets' ? 'text-emerald-500 font-bold' : 'text-theme-muted'
            }`}
          >
            <PieChart className="w-4 h-4" />
            <span>Budgets</span>
          </button>

          {/* More Sheet */}
          <button
            onClick={() => setShowMoreMobileMenu(!showMoreMobileMenu)}
            className={`flex flex-col items-center gap-1 py-1 text-[10px] font-medium transition-colors ${
              ['accounts', 'planned', 'debts', 'reports', 'settings'].includes(activeTab) || showMoreMobileMenu
                ? 'text-emerald-500 font-bold'
                : 'text-theme-muted'
            }`}
          >
            <MoreHorizontal className="w-4 h-4" />
            <span>More</span>
          </button>
        </div>
      </div>

      {/* 4. MOBILE DRAWER */}
      {showMoreMobileMenu && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex flex-col justify-end">
          <div className="bg-theme-card border-t border-theme rounded-t-2xl p-4 pb-20 space-y-1 animate-in slide-in-from-bottom duration-150">
            <div className="w-10 h-1 bg-theme-subtle rounded-full mx-auto mb-3" />
            <div className="text-[10px] font-bold uppercase tracking-wider text-theme-faint px-2 mb-1">
              All Sections
            </div>
            {[
              { id: 'accounts', label: 'Accounts & Cards', icon: CreditCard },
              { id: 'planned', label: 'Recurring & Bills', icon: Calendar },
              { id: 'debts', label: 'Debts & Loans', icon: Users },
              { id: 'reports', label: 'Analytics & Reports', icon: BarChart3 },
              { id: 'settings', label: 'Settings & Preferences', icon: Settings },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setShowMoreMobileMenu(false);
                    onSelectTab(item.id);
                  }}
                  className="w-full flex items-center justify-between p-2.5 rounded-lg text-xs font-semibold text-theme-main hover:bg-theme-subtle transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4 text-emerald-500" />
                    {item.label}
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-theme-faint" />
                </button>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
};
