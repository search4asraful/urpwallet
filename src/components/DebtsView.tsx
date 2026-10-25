'use client';

import React, { useState, useMemo } from 'react';
import {
  Plus,
  Edit3,
  Trash2,
  CheckCircle2,
  Clock,
  Users,
  Search,
  X,
  ArrowDownLeft,
  ArrowUpRight,
  AlertTriangle,
  RotateCcw,
  SlidersHorizontal,
  FileText,
  Calendar,
  Wallet,
} from 'lucide-react';
import { Debt, DebtType } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Card, Button, Badge, ProgressBar, Tabs, StatCard, EmptyState } from '@/components/ui';

interface DebtsViewProps {
  debts: Debt[];
  privacyMode: boolean;
  baseCurrency: string;
  onOpenAddDebt: () => void;
  onEditDebt: (d: Debt) => void;
  onDeleteDebt: (id: string) => void;
  onRecordPayment: (d: Debt) => void;
}

type DirectionFilter = 'all' | DebtType;
type StatusFilter = 'all' | 'active' | 'overdue' | 'settled';
type SortOption = 'due_date_asc' | 'due_date_desc' | 'remaining_desc' | 'amount_desc' | 'name_asc' | 'created_desc';

function getInitials(name: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getDueDateInfo(dueDateStr?: string | null, isSettled?: boolean) {
  if (!dueDateStr) {
    return { label: 'No due date', status: 'none' as const, days: 0 };
  }
  if (isSettled) {
    return { label: formatDate(dueDateStr), status: 'settled' as const, days: 0 };
  }

  const [y, m, d] = dueDateStr.split('-').map(Number);
  const dueDate = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  dueDate.setHours(0, 0, 0, 0);

  const diffTime = dueDate.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    const overdueDays = Math.abs(diffDays);
    return {
      label: overdueDays === 1 ? 'Overdue by 1 day' : `Overdue by ${overdueDays} days`,
      status: 'overdue' as const,
      days: overdueDays,
      formattedDate: formatDate(dueDateStr),
    };
  }
  if (diffDays === 0) {
    return {
      label: 'Due today',
      status: 'due-today' as const,
      days: 0,
      formattedDate: formatDate(dueDateStr),
    };
  }
  if (diffDays === 1) {
    return {
      label: 'Due tomorrow',
      status: 'due-soon' as const,
      days: 1,
      formattedDate: formatDate(dueDateStr),
    };
  }
  if (diffDays <= 7) {
    return {
      label: `Due in ${diffDays} days`,
      status: 'due-soon' as const,
      days: diffDays,
      formattedDate: formatDate(dueDateStr),
    };
  }
  return {
    label: `Due ${formatDate(dueDateStr)}`,
    status: 'upcoming' as const,
    days: diffDays,
    formattedDate: formatDate(dueDateStr),
  };
}

export const DebtsView: React.FC<DebtsViewProps> = ({
  debts,
  privacyMode,
  baseCurrency,
  onOpenAddDebt,
  onEditDebt,
  onDeleteDebt,
  onRecordPayment,
}) => {
  const [directionFilter, setDirectionFilter] = useState<DirectionFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('created_desc');

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Summary Metrics
  const metrics = useMemo(() => {
    let totalLentActive = 0;
    let totalLentSettled = 0;
    let countLentActive = 0;
    let countLentSettled = 0;

    let totalBorrowedActive = 0;
    let totalBorrowedSettled = 0;
    let countBorrowedActive = 0;
    let countBorrowedSettled = 0;

    let overdueCount = 0;
    let overdueTotal = 0;

    debts.forEach((d) => {
      const remaining = Math.max(0, d.amount - d.settled_amount);
      const isSettled = d.status === 'settled' || remaining <= 0;
      const isOverdue = !isSettled && d.due_date && d.due_date < todayStr;

      if (isOverdue) {
        overdueCount += 1;
        overdueTotal += remaining;
      }

      if (d.type === 'loan_owed_to_me') {
        if (isSettled) {
          countLentSettled += 1;
          totalLentSettled += d.settled_amount;
        } else {
          countLentActive += 1;
          totalLentActive += remaining;
        }
      } else {
        if (isSettled) {
          countBorrowedSettled += 1;
          totalBorrowedSettled += d.settled_amount;
        } else {
          countBorrowedActive += 1;
          totalBorrowedActive += remaining;
        }
      }
    });

    const netPosition = totalLentActive - totalBorrowedActive;

    return {
      totalLentActive,
      totalLentSettled,
      countLentActive,
      countLentSettled,
      totalBorrowedActive,
      totalBorrowedSettled,
      countBorrowedActive,
      countBorrowedSettled,
      netPosition,
      overdueCount,
      overdueTotal,
    };
  }, [debts, todayStr]);

  // Filtering & Sorting
  const filteredDebts = useMemo(() => {
    return debts
      .filter((d) => {
        // Direction filter
        if (directionFilter !== 'all' && d.type !== directionFilter) {
          return false;
        }

        const remaining = Math.max(0, d.amount - d.settled_amount);
        const isSettled = d.status === 'settled' || remaining <= 0;
        const isOverdue = !isSettled && d.due_date && d.due_date < todayStr;

        // Status filter
        if (statusFilter === 'active' && isSettled) return false;
        if (statusFilter === 'settled' && !isSettled) return false;
        if (statusFilter === 'overdue' && !isOverdue) return false;

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchesName = d.person_name.toLowerCase().includes(q);
          const matchesNotes = d.notes ? d.notes.toLowerCase().includes(q) : false;
          if (!matchesName && !matchesNotes) return false;
        }

        return true;
      })
      .sort((a, b) => {
        const remainingA = Math.max(0, a.amount - a.settled_amount);
        const remainingB = Math.max(0, b.amount - b.settled_amount);

        switch (sortBy) {
          case 'due_date_asc': {
            if (!a.due_date) return 1;
            if (!b.due_date) return -1;
            return a.due_date.localeCompare(b.due_date);
          }
          case 'due_date_desc': {
            if (!a.due_date) return 1;
            if (!b.due_date) return -1;
            return b.due_date.localeCompare(a.due_date);
          }
          case 'remaining_desc':
            return remainingB - remainingA;
          case 'amount_desc':
            return b.amount - a.amount;
          case 'name_asc':
            return a.person_name.localeCompare(b.person_name);
          case 'created_desc':
          default:
            return (b.created_at || '').localeCompare(a.created_at || '');
        }
      });
  }, [debts, directionFilter, statusFilter, searchQuery, sortBy, todayStr]);

  const handleDelete = (d: Debt) => {
    if (confirm(`Delete debt record for "${d.person_name}"?`)) {
      onDeleteDebt(d.id);
    }
  };

  const isFiltered = directionFilter !== 'all' || statusFilter !== 'all' || searchQuery.trim() !== '';

  const handleResetFilters = () => {
    setDirectionFilter('all');
    setStatusFilter('all');
    setSearchQuery('');
    setSortBy('created_desc');
  };

  const directionTabs = [
    {
      id: 'all' as DirectionFilter,
      label: 'All Records',
      count: debts.length,
      activeColor: 'emerald' as const,
    },
    {
      id: 'loan_owed_to_me' as DirectionFilter,
      label: 'Lent Out',
      count: debts.filter((d) => d.type === 'loan_owed_to_me').length,
      activeColor: 'emerald' as const,
    },
    {
      id: 'debt_i_owe' as DirectionFilter,
      label: 'Borrowed',
      count: debts.filter((d) => d.type === 'debt_i_owe').length,
      activeColor: 'rose' as const,
    },
  ];

  return (
    <div className="space-y-6 pb-20 md:pb-8 max-w-6xl mx-auto w-full animate-in fade-in duration-200">
      {/* Header with Title and Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-theme-title tracking-tight flex items-center gap-2">
            <span>Debts & Loans</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-theme-subtle text-theme-muted border border-theme">
              {debts.length} total
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-theme-muted mt-0.5">
            Track personal lending, borrowings, repayment schedules, and net standing
          </p>
        </div>

        <Button
          onClick={onOpenAddDebt}
          variant="primary"
          size="md"
          leftIcon={<Plus className="w-4 h-4 stroke-[2.5]" />}
          className="self-start sm:self-auto shrink-0 shadow-sm"
        >
          Record Debt / Loan
        </Button>
      </div>

      {/* 3 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {/* Net Position Card */}
        <div className="rounded-2xl p-5 bg-theme-card border border-theme shadow-xs flex flex-col justify-between transition-colors">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-theme-muted flex items-center gap-1.5">
              <Wallet className="w-3.5 h-3.5 text-theme-muted" />
              Net Position
            </span>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                metrics.netPosition > 0
                  ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                  : metrics.netPosition < 0
                  ? 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                  : 'bg-theme-subtle text-theme-muted border-theme'
              }`}
            >
              {metrics.netPosition > 0
                ? 'Receivable'
                : metrics.netPosition < 0
                ? 'Payable'
                : 'Balanced'}
            </span>
          </div>

          <div
            className={`text-2xl font-black tabular-nums tracking-tight ${
              metrics.netPosition > 0
                ? 'text-emerald-500'
                : metrics.netPosition < 0
                ? 'text-rose-500'
                : 'text-theme-title'
            }`}
          >
            {formatCurrency(metrics.netPosition, baseCurrency, privacyMode)}
          </div>

          <p className="text-[11px] text-theme-muted mt-1.5 line-clamp-1">
            {metrics.netPosition > 0
              ? 'You are owed more than you owe others'
              : metrics.netPosition < 0
              ? 'Your outstanding debts exceed what is owed to you'
              : 'Equal balance between lent and borrowed'}
          </p>
        </div>

        {/* Lent Out Card */}
        <StatCard
          label="Lent Out (Owed to You)"
          value={formatCurrency(metrics.totalLentActive, baseCurrency, privacyMode)}
          icon={<ArrowDownLeft className="w-4 h-4" />}
          iconColor="text-emerald-500"
          subtitle={`${metrics.countLentActive} active loans • ${metrics.countLentSettled} settled`}
        />

        {/* Borrowed Card */}
        <StatCard
          label="Borrowed (You Owe)"
          value={formatCurrency(metrics.totalBorrowedActive, baseCurrency, privacyMode)}
          icon={<ArrowUpRight className="w-4 h-4" />}
          iconColor="text-rose-500"
          subtitle={`${metrics.countBorrowedActive} active debts • ${metrics.countBorrowedSettled} settled`}
        />
      </div>

      {/* Overdue Warning Callout (if any overdue) */}
      {metrics.overdueCount > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-500">
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 rounded-xl bg-rose-500/20 text-rose-500 shrink-0">
              <AlertTriangle className="w-4 h-4 stroke-[2.5]" />
            </span>
            <div>
              <span className="font-bold">
                {metrics.overdueCount} {metrics.overdueCount === 1 ? 'record is' : 'records are'} overdue
              </span>
              <span className="text-theme-muted ml-1.5">
                Totaling {formatCurrency(metrics.overdueTotal, baseCurrency, privacyMode)} in outstanding balances past due date.
              </span>
            </div>
          </div>

          {statusFilter !== 'overdue' && (
            <Button
              size="xs"
              variant="rose-subtle"
              onClick={() => setStatusFilter('overdue')}
              className="self-start sm:self-auto shrink-0"
            >
              Filter Overdue Records
            </Button>
          )}
        </div>
      )}

      {/* Control Bar: Tabs, Search, Status Filter, Sort */}
      <div className="space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Direction Filter Tabs */}
          <Tabs
            items={directionTabs}
            activeTab={directionFilter}
            onChange={(t) => setDirectionFilter(t as DirectionFilter)}
            className="w-full lg:w-auto"
          />

          {/* Search & Selectors */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full lg:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-theme-muted pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search person or notes..."
                className="w-full h-8 pl-8 pr-7 text-xs bg-theme-subtle border border-theme rounded-xl text-theme-title placeholder:text-theme-muted focus:outline-none focus:border-theme-strong focus:bg-theme-card transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-theme-muted hover:text-theme-title p-0.5"
                  title="Clear search"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="h-8 px-2.5 text-xs bg-theme-subtle border border-theme rounded-xl text-theme-title focus:outline-none focus:border-theme-strong focus:bg-theme-card transition-colors cursor-pointer shrink-0"
              aria-label="Filter by status"
            >
              <option value="all" className="bg-theme-card text-theme-title">All Statuses</option>
              <option value="active" className="bg-theme-card text-theme-title">Active Only</option>
              <option value="overdue" className="bg-theme-card text-theme-title">
                Overdue {metrics.overdueCount > 0 ? `(${metrics.overdueCount})` : ''}
              </option>
              <option value="settled" className="bg-theme-card text-theme-title">Settled Only</option>
            </select>

            {/* Sort Selector */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="h-8 px-2.5 text-xs bg-theme-subtle border border-theme rounded-xl text-theme-title focus:outline-none focus:border-theme-strong focus:bg-theme-card transition-colors cursor-pointer shrink-0"
              aria-label="Sort debts"
            >
              <option value="created_desc" className="bg-theme-card text-theme-title">Recently Added</option>
              <option value="due_date_asc" className="bg-theme-card text-theme-title">Due Date (Earliest)</option>
              <option value="due_date_desc" className="bg-theme-card text-theme-title">Due Date (Latest)</option>
              <option value="remaining_desc" className="bg-theme-card text-theme-title">Remaining (High to Low)</option>
              <option value="amount_desc" className="bg-theme-card text-theme-title">Total Amount (High to Low)</option>
              <option value="name_asc" className="bg-theme-card text-theme-title">Person Name (A-Z)</option>
            </select>

            {/* Reset Filters Pill */}
            {isFiltered && (
              <Button
                variant="ghost"
                size="xs"
                onClick={handleResetFilters}
                leftIcon={<RotateCcw className="w-3 h-3" />}
                className="shrink-0 text-theme-muted hover:text-theme-title"
                title="Reset active filters"
              >
                Reset
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Debts Grid or Empty State */}
      {debts.length === 0 ? (
        <EmptyState
          icon={<Users className="w-9 h-9 text-theme-faint mx-auto mb-2" />}
          title="No Debts or Loans Recorded"
          description="Keep track of money lent to friends, borrowed funds, and shared group tabs with real-time settlement tracking."
          action={
            <Button
              variant="primary"
              size="md"
              onClick={onOpenAddDebt}
              leftIcon={<Plus className="w-4 h-4 stroke-[2.5]" />}
            >
              Record First Debt or Loan
            </Button>
          }
        />
      ) : filteredDebts.length === 0 ? (
        <EmptyState
          icon={<SlidersHorizontal className="w-8 h-8 text-theme-faint mx-auto mb-2" />}
          title="No Matching Records"
          description={
            searchQuery
              ? `No records match "${searchQuery}" with the current filters.`
              : 'No records match the selected filter criteria.'
          }
          action={
            <Button
              variant="secondary"
              size="sm"
              onClick={handleResetFilters}
              leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
            >
              Clear All Filters
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredDebts.map((d) => {
            const remaining = Math.max(0, d.amount - d.settled_amount);
            const progress = d.amount > 0 ? Math.min(100, Math.round((d.settled_amount / d.amount) * 100)) : 0;
            const isSettled = d.status === 'settled' || remaining <= 0;
            const isLent = d.type === 'loan_owed_to_me';
            const initials = getInitials(d.person_name);
            const dueInfo = getDueDateInfo(d.due_date, isSettled);

            return (
              <Card
                key={d.id}
                hoverable
                className="p-4 sm:p-5 flex flex-col justify-between gap-4 transition-all"
              >
                {/* Header: Avatar, Name, Badges & Accessible Action Buttons */}
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex items-start gap-3 min-w-0">
                    {/* Person Initials Avatar */}
                    <div
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-xs shrink-0 select-none border ${
                        isLent
                          ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                      }`}
                    >
                      {initials}
                    </div>

                    {/* Person Name & Badges */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-bold text-theme-title truncate">
                          {d.person_name}
                        </h3>

                        {/* Direction Badge */}
                        <Badge
                          variant={isLent ? 'emerald' : 'rose'}
                          size="xs"
                          icon={
                            isLent ? (
                              <ArrowDownLeft className="w-3 h-3 stroke-[2.5]" />
                            ) : (
                              <ArrowUpRight className="w-3 h-3 stroke-[2.5]" />
                            )
                          }
                        >
                          {isLent ? 'Lent' : 'Borrowed'}
                        </Badge>

                        {/* Settlement / Overdue Badge */}
                        {isSettled ? (
                          <Badge variant="success" size="xs" icon={<CheckCircle2 className="w-3 h-3" />}>
                            Settled
                          </Badge>
                        ) : dueInfo.status === 'overdue' ? (
                          <Badge variant="danger" size="xs" icon={<AlertTriangle className="w-3 h-3" />}>
                            {dueInfo.label}
                          </Badge>
                        ) : dueInfo.status === 'due-today' || dueInfo.status === 'due-soon' ? (
                          <Badge variant="warning" size="xs" icon={<Clock className="w-3 h-3" />}>
                            {dueInfo.label}
                          </Badge>
                        ) : null}
                      </div>

                      {/* Notes snippet if present */}
                      {d.notes && (
                        <p className="text-[11px] text-theme-muted mt-1 line-clamp-1 flex items-center gap-1">
                          <FileText className="w-3 h-3 text-theme-faint shrink-0" />
                          <span>{d.notes}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions: Always visible on touch and desktop */}
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => onEditDebt(d)}
                      title="Edit debt record"
                      className="text-theme-muted hover:text-theme-title"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleDelete(d)}
                      className="text-theme-muted hover:text-rose-500 hover:bg-rose-500/10"
                      title="Delete debt record"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Financial Figures & Progress Bar */}
                <div className="space-y-2 p-3 bg-theme-subtle rounded-xl border border-theme">
                  <div className="flex items-baseline justify-between tabular-nums">
                    <div>
                      <div className="text-[10px] uppercase font-bold text-theme-muted tracking-wider">
                        {isSettled ? 'Total Settled' : 'Remaining Balance'}
                      </div>
                      <div className="text-xl font-black text-theme-title tracking-tight mt-0.5">
                        {isSettled ? (
                          <span className="text-emerald-500 flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4" />
                            {formatCurrency(d.amount, baseCurrency, privacyMode)}
                          </span>
                        ) : (
                          formatCurrency(remaining, baseCurrency, privacyMode)
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-[11px] font-semibold text-theme-muted">
                        of {formatCurrency(d.amount, baseCurrency, privacyMode)}
                      </div>
                      <div className="text-[10px] font-bold text-theme-faint mt-0.5">
                        {progress}% paid
                      </div>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <ProgressBar
                    value={progress}
                    variant={isLent ? 'emerald' : 'sky'}
                    size="sm"
                    className="mt-1"
                  />

                  {/* Micro Breakdown */}
                  <div className="flex items-center justify-between text-[10px] text-theme-muted pt-0.5">
                    <span>Paid: {formatCurrency(d.settled_amount, baseCurrency, privacyMode)}</span>
                    <span>
                      {isSettled
                        ? 'Completed'
                        : `${formatCurrency(remaining, baseCurrency, privacyMode)} left`}
                    </span>
                  </div>
                </div>

                {/* Footer: Due date info & Settlement CTA */}
                <div className="flex items-center justify-between gap-2 pt-1">
                  <div className="flex items-center gap-1.5 text-xs text-theme-muted">
                    <Calendar className="w-3.5 h-3.5 text-theme-faint shrink-0" />
                    <span className="text-[11px]">
                      {d.due_date ? (
                        <>
                          <span className="text-theme-muted">Due: </span>
                          <span className="font-semibold text-theme-title">
                            {formatDate(d.due_date)}
                          </span>
                        </>
                      ) : (
                        'No due date set'
                      )}
                    </span>
                  </div>

                  {!isSettled ? (
                    <Button
                      size="sm"
                      variant={isLent ? 'emerald-subtle' : 'primary'}
                      onClick={() => onRecordPayment(d)}
                      leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                      className="shrink-0 font-bold"
                    >
                      Record Settlement
                    </Button>
                  ) : (
                    <span className="text-[11px] font-semibold text-emerald-500 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Paid in Full
                    </span>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
