'use client';

import React, { useState, useMemo } from 'react';
import {
  Plus, Search, Download, Upload, ArrowLeftRight, Receipt,
  Trash2, CheckSquare, Square, AlertTriangle,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight
} from 'lucide-react';
import { Transaction, Account, Category } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { CategoryIcon } from './CategoryIcon';
import { Card, Button, Input, Select, EmptyState, Modal, Badge } from '@/components/ui';

interface TransactionsViewProps {
  transactions: Transaction[];
  accounts: Account[];
  categories: Category[];
  privacyMode: boolean;
  baseCurrency: string;
  onOpenAddModal: (type?: 'expense' | 'income' | 'transfer') => void;
  onSelectTransaction: (tx: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
  onBulkDeleteTransactions?: (ids: string[]) => Promise<void>;
  onOpenImport?: () => void;
}

function getGroupDateInfo(dateStr: string) {
  if (!dateStr) return { dayLabel: '', fullDate: '', isRecent: false };
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const isToday = date.toDateString() === today.toDateString();
  const isYesterday = date.toDateString() === yesterday.toDateString();

  const fullDate = date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  if (isToday) return { dayLabel: 'Today', fullDate, isRecent: true };
  if (isYesterday) return { dayLabel: 'Yesterday', fullDate, isRecent: true };

  const dayOfWeek = date.toLocaleDateString(undefined, { weekday: 'long' });
  return { dayLabel: dayOfWeek, fullDate, isRecent: false };
}

export const TransactionsView: React.FC<TransactionsViewProps> = ({
  transactions,
  accounts,
  categories,
  privacyMode,
  baseCurrency,
  onOpenAddModal,
  onSelectTransaction,
  onBulkDeleteTransactions,
  onOpenImport,
}) => {
  const [search, setSearch] = useState('');
  const [selectedAccount, setSelectedAccount] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('all');

  // Pagination State
  const [pageSize, setPageSize] = useState<number>(20);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Bulk Selection State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Reset page when filters change (React render-phase pattern)
  const [prevFilterKey, setPrevFilterKey] = useState('');
  const currentFilterKey = `${search}|${selectedAccount}|${selectedCategory}|${selectedType}|${selectedPeriod}`;
  if (prevFilterKey !== currentFilterKey) {
    setPrevFilterKey(currentFilterKey);
    setCurrentPage(1);
  }

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

  // Pagination Calculations
  const totalFiltered = filteredTransactions.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
  const validPage = Math.min(Math.max(1, currentPage), totalPages);

  const startIndex = (validPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalFiltered);

  const paginatedTransactions = useMemo(() => {
    return filteredTransactions.slice(startIndex, endIndex);
  }, [filteredTransactions, startIndex, endIndex]);

  // Group by Date for the Current Page View
  const groupedByDate = useMemo(() => {
    const groups: { [date: string]: { date: string; items: Transaction[]; totalExpense: number; totalIncome: number } } = {};

    paginatedTransactions.forEach((tx) => {
      if (!groups[tx.date]) {
        groups[tx.date] = { date: tx.date, items: [], totalExpense: 0, totalIncome: 0 };
      }
      groups[tx.date].items.push(tx);
      if (tx.type === 'expense') groups[tx.date].totalExpense += tx.amount;
      if (tx.type === 'income') groups[tx.date].totalIncome += tx.amount;
    });

    return Object.values(groups).sort((a, b) => b.date.localeCompare(a.date));
  }, [paginatedTransactions]);

  const totalFilteredExpense = filteredTransactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalFilteredIncome = filteredTransactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  // Bulk Selection Handlers
  const toggleSelectOne = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectGroup = (items: Transaction[], e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const groupIds = items.map((i) => i.id);
    const allSelected = groupIds.every((id) => selectedIds.has(id));

    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        groupIds.forEach((id) => next.delete(id));
      } else {
        groupIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const handleSelectPage = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      paginatedTransactions.forEach((t) => next.add(t.id));
      return next;
    });
  };

  const handleSelectAllFiltered = () => {
    setSelectedIds(new Set(filteredTransactions.map((t) => t.id)));
  };

  const handleDeselectAll = () => {
    setSelectedIds(new Set());
  };

  const handleExecuteBulkDelete = async () => {
    if (!onBulkDeleteTransactions || selectedIds.size === 0) return;
    setIsBulkDeleting(true);
    try {
      await onBulkDeleteTransactions(Array.from(selectedIds));
      setSelectedIds(new Set());
      setShowConfirmModal(false);
    } catch (err) {
      console.error('Failed to execute bulk delete:', err);
    } finally {
      setIsBulkDeleting(false);
    }
  };

  // Selected Items Totals
  const selectedTransactions = useMemo(() => {
    return transactions.filter((t) => selectedIds.has(t.id));
  }, [transactions, selectedIds]);

  const selectedNetExpense = useMemo(() => {
    return selectedTransactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [selectedTransactions]);

  const selectedNetIncome = useMemo(() => {
    return selectedTransactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [selectedTransactions]);

  const isAllFilteredSelected = filteredTransactions.length > 0 && filteredTransactions.every((t) => selectedIds.has(t.id));

  return (
    <div className="space-y-3 pb-32 md:pb-16 max-w-6xl mx-auto w-full animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div>
          <h1 className="text-xl font-bold text-theme-title tracking-tight">Ledger Records</h1>
          <p className="text-[11px] text-theme-muted mt-0.5">
            {totalFiltered} records • Net Outflow: {formatCurrency(totalFilteredExpense - totalFilteredIncome, baseCurrency, privacyMode)}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onOpenImport && (
            <Button
              onClick={onOpenImport}
              variant="secondary"
              size="sm"
              leftIcon={<Upload className="w-3.5 h-3.5 text-emerald-500" />}
              className="h-8 text-xs"
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
            className="h-8 shadow-xs text-xs"
          >
            Record
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-3 space-y-2.5">
        <Input
          placeholder="Search payees, categories, notes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          leftIcon={<Search className="w-3.5 h-3.5" />}
          className="h-8 text-xs"
        />

        {/* Filter Badges & Selects */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            {/* Type Segmented */}
            <div className="flex items-center bg-theme-subtle p-0.5 rounded-lg border border-theme">
              {['all', 'expense', 'income', 'transfer'].map((t) => (
                <button
                  key={t}
                  onClick={() => setSelectedType(t)}
                  className={`px-2 py-0.5 rounded-md text-[11px] capitalize font-medium transition-all ${
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
              className="h-7 text-xs py-0 pl-2 pr-7"
            >
              <option value="all">All Dates</option>
              <option value="month">This Month</option>
            </Select>

            {/* Account Filter */}
            <Select
              value={selectedAccount}
              onChange={(e) => setSelectedAccount(e.target.value)}
              containerClassName="w-auto"
              className="h-7 text-xs py-0 pl-2 pr-7"
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
              className="h-7 text-xs py-0 pl-2 pr-7"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>

          {/* Master Selection Toggle Button */}
          {filteredTransactions.length > 0 && onBulkDeleteTransactions && (
            <div className="flex items-center gap-2">
              {selectedIds.size > 0 ? (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleDeselectAll}
                    className="text-[11px] font-semibold text-rose-500 hover:text-rose-400 transition-colors flex items-center gap-1 px-2 py-0.5 rounded-md hover:bg-rose-500/10"
                  >
                    <CheckSquare className="w-3.5 h-3.5" />
                    <span>Deselect ({selectedIds.size})</span>
                  </button>

                  {!isAllFilteredSelected && totalPages > 1 && (
                    <button
                      type="button"
                      onClick={handleSelectAllFiltered}
                      className="text-[11px] font-medium text-emerald-500 hover:text-emerald-400 transition-colors flex items-center gap-1 px-1.5 py-0.5 rounded-md hover:bg-emerald-500/10"
                    >
                      <span>Select All ({totalFiltered})</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handleSelectPage}
                    className="text-[11px] font-medium text-theme-muted hover:text-theme-title transition-colors flex items-center gap-1 px-2 py-0.5 rounded-md hover:bg-theme-subtle"
                  >
                    <Square className="w-3.5 h-3.5" />
                    <span>Select Page ({paginatedTransactions.length})</span>
                  </button>

                  {totalPages > 1 && (
                    <button
                      type="button"
                      onClick={handleSelectAllFiltered}
                      className="text-[11px] font-medium text-emerald-500 hover:text-emerald-400 transition-colors flex items-center gap-1 px-2 py-0.5 rounded-md hover:bg-emerald-500/10"
                    >
                      <span>All ({totalFiltered})</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Transactions Feed */}
      {groupedByDate.length === 0 ? (
        <EmptyState
          icon={<Receipt className="w-8 h-8 text-theme-faint mx-auto mb-2" />}
          title={totalFiltered === 0 ? "No transactions found" : "Page has no records"}
          description={
            totalFiltered === 0
              ? "Try adjusting your filters or record a new transaction to begin."
              : "Try switching to an earlier page."
          }
          action={
            <Button
              onClick={() => onOpenAddModal('expense')}
              variant="primary"
              size="sm"
              leftIcon={<Plus className="w-3.5 h-3.5" />}
            >
              Record First Entry
            </Button>
          }
        />
      ) : (
        <div className="space-y-2.5">
          {groupedByDate.map((group) => {
            const { dayLabel, fullDate, isRecent } = getGroupDateInfo(group.date);
            const isGroupAllSelected = group.items.length > 0 && group.items.every((i) => selectedIds.has(i.id));
            const isGroupPartiallySelected = !isGroupAllSelected && group.items.some((i) => selectedIds.has(i.id));

            return (
              <Card key={group.date} className="overflow-hidden border border-theme shadow-xs">
                {/* Date Group Header */}
                <div className="flex items-center justify-between px-3 py-1.5 bg-theme-subtle/50 border-b border-theme text-xs">
                  <div className="flex items-center gap-2">
                    {onBulkDeleteTransactions && (
                      <button
                        type="button"
                        onClick={(e) => toggleSelectGroup(group.items, e)}
                        className="p-0.5 rounded text-theme-muted hover:text-theme-title transition-colors shrink-0"
                        aria-label="Select day transactions"
                      >
                        {isGroupAllSelected ? (
                          <CheckSquare className="w-3.5 h-3.5 text-emerald-500" />
                        ) : isGroupPartiallySelected ? (
                          <div className="w-3.5 h-3.5 rounded border border-emerald-500 bg-emerald-500/20 flex items-center justify-center">
                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-xs" />
                          </div>
                        ) : (
                          <Square className="w-3.5 h-3.5 opacity-40 hover:opacity-100" />
                        )}
                      </button>
                    )}

                    <div className="flex items-baseline gap-1.5">
                      <span className={`font-bold text-xs ${isRecent ? 'text-emerald-500' : 'text-theme-title'}`}>
                        {dayLabel}
                      </span>
                      <span className="text-[10px] text-theme-faint font-medium">
                        {fullDate}
                      </span>
                      <span className="text-[10px] text-theme-faint">
                        ({group.items.length})
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 font-semibold tabular-nums text-[11px]">
                    {group.totalIncome > 0 && (
                      <span className="text-emerald-500">
                        +{formatCurrency(group.totalIncome, baseCurrency, privacyMode)}
                      </span>
                    )}
                    {group.totalExpense > 0 && (
                      <span className="text-rose-500">
                        -{formatCurrency(group.totalExpense, baseCurrency, privacyMode)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Compact Transactions in group */}
                <div className="divide-y divide-theme">
                  {group.items.map((tx) => {
                    const isSelected = selectedIds.has(tx.id);
                    const account = accounts.find((a) => a.id === tx.account_id);
                    const txCurrency = account?.currency || tx.account_currency || tx.currency || baseCurrency;

                    return (
                      <div
                        key={tx.id}
                        onClick={() => onSelectTransaction(tx)}
                        className={`flex items-center justify-between px-3 py-2 sm:py-2.5 cursor-pointer transition-colors group ${
                          isSelected
                            ? 'bg-emerald-500/10 border-l-2 border-l-emerald-500'
                            : 'hover:bg-theme-subtle/70'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                          {/* Selection Checkbox */}
                          {onBulkDeleteTransactions && (
                            <button
                              type="button"
                              onClick={(e) => toggleSelectOne(tx.id, e)}
                              className="p-0.5 rounded text-theme-muted hover:text-theme-title transition-colors shrink-0"
                              aria-label={isSelected ? 'Deselect item' : 'Select item'}
                            >
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-emerald-500" />
                              ) : (
                                <Square className="w-4 h-4 opacity-40 group-hover:opacity-100" />
                              )}
                            </button>
                          )}

                          {/* Compact Category or Transfer Icon */}
                          <div
                            className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-white shrink-0 shadow-xs transition-transform group-hover:scale-105"
                            style={{
                              backgroundColor:
                                tx.type === 'transfer' ? '#0ea5e9' : tx.category_color || '#64748B',
                            }}
                          >
                            {tx.type === 'transfer' ? (
                              <ArrowLeftRight className="w-3.5 h-3.5" />
                            ) : (
                              <CategoryIcon name={tx.category_icon || 'CircleDollarSign'} className="w-3.5 h-3.5" />
                            )}
                          </div>

                          {/* Content Details */}
                          <div className="min-w-0 flex-1">
                            {/* Primary Title Line with Badges */}
                            <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap">
                              <span className="text-xs sm:text-sm font-semibold text-theme-title group-hover:text-emerald-500 transition-colors truncate">
                                {tx.type === 'transfer'
                                  ? `${tx.account_name} ➔ ${tx.to_account_name || 'Account'}`
                                  : tx.payee || tx.category_name || 'Transaction'}
                              </span>

                              {/* Category Badge (Desktop) */}
                              {tx.category_name && tx.type !== 'transfer' && (
                                <span className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-medium bg-theme-subtle border border-theme text-theme-muted shrink-0">
                                  <span
                                    className="w-1.5 h-1.5 rounded-full"
                                    style={{ backgroundColor: tx.category_color || '#64748B' }}
                                  />
                                  <span className="truncate max-w-[100px]">{tx.category_name}</span>
                                </span>
                              )}

                              {/* Account Badge */}
                              <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-medium bg-theme-subtle/70 border border-theme/60 text-theme-faint shrink-0">
                                <span className="truncate max-w-[90px]">{tx.account_name}</span>
                              </span>

                              {/* Pending Badge */}
                              {tx.status === 'pending' && (
                                <Badge variant="warning" size="sm">Pending</Badge>
                              )}
                            </div>

                            {/* Sub-line: mobile category, note, payment method */}
                            <div className="flex items-center gap-2 text-[10px] text-theme-muted mt-0.5 min-w-0">
                              {/* On mobile: category indicator */}
                              {tx.category_name && tx.type !== 'transfer' && (
                                <span className="sm:hidden flex items-center gap-1 shrink-0 text-theme-faint">
                                  <span
                                    className="w-1.5 h-1.5 rounded-full"
                                    style={{ backgroundColor: tx.category_color || '#64748B' }}
                                  />
                                  <span>{tx.category_name}</span>
                                  <span>•</span>
                                </span>
                              )}

                              {/* Note if present */}
                              {tx.note && (
                                <span className="italic text-theme-muted/80 truncate max-w-[180px] sm:max-w-xs">
                                  &ldquo;{tx.note}&rdquo;
                                </span>
                              )}

                              {tx.note && tx.payment_type && <span className="text-theme-faint/60">•</span>}

                              {/* Payment type */}
                              {tx.payment_type && (
                                <span className="text-theme-faint capitalize shrink-0">
                                  {tx.payment_type.replace('_', ' ')}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Amount & Time (Right Column) */}
                        <div className="text-right tabular-nums shrink-0 self-center pl-2">
                          <div className={`text-xs sm:text-sm font-bold ${
                            tx.type === 'income'
                              ? 'text-emerald-500'
                              : tx.type === 'expense'
                              ? 'text-rose-500 dark:text-rose-400'
                              : 'text-sky-500'
                          }`}>
                            {tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : ''}
                            {formatCurrency(tx.amount, txCurrency, privacyMode)}
                          </div>
                          <div className="text-[10px] text-theme-faint font-medium">
                            {tx.time || 'Cleared'}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* PAGINATION CONTROLS BAR */}
      {totalFiltered > 0 && (
        <Card className="p-2.5 sm:px-4 sm:py-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs border border-theme">
          {/* Left: Range and Rows Per Page Selector */}
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
            <div className="text-theme-muted text-[11px] sm:text-xs">
              Showing <span className="font-semibold text-theme-title">{startIndex + 1}</span>–
              <span className="font-semibold text-theme-title">{endIndex}</span> of{' '}
              <span className="font-semibold text-theme-title">{totalFiltered}</span>
            </div>

            <div className="flex items-center gap-1.5 text-theme-muted text-[11px] sm:text-xs">
              <span className="hidden xs:inline">Rows:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-theme-subtle border border-theme text-theme-title text-xs rounded-lg px-2 py-1 font-semibold focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value={20}>20 rows</option>
                <option value={50}>50 rows</option>
                <option value={100}>100 rows</option>
              </select>
            </div>
          </div>

          {/* Right: Page Navigation Buttons */}
          <div className="flex items-center gap-1.5 w-full sm:w-auto justify-center sm:justify-end">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={validPage === 1}
              className="p-1 rounded-lg border border-theme text-theme-muted hover:text-theme-title hover:bg-theme-subtle disabled:opacity-30 disabled:pointer-events-none transition-colors"
              title="First Page"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>

            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={validPage === 1}
              className="p-1 rounded-lg border border-theme text-theme-muted hover:text-theme-title hover:bg-theme-subtle disabled:opacity-30 disabled:pointer-events-none transition-colors"
              title="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="px-2.5 py-1 text-xs font-semibold text-theme-title bg-theme-subtle rounded-lg border border-theme tabular-nums">
              Page {validPage} of {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={validPage >= totalPages}
              className="p-1 rounded-lg border border-theme text-theme-muted hover:text-theme-title hover:bg-theme-subtle disabled:opacity-30 disabled:pointer-events-none transition-colors"
              title="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={validPage >= totalPages}
              className="p-1 rounded-lg border border-theme text-theme-muted hover:text-theme-title hover:bg-theme-subtle disabled:opacity-30 disabled:pointer-events-none transition-colors"
              title="Last Page"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        </Card>
      )}

      {/* FLOATING BULK ACTIONS TOOLBAR (Safely positioned above bottom menu bar on mobile: bottom-20 on mobile, bottom-6 on desktop) */}
      {selectedIds.size > 0 && onBulkDeleteTransactions && (
        <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-40 w-[94%] max-w-xl animate-in slide-in-from-bottom-5 duration-200">
          <div className="p-2.5 sm:p-3 bg-zinc-900/95 dark:bg-zinc-900/95 text-white backdrop-blur-md rounded-2xl border border-zinc-700/80 shadow-2xl flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-xs shrink-0">
                {selectedIds.size}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-white truncate">
                  {selectedIds.size} {selectedIds.size === 1 ? 'item' : 'items'} selected
                </div>
                <div className="text-[10px] text-zinc-400 flex items-center gap-1.5 truncate">
                  {selectedNetExpense > 0 && (
                    <span className="text-rose-400">-{formatCurrency(selectedNetExpense, baseCurrency, privacyMode)}</span>
                  )}
                  {selectedNetExpense > 0 && selectedNetIncome > 0 && <span>•</span>}
                  {selectedNetIncome > 0 && (
                    <span className="text-emerald-400">+{formatCurrency(selectedNetIncome, baseCurrency, privacyMode)}</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                size="xs"
                variant="ghost"
                onClick={handleDeselectAll}
                className="text-zinc-300 hover:text-white hover:bg-zinc-800 h-7 px-2 text-xs"
              >
                Clear
              </Button>
              <Button
                size="xs"
                variant="danger"
                onClick={() => setShowConfirmModal(true)}
                leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                className="shadow-sm h-7 px-2.5 text-xs"
              >
                Delete Selected
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* BULK DELETE CONFIRMATION MODAL */}
      <Modal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        title="Confirm Bulk Deletion"
        maxWidth="md"
      >
        <div className="p-4 sm:p-5 space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/25 flex items-center justify-center text-rose-500 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-theme-title">
                Permanently delete {selectedIds.size} {selectedIds.size === 1 ? 'transaction' : 'transactions'}?
              </h4>
              <p className="text-xs text-theme-muted mt-1 leading-relaxed">
                All account balances will be automatically recalculated and reconciled to reverse the impact of these records. This action cannot be undone.
              </p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-theme-subtle border border-theme text-xs space-y-1">
            <div className="flex justify-between text-theme-muted">
              <span>Selected count:</span>
              <span className="font-semibold text-theme-main">{selectedIds.size}</span>
            </div>
            {selectedNetExpense > 0 && (
              <div className="flex justify-between text-theme-muted">
                <span>Expenses to revert:</span>
                <span className="font-semibold text-rose-500">-{formatCurrency(selectedNetExpense, baseCurrency, privacyMode)}</span>
              </div>
            )}
            {selectedNetIncome > 0 && (
              <div className="flex justify-between text-theme-muted">
                <span>Income to revert:</span>
                <span className="font-semibold text-emerald-500">+{formatCurrency(selectedNetIncome, baseCurrency, privacyMode)}</span>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowConfirmModal(false)}
              disabled={isBulkDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleExecuteBulkDelete}
              disabled={isBulkDeleting}
              leftIcon={<Trash2 className="w-3.5 h-3.5" />}
            >
              {isBulkDeleting ? 'Deleting...' : `Confirm Delete (${selectedIds.size})`}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
