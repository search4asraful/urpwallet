'use client';

import React, { useState, useMemo } from 'react';
import { Plus, Search, Download, Upload, ArrowLeftRight, Receipt } from 'lucide-react';
import { Transaction, Account, Category } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { CategoryIcon } from './CategoryIcon';
import { Card, Button, Input, Select, EmptyState } from '@/components/ui';

interface TransactionsViewProps {
  transactions: Transaction[];
  accounts: Account[];
  categories: Category[];
  privacyMode: boolean;
  baseCurrency: string;
  onOpenAddModal: (type?: 'expense' | 'income' | 'transfer') => void;
  onSelectTransaction: (tx: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
  onOpenImport?: () => void;
}

export const TransactionsView: React.FC<TransactionsViewProps> = ({
  transactions,
  accounts,
  categories,
  privacyMode,
  baseCurrency,
  onOpenAddModal,
  onSelectTransaction,
  onOpenImport,
}) => {
  const [search, setSearch] = useState('');
  const [selectedAccount, setSelectedAccount] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('all');

  // Filter Transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      // Search
      if (search) {
        const query = search.toLowerCase();
        const matchesPayee = t.payee?.toLowerCase().includes(query);
        const matchesNote = t.note?.toLowerCase().includes(query);
        const matchesCategory = t.category_name?.toLowerCase().includes(query);
        const matchesAccount = t.account_name?.toLowerCase().includes(query);
        if (!matchesPayee && !matchesNote && !matchesCategory && !matchesAccount) {
          return false;
        }
      }

      // Account filter
      if (selectedAccount !== 'all' && t.account_id !== selectedAccount && t.to_account_id !== selectedAccount) {
        return false;
      }

      // Category filter
      if (selectedCategory !== 'all' && t.category_id !== selectedCategory) {
        return false;
      }

      // Type filter
      if (selectedType !== 'all' && t.type !== selectedType) {
        return false;
      }

      // Period filter (this month)
      if (selectedPeriod === 'month') {
        const today = new Date();
        const y = today.getFullYear();
        const m = String(today.getMonth() + 1).padStart(2, '0');
        if (!t.date.startsWith(`${y}-${m}`)) {
          return false;
        }
      }

      return true;
    });
  }, [transactions, search, selectedAccount, selectedCategory, selectedType, selectedPeriod]);

  // Group by Date
  const groupedByDate = useMemo(() => {
    const groups: { [date: string]: { date: string; items: Transaction[]; totalExpense: number; totalIncome: number } } = {};

    filteredTransactions.forEach((tx) => {
      if (!groups[tx.date]) {
        groups[tx.date] = { date: tx.date, items: [], totalExpense: 0, totalIncome: 0 };
      }
      groups[tx.date].items.push(tx);
      if (tx.type === 'expense') groups[tx.date].totalExpense += tx.amount;
      if (tx.type === 'income') groups[tx.date].totalIncome += tx.amount;
    });

    return Object.values(groups).sort((a, b) => b.date.localeCompare(a.date));
  }, [filteredTransactions]);

  const totalFilteredExpense = filteredTransactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalFilteredIncome = filteredTransactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="space-y-4 pb-20 md:pb-8 max-w-6xl mx-auto w-full animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-theme-title tracking-tight">Ledger Records</h1>
          <p className="text-[11px] text-theme-muted">
            {filteredTransactions.length} records filtered • Net Outflow: {formatCurrency(totalFilteredExpense - totalFilteredIncome, baseCurrency, privacyMode)}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onOpenImport && (
            <Button
              onClick={onOpenImport}
              variant="secondary"
              size="sm"
              leftIcon={<Upload className="w-3.5 h-3.5 text-emerald-500" />}
              className="h-8"
            >
              Import
            </Button>
          )}
          <a
            href="/api/export?format=csv"
            download
            className="inline-flex items-center gap-1.5 h-8 px-2.5 bg-theme-subtle hover:bg-theme-subtle-hover text-theme-title border border-theme rounded-xl text-xs font-medium transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            CSV
          </a>
          <Button
            onClick={() => onOpenAddModal('expense')}
            variant="primary"
            size="sm"
            leftIcon={<Plus className="w-3.5 h-3.5 stroke-[2.5]" />}
          >
            Record
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-3.5 space-y-2.5">
        <Input
          placeholder="Search payees, categories, notes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          leftIcon={<Search className="w-3.5 h-3.5" />}
        />

        {/* Filter Badges & Selects */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Type Segmented */}
          <div className="flex items-center bg-theme-subtle p-0.5 rounded-xl border border-theme">
            {['all', 'expense', 'income', 'transfer'].map((t) => (
              <button
                key={t}
                onClick={() => setSelectedType(t)}
                className={`px-2.5 py-1 rounded-lg text-[11px] capitalize font-medium transition-all ${
                  selectedType === t
                    ? 'bg-emerald-500 text-zinc-950 font-bold shadow-xs'
                    : 'text-theme-muted hover:text-theme-title'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Period */}
          <Select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            containerClassName="w-auto"
          >
            <option value="all">All Dates</option>
            <option value="month">This Month</option>
          </Select>

          {/* Account Filter */}
          <Select
            value={selectedAccount}
            onChange={(e) => setSelectedAccount(e.target.value)}
            containerClassName="w-auto"
          >
            <option value="all">All Accounts</option>
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.name}
              </option>
            ))}
          </Select>

          {/* Category Filter */}
          <Select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            containerClassName="w-auto"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
      </Card>

      {/* Transactions Feed */}
      {groupedByDate.length === 0 ? (
        <EmptyState
          icon={<Receipt className="w-8 h-8 text-theme-faint mx-auto mb-2" />}
          title="No transactions match current filters"
          description="Try adjusting your filters or search term to see more ledger entries."
          action={
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setSearch('');
                setSelectedType('all');
                setSelectedAccount('all');
                setSelectedCategory('all');
                setSelectedPeriod('all');
              }}
            >
              Reset Filters
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {groupedByDate.map((group) => (
            <Card key={group.date} className="overflow-hidden">
              {/* Daily Group Bar */}
              <div className="flex items-center justify-between px-4 py-2.5 bg-theme-subtle border-b border-theme text-[11px]">
                <span className="font-semibold text-theme-main">
                  {formatDate(group.date)} • {group.date}
                </span>
                <div className="flex items-center gap-3 font-medium tabular-nums">
                  {group.totalIncome > 0 && (
                    <span className="text-emerald-500 font-bold">
                      +{formatCurrency(group.totalIncome, baseCurrency, privacyMode)}
                    </span>
                  )}
                  {group.totalExpense > 0 && (
                    <span className="text-rose-500 font-bold">
                      -{formatCurrency(group.totalExpense, baseCurrency, privacyMode)}
                    </span>
                  )}
                </div>
              </div>

              {/* Transactions in group */}
              <div className="divide-y divide-theme">
                {group.items.map((tx) => {
                  const account = accounts.find((a) => a.id === tx.account_id);
                  const txCurrency = account?.currency || tx.account_currency || tx.currency || baseCurrency;
                  return (
                    <div
                      key={tx.id}
                      onClick={() => onSelectTransaction(tx)}
                      className="flex items-center justify-between p-3.5 hover:bg-theme-subtle cursor-pointer transition-colors group"
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
                          <div className="flex items-center gap-1.5 text-[10px] text-theme-muted mt-0.5">
                            <span>{tx.account_name}</span>
                            <span>•</span>
                            <span className="capitalize">{tx.payment_type.replace('_', ' ')}</span>
                            {tx.category_name && tx.type !== 'transfer' && (
                              <>
                                <span>•</span>
                                <span>{tx.category_name}</span>
                              </>
                            )}
                            {tx.note && (
                              <>
                                <span>•</span>
                                <span className="truncate max-w-[120px] text-theme-faint">{tx.note}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-right tabular-nums">
                        <span className={`text-xs font-bold ${
                          tx.type === 'income'
                            ? 'text-emerald-500'
                            : tx.type === 'expense'
                            ? 'text-rose-500'
                            : 'text-sky-500'
                        }`}>
                          {tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : ''}
                          {formatCurrency(tx.amount, txCurrency, privacyMode)}
                        </span>
                        <div className="text-[10px] text-theme-faint font-medium">
                          {tx.time || 'Cleared'}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
