'use client';

import React, { useState } from 'react';
import {
  Download, Upload, RefreshCw, Eye, EyeOff, Plus, Trash2, Check,
  Smartphone, Database, Shield, Palette, Sun, Moon, Monitor,
  Sparkles, CircleDot, Cloud, CloudUpload, KeyRound, ShieldCheck,
  ShieldAlert, Lock
} from 'lucide-react';
import { Category, ThemeMode, Transaction } from '@/types';
import { CategoryIcon } from './CategoryIcon';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { ChangePasswordModal } from './auth/ChangePasswordModal';
import { UserManagementSection } from './auth/UserManagementSection';
import { Card, Button, Input, Select, Badge } from '@/components/ui';

interface SettingsViewProps {
  baseCurrency: string;
  privacyMode: boolean;
  categories: Category[];
  transactions?: Transaction[];
  onUpdateCurrency: (currency: string) => void;
  onTogglePrivacy: () => void;
  onSeedData: () => void;
  onAddCategory: (cat: Partial<Category>) => void;
  onDeleteCategory: (id: string) => void;
  onOpenImport?: () => void;
  onOpenGDrive?: () => void;
}

const AVAILABLE_CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'BDT', symbol: '৳', name: 'Bangladeshi Taka' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'AU$', name: 'Australian Dollar' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
];

const PRESET_COLORS = [
  '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B',
  '#06B6D4', '#F43F5E', '#14B8A6', '#6366F1', '#64748B'
];

export const SettingsView: React.FC<SettingsViewProps> = ({
  baseCurrency,
  privacyMode,
  categories,
  transactions,
  onUpdateCurrency,
  onTogglePrivacy,
  onSeedData,
  onAddCategory,
  onDeleteCategory,
  onOpenImport,
  onOpenGDrive,
}) => {
  const [showAddCat, setShowAddCat] = useState(false);
  const [catName, setCatName] = useState('');
  const [catType, setCatType] = useState<'expense' | 'income'>('expense');
  const [catColor, setCatColor] = useState('#10B981');
  const [catIcon] = useState('Tag');
  const [seedLoading, setSeedLoading] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);

  const { themeMode, resolvedTheme, systemTheme, setTheme } = useTheme();
  const { user, isAdmin } = useAuth();

  const txCountMap = React.useMemo(() => {
    const map: Record<string, number> = {};
    if (transactions) {
      for (const t of transactions) {
        if (t.category_id) {
          map[t.category_id] = (map[t.category_id] || 0) + 1;
        }
      }
    }
    return map;
  }, [transactions]);

  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;

    onAddCategory({
      name: catName.trim(),
      type: catType,
      color: catColor,
      icon: catIcon,
    });

    setCatName('');
    setShowAddCat(false);
  };

  const handleSeed = async () => {
    if (confirm('Reset and load fresh demo sample data?')) {
      setSeedLoading(true);
      await onSeedData();
      setSeedLoading(false);
    }
  };

  const themeOptionsList: {
    mode: ThemeMode;
    label: string;
    description: string;
    icon: React.ElementType;
    previewBg: string;
    previewCard: string;
    previewAccent: string;
    badge?: string;
  }[] = [
    {
      mode: 'system',
      label: 'System Auto-Detect',
      description: `Automatically adapts to your OS preference (${systemTheme.toUpperCase()})`,
      icon: Monitor,
      previewBg: systemTheme === 'dark' ? '#090a0f' : '#f4f5f8',
      previewCard: systemTheme === 'dark' ? '#12151c' : '#ffffff',
      previewAccent: '#10B981',
      badge: `Active: ${systemTheme}`,
    },
    {
      mode: 'light',
      label: 'Clean Light',
      description: 'High contrast crisp slate and pure white card surfaces',
      icon: Sun,
      previewBg: '#f4f5f8',
      previewCard: '#ffffff',
      previewAccent: '#10B981',
    },
    {
      mode: 'dark',
      label: 'Dark Obsidian',
      description: 'Sleek deep obsidian with emerald financial highlights',
      icon: Moon,
      previewBg: '#090a0f',
      previewCard: '#12151c',
      previewAccent: '#10B981',
    },
    {
      mode: 'midnight',
      label: 'Midnight OLED',
      description: 'True pure black (#000000) for OLED panels & zero glow',
      icon: CircleDot,
      previewBg: '#000000',
      previewCard: '#09090b',
      previewAccent: '#10B981',
    },
    {
      mode: 'emerald',
      label: 'Emerald Forest',
      description: 'Deep finance forest green tint with glowing accents',
      icon: Sparkles,
      previewBg: '#06110d',
      previewCard: '#0b1a14',
      previewAccent: '#34D399',
    },
  ];

  return (
    <div className="space-y-6 pb-20 md:pb-8 max-w-6xl mx-auto w-full animate-in fade-in duration-200">
      <div>
        <h1 className="text-xl font-bold text-theme-title tracking-tight">Settings & Preferences</h1>
        <p className="text-xs text-theme-muted mt-0.5">
          Configure security, visual themes, currency, categories, and data portability
        </p>
      </div>

      {/* 1. ACCOUNT & ACCESS CONTROL (Unified) */}
      {user && (
        <Card className="p-5 md:p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 font-bold text-base shadow-inner">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-theme-title">{user.name}</span>
                  <Badge
                    variant={isAdmin ? 'purple' : 'neutral'}
                    size="xs"
                  >
                    {isAdmin ? 'Administrator' : 'Member'}
                  </Badge>
                </div>
                <div className="text-xs text-theme-muted flex items-center gap-2 mt-0.5">
                  <span className="font-mono text-[11px]">@{user.username}</span>
                  <span>•</span>
                  <span>{user.email}</span>
                </div>
              </div>
            </div>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => setChangePasswordOpen(true)}
              leftIcon={<KeyRound className="w-3.5 h-3.5 text-theme-muted" />}
              className="self-start sm:self-auto"
            >
              Change Password
            </Button>
          </div>

          {/* User Management for Admins */}
          {isAdmin && (
            <div className="pt-5 border-t border-theme">
              <UserManagementSection currentUserId={user.id} />
            </div>
          )}
        </Card>
      )}

      {/* 2. THEME & VISUAL APPEARANCE */}
      <Card className="p-5 md:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-theme-muted flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-emerald-500" />
              Theme & Visual Appearance
            </h2>
            <p className="text-[11px] text-theme-faint mt-0.5">
              Select your preferred visual style or adapt automatically to system settings
            </p>
          </div>
          <Badge variant="emerald" size="xs">
            {themeMode}
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
          {themeOptionsList.map((opt) => {
            const Icon = opt.icon;
            const isSelected = themeMode === opt.mode;

            return (
              <button
                key={opt.mode}
                type="button"
                onClick={() => setTheme(opt.mode)}
                className={`relative flex flex-col justify-between p-3.5 rounded-xl border text-left transition-all cursor-pointer group ${
                  isSelected
                    ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-theme-subtle shadow-xs'
                    : 'border-theme bg-theme-card hover:bg-theme-subtle hover:border-theme-strong'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                          isSelected
                            ? 'bg-emerald-500 text-zinc-950 font-bold'
                            : 'bg-theme-subtle text-theme-muted group-hover:text-theme-title'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-bold text-theme-title">{opt.label}</span>
                    </div>

                    {isSelected ? (
                      <div className="w-5 h-5 rounded-full bg-emerald-500 text-zinc-950 flex items-center justify-center shadow-xs">
                        <Check className="w-3 h-3 stroke-3" />
                      </div>
                    ) : opt.badge ? (
                      <Badge variant="neutral" size="xs">
                        {opt.badge}
                      </Badge>
                    ) : null}
                  </div>

                  <p className="text-[11px] text-theme-muted leading-relaxed mb-3">
                    {opt.description}
                  </p>
                </div>

                {/* Miniature surface color preview */}
                <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-theme-subtle border border-theme">
                  <div
                    className="w-3.5 h-3.5 rounded-sm border border-white/20 shadow-xs"
                    style={{ backgroundColor: opt.previewBg }}
                    title="App background"
                  />
                  <div
                    className="w-3.5 h-3.5 rounded-sm border border-white/20 shadow-xs"
                    style={{ backgroundColor: opt.previewCard }}
                    title="Card surface"
                  />
                  <div
                    className="w-3.5 h-3.5 rounded-sm border border-white/20 shadow-xs"
                    style={{ backgroundColor: opt.previewAccent }}
                    title="Accent highlight"
                  />
                  <span className="text-[10px] text-theme-faint ml-auto font-medium">Preview</span>
                </div>
              </button>
            );
          })}
        </div>
      </Card>

      {/* 3. DISPLAY & REGIONAL PREFERENCES */}
      <Card className="p-5 md:p-6 space-y-4">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-theme-muted flex items-center gap-1.5">
            <Smartphone className="w-3.5 h-3.5 text-emerald-500" />
            Display & Regional Preferences
          </h2>
          <p className="text-[11px] text-theme-faint mt-0.5">
            Configure default currency formatting and public screen privacy
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          {/* Base Currency */}
          <div className="p-3.5 rounded-xl bg-theme-subtle border border-theme flex flex-col justify-between gap-3">
            <div>
              <div className="text-xs font-semibold text-theme-title">Base Currency</div>
              <p className="text-[11px] text-theme-muted mt-0.5">Primary currency for net worth and global conversions</p>
            </div>
            <Select
              value={baseCurrency}
              onChange={(e) => onUpdateCurrency(e.target.value)}
              className="w-full text-xs font-semibold"
            >
              {AVAILABLE_CURRENCIES.map((c) => (
                <option key={c.code} value={c.code} className="bg-theme-card text-theme-title">
                  {c.code} ({c.symbol}) — {c.name}
                </option>
              ))}
            </Select>
          </div>

          {/* Privacy Mode */}
          <div className="p-3.5 rounded-xl bg-theme-subtle border border-theme flex flex-col justify-between gap-3">
            <div>
              <div className="text-xs font-semibold text-theme-title flex items-center justify-between">
                <span>Privacy Mode</span>
                <Badge variant={privacyMode ? 'emerald' : 'neutral'} size="xs">
                  {privacyMode ? 'Masked' : 'Visible'}
                </Badge>
              </div>
              <p className="text-[11px] text-theme-muted mt-0.5">
                Obscures balance figures with •••••• to protect your financial privacy in public spaces
              </p>
            </div>
            <Button
              size="sm"
              variant={privacyMode ? 'emerald-subtle' : 'secondary'}
              onClick={onTogglePrivacy}
              leftIcon={privacyMode ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              className="w-full justify-center"
            >
              {privacyMode ? 'Disable Privacy Mode' : 'Enable Privacy Mode'}
            </Button>
          </div>
        </div>
      </Card>

      {/* 4. CATEGORIES MANAGER */}
      <Card className="p-5 md:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-theme-muted">Category Catalog</h2>
            <p className="text-[11px] text-theme-muted">Manage transaction spending & income categories ({categories.length} total)</p>
          </div>
          <Button
            size="xs"
            variant="emerald-subtle"
            onClick={() => setShowAddCat(!showAddCat)}
            leftIcon={<Plus className="w-3 h-3" />}
          >
            {showAddCat ? 'Close Form' : 'New'}
          </Button>
        </div>

        {/* Inline Add Category Form */}
        {showAddCat && (
          <form onSubmit={handleCreateCategory} className="p-3.5 bg-theme-subtle border border-theme rounded-xl space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <Input
                placeholder="Category Name"
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                required
              />
              <Select
                value={catType}
                onChange={(e) => setCatType(e.target.value as 'expense' | 'income')}
              >
                <option value="expense">Expense Category</option>
                <option value="income">Income Category</option>
              </Select>
            </div>

            {/* Color swatches */}
            <div>
              <label className="block text-[11px] font-semibold text-theme-muted mb-1.5">Color Tag</label>
              <div className="flex items-center gap-2 flex-wrap">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCatColor(c)}
                    className={`w-5 h-5 rounded-full transition-all cursor-pointer ${
                      catColor === c ? 'scale-125 ring-2 ring-emerald-500 shadow-xs' : 'opacity-70 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1 border-t border-theme">
              <Button
                variant="ghost"
                size="xs"
                onClick={() => setShowAddCat(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="xs"
                leftIcon={<Check className="w-3 h-3" />}
              >
                Save Category
              </Button>
            </div>
          </form>
        )}

        {/* Category list */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 max-h-64 overflow-y-auto pr-1">
          {categories.map((c) => {
            const inUseCount = txCountMap[c.id] || 0;
            return (
              <div
                key={c.id}
                className="flex items-center justify-between p-2.5 bg-theme-subtle border border-theme rounded-xl group hover:border-theme-strong transition-colors"
              >
                <div className="flex items-center gap-2 truncate">
                  <div
                    className="w-6 h-6 rounded-lg flex items-center justify-center text-white shrink-0 text-[10px] shadow-xs"
                    style={{ backgroundColor: c.color }}
                  >
                    <CategoryIcon name={c.icon} className="w-3 h-3" />
                  </div>
                  <div className="truncate">
                    <div className="text-[11px] font-semibold text-theme-title truncate">{c.name}</div>
                    <div className="text-[9px] text-theme-faint capitalize">
                      {c.type}
                      {inUseCount > 0 && (
                        <span className="ml-1 text-[9px] text-emerald-500 font-medium">
                          • {inUseCount} tx{inUseCount > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    if (inUseCount > 0) {
                      alert(
                        `Cannot delete category "${c.name}": it is currently assigned to ${inUseCount} transaction${
                          inUseCount === 1 ? '' : 's'
                        }. Reassign or delete those transactions first.`
                      );
                      return;
                    }
                    if (confirm(`Delete category "${c.name}"?`)) {
                      onDeleteCategory(c.id);
                    }
                  }}
                  className={`p-1 rounded-md transition-opacity cursor-pointer ${
                    inUseCount > 0
                      ? 'opacity-30 hover:opacity-100 text-theme-faint hover:text-amber-500 cursor-not-allowed'
                      : 'opacity-0 group-hover:opacity-100 text-theme-faint hover:text-rose-500'
                  }`}
                  title={
                    inUseCount > 0
                      ? `Assigned to ${inUseCount} transactions (locked)`
                      : 'Delete category'
                  }
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>
      </Card>

      {/* 5. DATA MANAGEMENT & BACKUP */}
      <Card className="p-5 md:p-6 space-y-4">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-theme-muted flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-sky-500" />
            Data Backup, Import & Portability
          </h2>
          <p className="text-[11px] text-theme-faint mt-0.5">
            Your data is stored locally in offline SQLite. <br />Export backups or sync securely with cloud storage.
          </p>
        </div>

        {/* Google Drive Integration */}
        {onOpenGDrive && (
          <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 hover:border-emerald-500/30 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-emerald-500 shrink-0">
                <Cloud className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <div className="text-xs font-bold text-theme-title">Google Drive Cloud Backup</div>
                  <Badge variant="emerald" size="xs">Cloud Sync</Badge>
                </div>
                <p className="text-[11px] text-theme-muted mt-0.5">
                  Automated background snapshots and multi-device cloud restore using your own credentials.
                </p>
              </div>
            </div>

            <Button
              size="xs"
              variant="primary"
              onClick={onOpenGDrive}
              leftIcon={<CloudUpload className="w-3.5 h-3.5" />}
              className="shrink-0 self-start sm:self-auto"
            >
              Manage Google Drive
            </Button>
          </div>
        )}

        {/* Data Action Cards (Zero Redundancy) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div
            onClick={onOpenImport}
            className="flex items-center justify-between p-3.5 bg-theme-subtle hover:bg-theme-subtle-hover border border-theme rounded-xl transition-colors cursor-pointer group"
          >
            <div>
              <div className="text-xs font-bold text-theme-title group-hover:text-emerald-500 transition-colors">
                Import Ledger
              </div>
              <p className="text-[10px] text-theme-muted mt-0.5">Restore .json backup or bank .csv transactions</p>
            </div>
            <Upload className="w-4 h-4 text-theme-muted group-hover:text-emerald-500 transition-colors shrink-0 ml-2" />
          </div>

          <a
            href="/api/export?format=json"
            download
            className="flex items-center justify-between p-3.5 bg-theme-subtle hover:bg-theme-subtle-hover border border-theme rounded-xl transition-colors group"
          >
            <div>
              <div className="text-xs font-bold text-theme-title group-hover:text-sky-500 transition-colors">
                JSON Database Backup
              </div>
              <p className="text-[10px] text-theme-muted mt-0.5">Complete export of accounts, budgets & ledger</p>
            </div>
            <Download className="w-4 h-4 text-theme-muted group-hover:text-sky-500 transition-colors shrink-0 ml-2" />
          </a>

          <a
            href="/api/export?format=csv"
            download
            className="flex items-center justify-between p-3.5 bg-theme-subtle hover:bg-theme-subtle-hover border border-theme rounded-xl transition-colors group"
          >
            <div>
              <div className="text-xs font-bold text-theme-title group-hover:text-emerald-500 transition-colors">
                CSV Ledger Export
              </div>
              <p className="text-[10px] text-theme-muted mt-0.5">Compatible with Excel, Google Sheets & Numbers</p>
            </div>
            <Download className="w-4 h-4 text-theme-muted group-hover:text-emerald-500 transition-colors shrink-0 ml-2" />
          </a>
        </div>
      </Card>

      {/* 6. SAMPLE DEMO DATA (Admin Only) */}
      <Card className="p-5 md:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-semibold text-theme-title flex items-center gap-1.5">
            <RefreshCw className="w-3.5 h-3.5 text-amber-500" />
            Sample Demo Ledger
            {!isAdmin && (
              <span className="text-[10px] text-amber-500 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded-full flex items-center gap-1 font-medium">
                <Lock className="w-2.5 h-2.5" />
                Admin Only
              </span>
            )}
          </div>
          <p className="text-[11px] text-theme-muted mt-0.5">
            Reset database with authentic multi-account financial records and test data
            {!isAdmin && ' (Requires Administrator role)'}
          </p>
        </div>

        <Button
          onClick={handleSeed}
          disabled={!isAdmin}
          isLoading={seedLoading}
          variant="secondary"
          size="sm"
          leftIcon={<RefreshCw className={`w-3 h-3 ${seedLoading ? 'animate-spin' : ''}`} />}
          className="text-amber-500 border-amber-500/30 hover:bg-amber-500/10 self-start sm:self-auto disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Reset & Seed Demo
        </Button>
      </Card>

      {/* FOOTNOTE */}
      <div className="p-3 rounded-xl bg-theme-subtle border border-theme text-center text-[11px] text-theme-muted flex items-center justify-center gap-1.5">
        <Smartphone className="w-3.5 h-3.5 text-emerald-500" />
        <span>urpwallet • Open Source Personal Finance • Offline Local SQLite</span>
      </div>

      {/* CHANGE PASSWORD MODAL */}
      <ChangePasswordModal
        isOpen={changePasswordOpen}
        onClose={() => setChangePasswordOpen(false)}
      />
    </div>
  );
};

