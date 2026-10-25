'use client';

import React, { useState, useMemo } from 'react';
import {
  Plus,
  ArrowLeftRight,
  Edit3,
  Trash2,
  Wallet,
  TrendingUp,
  CreditCard,
} from 'lucide-react';
import { Account, AccountType } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { CategoryIcon } from './CategoryIcon';
import { Card, Button, Badge, EmptyState, StatCard, Tabs } from '@/components/ui';

interface AccountsViewProps {
  accounts: Account[];
  privacyMode: boolean;
  baseCurrency: string;
  onOpenAddAccount: () => void;
  onEditAccount: (acc: Account) => void;
  onDeleteAccount: (id: string) => void;
  onOpenTransfer: () => void;
}

type FilterTab = 'all' | 'assets' | 'liabilities';

const TYPE_CONFIG: Record<
  AccountType,
  {
    label: string;
    badgeVariant: 'emerald' | 'sky' | 'purple' | 'amber' | 'rose' | 'neutral';
    balanceLabel: string;
    isLiability: boolean;
  }
> = {
  bank: {
    label: 'Checking / Bank',
    badgeVariant: 'sky',
    balanceLabel: 'Available Balance',
    isLiability: false,
  },
  cash: {
    label: 'Cash Wallet',
    badgeVariant: 'emerald',
    balanceLabel: 'Cash in Hand',
    isLiability: false,
  },
  savings: {
    label: 'Savings & Goal',
    badgeVariant: 'purple',
    balanceLabel: 'Saved Capital',
    isLiability: false,
  },
  investment: {
    label: 'Investments',
    badgeVariant: 'sky',
    balanceLabel: 'Portfolio Value',
    isLiability: false,
  },
  credit_card: {
    label: 'Credit Card',
    badgeVariant: 'amber',
    balanceLabel: 'Current Balance',
    isLiability: true,
  },
  loan: {
    label: 'Loan / Mortgage',
    badgeVariant: 'rose',
    balanceLabel: 'Principal Owed',
    isLiability: true,
  },
};

export const AccountsView: React.FC<AccountsViewProps> = ({
  accounts,
  privacyMode,
  baseCurrency,
  onOpenAddAccount,
  onEditAccount,
  onDeleteAccount,
  onOpenTransfer,
}) => {
  const [filterTab, setFilterTab] = useState<FilterTab>('all');

  // Segregate into Assets vs Liabilities
  const { assetAccounts, liabilityAccounts, netWorth, totalAssets, totalLiabilities } = useMemo(() => {
    const assets = accounts.filter((a) => !TYPE_CONFIG[a.type]?.isLiability);
    const liabilities = accounts.filter((a) => TYPE_CONFIG[a.type]?.isLiability);

    const nw = accounts.reduce((sum, a) => sum + (a.balance || 0), 0);
    const tAssets = assets.reduce((sum, a) => sum + Math.max(0, a.balance || 0), 0);
    const tLiabilities = liabilities.reduce((sum, a) => sum + Math.abs(a.balance || 0), 0);

    return {
      assetAccounts: assets,
      liabilityAccounts: liabilities,
      netWorth: nw,
      totalAssets: tAssets,
      totalLiabilities: tLiabilities,
    };
  }, [accounts]);

  const handleDelete = (acc: Account) => {
    if (confirm(`Delete account "${acc.name}"? Transactions tied to this account will be removed.`)) {
      onDeleteAccount(acc.id);
    }
  };

  const tabItems = [
    {
      id: 'all' as FilterTab,
      label: 'All Accounts',
      count: accounts.length,
      activeColor: 'emerald' as const,
    },
    {
      id: 'assets' as FilterTab,
      label: 'Assets & Cash',
      count: assetAccounts.length,
      activeColor: 'emerald' as const,
    },
    {
      id: 'liabilities' as FilterTab,
      label: 'Liabilities & Credit',
      count: liabilityAccounts.length,
      activeColor: 'rose' as const,
    },
  ];

  const renderAccountCard = (acc: Account) => {
    const config = TYPE_CONFIG[acc.type] || {
      label: acc.type,
      badgeVariant: 'neutral',
      balanceLabel: 'Balance',
      isLiability: false,
    };

    return (
      <Card
        key={acc.id}
        hoverable
        className="p-4 flex flex-col justify-between min-h-35.5 group border-theme hover:border-theme-strong transition-all relative overflow-hidden"
      >
        {/* Top subtle color indicator line */}
        <div
          className="absolute top-0 left-0 right-0 h-1"
          style={{ backgroundColor: acc.color }}
        />

        <div>
          {/* Card Top: Icon, Title, Badges and Actions */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0 shadow-xs"
                style={{ backgroundColor: acc.color }}
              >
                <CategoryIcon name={acc.icon} className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div
                  onClick={() => onEditAccount(acc)}
                  className="text-xs font-bold text-theme-title group-hover:text-emerald-500 transition-colors truncate cursor-pointer"
                  title={acc.name}
                >
                  {acc.name}
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                  <Badge variant={config.badgeVariant} size="xs">
                    {config.label}
                  </Badge>
                  <Badge variant="neutral" size="xs">
                    {acc.currency}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-0.5 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => onEditAccount(acc)}
                title="Edit account"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => handleDelete(acc)}
                className="hover:text-rose-500"
                title="Delete account"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Card Bottom: Balance & Transfer button */}
        <div className="mt-4 pt-2.5 border-t border-theme flex items-end justify-between gap-2">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-theme-muted block leading-none mb-1">
              {config.balanceLabel}
            </span>
            <span
              className={`text-lg font-extrabold tabular-nums tracking-tight leading-none ${
                acc.balance < 0 ? 'text-rose-500' : 'text-theme-title'
              }`}
            >
              {formatCurrency(acc.balance, acc.currency, privacyMode)}
            </span>
          </div>

          <Button
            variant="secondary"
            size="xs"
            onClick={onOpenTransfer}
            leftIcon={<ArrowLeftRight className="w-3 h-3 text-sky-500" />}
            className="text-[11px] h-7 px-2"
          >
            Transfer
          </Button>
        </div>
      </Card>
    );
  };

  const renderAddCard = () => (
    <div
      key="add-account-card"
      onClick={onOpenAddAccount}
      className="flex flex-col items-center justify-center gap-2 p-5 rounded-2xl border border-dashed border-theme hover:border-emerald-500/50 bg-theme-card/60 hover:bg-theme-subtle cursor-pointer transition-all text-theme-muted hover:text-emerald-500 min-h-35.5 group text-center"
    >
      <div className="w-9 h-9 rounded-xl bg-theme-subtle group-hover:bg-emerald-500/10 border border-theme group-hover:border-emerald-500/25 flex items-center justify-center text-theme-muted group-hover:text-emerald-500 transition-colors shadow-xs">
        <Plus className="w-4 h-4 stroke-[2.5]" />
      </div>
      <div>
        <div className="text-xs font-bold text-theme-title group-hover:text-emerald-500 transition-colors">
          Add New Account
        </div>
        <p className="text-[10px] text-theme-muted mt-0.5">
          Checking, savings, cash or card
        </p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 pb-20 md:pb-8 max-w-6xl mx-auto w-full animate-in fade-in duration-200">
      {/* 1. TOP HEADER & METRIC SUMMARY */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-theme-title tracking-tight">Accounts & Cards</h1>
          <p className="text-xs text-theme-muted">
            Manage your liquid cash, bank accounts, investments, and credit cards
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={onOpenTransfer}
            variant="secondary"
            size="sm"
            leftIcon={<ArrowLeftRight className="w-3.5 h-3.5 text-sky-500" />}
          >
            Transfer Funds
          </Button>
          <Button
            onClick={onOpenAddAccount}
            variant="primary"
            size="sm"
            leftIcon={<Plus className="w-3.5 h-3.5 stroke-[2.5]" />}
          >
            Add Account
          </Button>
        </div>
      </div>

      {/* 3 Metric Summary Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <StatCard
          label="Total Net Worth"
          value={
            <span className={netWorth < 0 ? 'text-rose-500' : 'text-theme-title'}>
              {formatCurrency(netWorth, baseCurrency, privacyMode)}
            </span>
          }
          icon={<Wallet className="w-3.5 h-3.5 text-emerald-500" />}
          subtitle={`${accounts.length} active account${accounts.length === 1 ? '' : 's'}`}
        />

        <StatCard
          label="Total Assets"
          value={
            <span className="text-emerald-500">
              +{formatCurrency(totalAssets, baseCurrency, privacyMode)}
            </span>
          }
          icon={<TrendingUp className="w-3.5 h-3.5 text-emerald-500" />}
          subtitle={`${assetAccounts.length} liquid & savings account${assetAccounts.length === 1 ? '' : 's'}`}
        />

        <StatCard
          label="Total Liabilities"
          value={
            <span className={totalLiabilities > 0 ? 'text-rose-500' : 'text-theme-muted'}>
              {totalLiabilities > 0 ? '-' : ''}
              {formatCurrency(totalLiabilities, baseCurrency, privacyMode)}
            </span>
          }
          icon={<CreditCard className="w-3.5 h-3.5 text-rose-500" />}
          subtitle={`${liabilityAccounts.length} credit & debt account${liabilityAccounts.length === 1 ? '' : 's'}`}
        />
      </div>

      {/* 2. ACCOUNTS FILTER TABS */}
      {accounts.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <Tabs
            items={tabItems}
            activeTab={filterTab}
            onChange={(t) => setFilterTab(t)}
            className="w-full sm:w-auto min-w-85 whitespace-nowrap"
          />

          <span className="text-xs text-theme-muted hidden sm:inline tabular-nums">
            {filterTab === 'all'
              ? `${accounts.length} total accounts`
              : filterTab === 'assets'
              ? `${assetAccounts.length} asset accounts`
              : `${liabilityAccounts.length} liability accounts`}
          </span>
        </div>
      )}

      {/* 3. REORGANIZED ACCOUNTS LAYOUT */}
      {accounts.length === 0 ? (
        <EmptyState
          icon={<Wallet className="w-8 h-8 text-theme-faint mx-auto mb-2" />}
          title="No accounts added yet"
          description="Create your first bank account or cash wallet to start tracking."
          action={
            <Button
              variant="primary"
              size="sm"
              onClick={onOpenAddAccount}
              leftIcon={<Plus className="w-3.5 h-3.5" />}
            >
              Add First Account
            </Button>
          }
        />
      ) : filterTab === 'all' ? (
        <div className="space-y-6">
          {/* Group 1: Assets & Liquid Capital */}
          {assetAccounts.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-theme-title">
                    Assets & Liquid Capital
                  </h2>
                  <Badge variant="emerald" size="xs">
                    {assetAccounts.length}
                  </Badge>
                </div>
                <span className="text-xs font-bold text-emerald-500 tabular-nums">
                  +{formatCurrency(totalAssets, baseCurrency, privacyMode)}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {assetAccounts.map(renderAccountCard)}
              </div>
            </div>
          )}

          {/* Group 2: Liabilities & Borrowed Credit */}
          {liabilityAccounts.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-theme-title">
                    Liabilities & Credit
                  </h2>
                  <Badge variant="rose" size="xs">
                    {liabilityAccounts.length}
                  </Badge>
                </div>
                <span className="text-xs font-bold text-rose-500 tabular-nums">
                  -{formatCurrency(totalLiabilities, baseCurrency, privacyMode)}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {liabilityAccounts.map(renderAccountCard)}
              </div>
            </div>
          )}
        </div>
      ) : filterTab === 'assets' ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-bold uppercase tracking-wider text-theme-title">
              Assets & Liquid Capital ({assetAccounts.length})
            </h2>
            <span className="text-xs font-bold text-emerald-500 tabular-nums">
              +{formatCurrency(totalAssets, baseCurrency, privacyMode)}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {assetAccounts.map(renderAccountCard)}
            {renderAddCard()}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-bold uppercase tracking-wider text-theme-title">
              Liabilities & Credit ({liabilityAccounts.length})
            </h2>
            <span className="text-xs font-bold text-rose-500 tabular-nums">
              -{formatCurrency(totalLiabilities, baseCurrency, privacyMode)}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {liabilityAccounts.map(renderAccountCard)}
          </div>
        </div>
      )}
    </div>
  );
};
