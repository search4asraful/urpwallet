'use client';

import React from 'react';
import {
  TrendingUp, TrendingDown, ArrowDownRight, ArrowUpRight, ArrowLeftRight,
  Plus, ChevronRight, CheckCircle2, Clock
} from 'lucide-react';
import { DashboardData, Transaction } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { CategoryIcon } from './CategoryIcon';
import { Card, Button, ProgressBar, Badge, EmptyState } from '@/components/ui';

interface DashboardViewProps {
  data: DashboardData;
  privacyMode: boolean;
  onOpenAddModal: (type?: 'expense' | 'income' | 'transfer') => void;
  onSelectTab: (tab: string) => void;
  onSelectTransaction: (tx: Transaction) => void;
  onExecutePlanned: (id: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  data,
  privacyMode,
  onOpenAddModal,
  onSelectTab,
  onSelectTransaction,
  onExecutePlanned,
}) => {
  const {
    netWorth,
    monthlyIncome,
    monthlyExpense,
    balanceChange,
    baseCurrency,
    accounts,
    recentTransactions,
    activeBudgets,
    upcomingPlanned,
  } = data;

  const today = new Date();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const daysRemaining = Math.max(1, daysInMonth - today.getDate());

  return (
    <div className="space-y-6 pb-20 md:pb-8 max-w-6xl mx-auto w-full animate-in fade-in duration-200">
      {/* 1. NET WORTH & CASH FLOW SUMMARY */}
      <Card className="p-5 md:p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-theme-muted uppercase tracking-wider">
                Total Net Worth
              </span>
              <span className="text-theme-faint">•</span>
              <span className="text-xs text-theme-muted font-medium">
                {new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-theme-title mt-1 tracking-tight tabular-nums">
              {formatCurrency(netWorth, baseCurrency, privacyMode)}
            </h1>
          </div>

          {/* Quick Record Actions */}
          <div className="flex items-center gap-2">
            <Button
              onClick={() => onOpenAddModal('expense')}
              variant="rose-subtle"
              size="md"
              leftIcon={<ArrowDownRight className="w-3.5 h-3.5" />}
              className="flex-1 md:flex-initial"
            >
              Expense
            </Button>
            <Button
              onClick={() => onOpenAddModal('income')}
              variant="emerald-subtle"
              size="md"
              leftIcon={<ArrowUpRight className="w-3.5 h-3.5" />}
              className="flex-1 md:flex-initial"
            >
              Income
            </Button>
            <Button
              onClick={() => onOpenAddModal('transfer')}
              variant="sky-subtle"
              size="md"
              leftIcon={<ArrowLeftRight className="w-3.5 h-3.5" />}
              className="flex-1 md:flex-initial"
            >
              Transfer
            </Button>
          </div>
        </div>

        {/* 3-Column Cash Flow Metrics */}
        <div className="grid grid-cols-3 gap-3 md:gap-4 mt-5 pt-4 border-t border-theme">
          <div className="p-3 rounded-xl bg-theme-subtle border border-theme">
            <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-500 mb-0.5">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Income</span>
            </div>
            <p className="text-base md:text-lg font-bold text-theme-title tabular-nums">
              {formatCurrency(monthlyIncome, baseCurrency, privacyMode)}
            </p>
          </div>

          <div className="p-3 rounded-xl bg-theme-subtle border border-theme">
            <div className="flex items-center gap-1.5 text-xs font-medium text-rose-500 mb-0.5">
              <TrendingDown className="w-3.5 h-3.5" />
              <span>Expenses</span>
            </div>
            <p className="text-base md:text-lg font-bold text-theme-title tabular-nums">
              {formatCurrency(monthlyExpense, baseCurrency, privacyMode)}
            </p>
          </div>

          <div className="p-3 rounded-xl bg-theme-subtle border border-theme">
            <div className="flex items-center gap-1.5 text-xs font-medium text-theme-muted mb-0.5">
              <ArrowLeftRight className="w-3.5 h-3.5" />
              <span>Net Delta</span>
            </div>
            <p className={`text-base md:text-lg font-bold tabular-nums ${
              balanceChange >= 0 ? 'text-emerald-500' : 'text-rose-500'
            }`}>
              {balanceChange > 0 ? '+' : ''}{formatCurrency(balanceChange, baseCurrency, privacyMode)}
            </p>
          </div>
        </div>
      </Card>

      {/* 2. ACCOUNTS & BALANCES STRIP */}
      <div>
        <div className="flex items-center justify-between mb-2.5 px-0.5">
          <h2 className="text-xs font-bold text-theme-muted uppercase tracking-wider">
            Accounts ({accounts.length})
          </h2>
          <button
            onClick={() => onSelectTab('accounts')}
            className="text-xs font-semibold text-emerald-500 hover:underline flex items-center gap-0.5"
          >
            Manage <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {accounts.map((acc) => (
            <Card
              key={acc.id}
              hoverable
              onClick={() => onSelectTab('accounts')}
              className="p-3.5 cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-2">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-white shadow-xs"
                  style={{ backgroundColor: acc.color }}
                >
                  <CategoryIcon name={acc.icon} className="w-3.5 h-3.5" />
                </div>
                <Badge variant="neutral" size="xs">
                  <span className="uppercase">{acc.type.replace('_', ' ')}</span>
                </Badge>
              </div>

              <div className="text-xs font-semibold text-theme-main truncate group-hover:text-emerald-500 transition-colors">
                {acc.name}
              </div>
              <div className={`text-base font-bold mt-0.5 tabular-nums ${
                acc.balance < 0 ? 'text-rose-500' : 'text-theme-title'
              }`}>
                {formatCurrency(acc.balance, acc.currency, privacyMode)}
              </div>
            </Card>
          ))}

          {/* Add Account Trigger */}
          <div
            onClick={() => onSelectTab('accounts')}
            className="flex items-center justify-center gap-2 p-3.5 rounded-xl border border-dashed border-theme hover:border-emerald-500/50 bg-theme-card hover:bg-theme-subtle cursor-pointer transition-all text-theme-muted hover:text-emerald-500 text-xs font-semibold min-h-[82px]"
          >
            <Plus className="w-4 h-4" />
            <span>Add Account</span>
          </div>
        </div>
      </div>

      {/* 3. ACTIVE BUDGETS & UPCOMING BILLS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Active Budgets */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-theme-title">Budget Pacing</h2>
              <p className="text-[11px] text-theme-muted">{daysRemaining} days left in cycle</p>
            </div>
            <button
              onClick={() => onSelectTab('budgets')}
              className="text-xs font-semibold text-emerald-500 hover:underline flex items-center gap-0.5"
            >
              All Budgets <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          {activeBudgets.length === 0 ? (
            <EmptyState
              title="No active budgets"
              description="Set limits to monitor spending pace."
              className="py-6 border-0 bg-transparent shadow-none"
            />
          ) : (
            <div className="space-y-3.5">
              {activeBudgets.slice(0, 3).map((b) => {
                const spent = b.spent || 0;
                const percentage = Math.min(100, Math.round((spent / b.amount) * 100));
                const remaining = b.amount - spent;
                const dailyRemaining = Math.max(0, remaining / daysRemaining);
                const isOver = spent > b.amount;

                return (
                  <div key={b.id} className="p-3 rounded-xl bg-theme-subtle border border-theme">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-5 h-5 rounded flex items-center justify-center text-white text-[10px]"
                          style={{ backgroundColor: b.category_color || '#10B981' }}
                        >
                          <CategoryIcon name={b.category_icon || 'PieChart'} className="w-3 h-3" />
                        </div>
                        <span className="font-semibold text-theme-title">{b.name}</span>
                      </div>
                      <div className="font-semibold text-theme-main tabular-nums">
                        {formatCurrency(spent, baseCurrency, privacyMode)}
                        <span className="text-theme-muted font-normal"> / {formatCurrency(b.amount, baseCurrency, privacyMode)}</span>
                      </div>
                    </div>

                    {/* Progress track */}
                    <div className="my-1.5">
                      <ProgressBar value={percentage} variant="auto" size="sm" />
                    </div>

                    <div className="flex justify-between items-center text-[10px] text-theme-muted font-medium">
                      <span className={isOver ? 'text-rose-500 font-bold' : ''}>
                        {isOver ? `Over by ${formatCurrency(Math.abs(remaining), baseCurrency, privacyMode)}` : `${percentage}% used`}
                      </span>
                      <span className="text-emerald-500">
                        {isOver ? 'Exceeded' : `Safe: ${formatCurrency(dailyRemaining, baseCurrency, privacyMode)}/day`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Scheduled Bills */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-theme-title">Recurring Bills</h2>
              <p className="text-[11px] text-theme-muted">Due upcoming this period</p>
            </div>
            <button
              onClick={() => onSelectTab('planned')}
              className="text-xs font-semibold text-emerald-500 hover:underline flex items-center gap-0.5"
            >
              All Bills <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          {upcomingPlanned.length === 0 ? (
            <EmptyState
              title="No upcoming bills"
              description="Scheduled bills will show up here."
              className="py-6 border-0 bg-transparent shadow-none"
            />
          ) : (
            <div className="space-y-2.5">
              {upcomingPlanned.slice(0, 4).map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-theme-subtle border border-theme hover:border-theme-strong transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-white shadow-xs"
                      style={{ backgroundColor: p.category_color || '#3B82F6' }}
                    >
                      <CategoryIcon name={p.category_icon || 'Calendar'} className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-theme-title">{p.name}</div>
                      <div className="flex items-center gap-1.5 text-[10px] text-theme-muted">
                        <span className="flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" /> Due {formatDate(p.next_date)}
                        </span>
                        <span>•</span>
                        <span className="capitalize">{p.frequency}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-bold text-theme-title tabular-nums">
                      {p.type === 'expense' ? '-' : '+'}{formatCurrency(p.amount, baseCurrency, privacyMode)}
                    </span>
                    <Button
                      size="xs"
                      variant="emerald-subtle"
                      onClick={() => onExecutePlanned(p.id)}
                      leftIcon={<CheckCircle2 className="w-3 h-3" />}
                    >
                      Pay
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* 4. RECENT TRANSACTIONS LEDGER */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-bold text-theme-title">Recent Activity</h2>
            <p className="text-[11px] text-theme-muted">Latest ledger transactions</p>
          </div>
          <button
            onClick={() => onSelectTab('transactions')}
            className="text-xs font-semibold text-emerald-500 hover:underline flex items-center gap-0.5"
          >
            Ledger View <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        {recentTransactions.length === 0 ? (
          <EmptyState
            title="No transactions yet"
            description="Recorded entries will appear here."
            className="py-6 border-0 bg-transparent shadow-none"
          />
        ) : (
          <div className="divide-y divide-theme">
            {recentTransactions.slice(0, 7).map((tx) => {
              const account = accounts.find((a) => a.id === tx.account_id);
              const txCurrency = account?.currency || tx.account_currency || tx.currency || baseCurrency;
              return (
                <div
                  key={tx.id}
                  onClick={() => onSelectTransaction(tx)}
                  className="flex items-center justify-between py-2.5 px-1.5 hover:bg-theme-subtle rounded-xl cursor-pointer transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0 shadow-xs"
                      style={{
                        backgroundColor:
                          tx.type === 'transfer' ? '#0ea5e9' : tx.category_color || '#64748B',
                      }}
                    >
                      {tx.type === 'transfer' ? (
                        <ArrowLeftRight className="w-4 h-4" />
                      ) : (
                        <CategoryIcon name={tx.category_icon || 'CircleDollarSign'} className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-theme-title group-hover:text-emerald-500 transition-colors">
                        {tx.type === 'transfer'
                          ? `Transfer: ${tx.account_name} ➔ ${tx.to_account_name || 'Account'}`
                          : tx.payee || tx.category_name || 'General Expense'}
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-theme-muted">
                        <span>{formatDate(tx.date)}</span>
                        <span>•</span>
                        <span>{tx.account_name}</span>
                        {tx.note && (
                          <>
                            <span>•</span>
                            <span className="truncate max-w-[140px] text-theme-faint">{tx.note}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className={`text-xs font-bold tabular-nums ${
                      tx.type === 'income'
                        ? 'text-emerald-500'
                        : tx.type === 'expense'
                        ? 'text-rose-500'
                        : 'text-sky-500'
                    }`}>
                      {tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : ''}
                      {formatCurrency(tx.amount, txCurrency, privacyMode)}
                    </span>
                    <div className="text-[9px] uppercase tracking-wider text-theme-faint font-semibold">
                      {tx.payment_type.replace('_', ' ')}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
};
