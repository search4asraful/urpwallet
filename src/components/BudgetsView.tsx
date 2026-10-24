'use client';

import React from 'react';
import { Plus, Edit3, Trash2, AlertCircle, CheckCircle2, PieChart } from 'lucide-react';
import { Budget } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { CategoryIcon } from './CategoryIcon';
import { Card, Button, ProgressBar, EmptyState } from '@/components/ui';

interface BudgetsViewProps {
  budgets: Budget[];
  privacyMode: boolean;
  baseCurrency: string;
  onOpenAddBudget: () => void;
  onEditBudget: (b: Budget) => void;
  onDeleteBudget: (id: string) => void;
}

export const BudgetsView: React.FC<BudgetsViewProps> = ({
  budgets,
  privacyMode,
  baseCurrency,
  onOpenAddBudget,
  onEditBudget,
  onDeleteBudget,
}) => {
  const today = new Date();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const daysRemaining = Math.max(1, daysInMonth - today.getDate());

  const totalBudgeted = budgets.reduce((sum, b) => sum + b.amount, 0);
  const totalSpent = budgets.reduce((sum, b) => sum + (b.spent || 0), 0);
  const totalRemaining = totalBudgeted - totalSpent;
  const overallPercentage = totalBudgeted > 0 ? Math.round((totalSpent / totalBudgeted) * 100) : 0;

  const handleDelete = (b: Budget) => {
    if (confirm(`Delete budget "${b.name}"?`)) {
      onDeleteBudget(b.id);
    }
  };

  return (
    <div className="space-y-6 pb-20 md:pb-8 max-w-6xl mx-auto w-full animate-in fade-in duration-200">
      {/* Top Health Banner */}
      <Card className="p-5 md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] uppercase tracking-wider font-semibold text-theme-muted">
                Budget Overview
              </span>
              <span className="text-theme-faint">•</span>
              <span className="text-xs text-theme-muted">{daysRemaining} days remaining in cycle</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-theme-title mt-1 tabular-nums">
              {formatCurrency(totalSpent, baseCurrency, privacyMode)}
              <span className="text-sm md:text-base font-normal text-theme-muted">
                {' '}of {formatCurrency(totalBudgeted, baseCurrency, privacyMode)}
              </span>
            </h1>
          </div>

          <Button
            onClick={onOpenAddBudget}
            variant="primary"
            size="sm"
            leftIcon={<Plus className="w-3.5 h-3.5 stroke-[2.5]" />}
            className="self-start sm:self-auto"
          >
            New Budget
          </Button>
        </div>

        {/* Global Progress Track */}
        <div className="mt-4 pt-3 border-t border-theme">
          <div className="flex justify-between text-xs font-medium text-theme-main mb-1.5 tabular-nums">
            <span>{overallPercentage}% spent</span>
            <span className={totalRemaining < 0 ? 'text-rose-500 font-semibold' : 'text-emerald-500 font-semibold'}>
              {totalRemaining >= 0
                ? `${formatCurrency(totalRemaining, baseCurrency, privacyMode)} left`
                : `Over by ${formatCurrency(Math.abs(totalRemaining), baseCurrency, privacyMode)}`}
            </span>
          </div>
          <ProgressBar value={overallPercentage} variant="auto" size="md" />
        </div>
      </Card>

      {/* Budgets Grid */}
      {budgets.length === 0 ? (
        <EmptyState
          icon={<PieChart className="w-8 h-8 text-theme-faint mx-auto mb-2" />}
          title="No budgets configured yet"
          description="Set spending limits for your monthly expenses to keep track of allowances."
          action={
            <Button
              variant="primary"
              size="sm"
              onClick={onOpenAddBudget}
              leftIcon={<Plus className="w-3.5 h-3.5" />}
            >
              Set First Budget
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {budgets.map((b) => {
            const spent = b.spent || 0;
            const percentage = Math.round((spent / b.amount) * 100);
            const remaining = b.amount - spent;
            const isOver = spent > b.amount;
            const dailySafe = Math.max(0, remaining / daysRemaining);

            return (
              <Card
                key={b.id}
                hoverable
                className="p-4 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0 shadow-xs"
                      style={{ backgroundColor: b.category_color || '#10B981' }}
                    >
                      <CategoryIcon name={b.category_icon || 'PieChart'} className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-theme-title">{b.name}</div>
                      <div className="text-[10px] text-theme-muted capitalize">
                        {b.period} • {b.category_name || 'All Categories'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 opacity-70 hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => onEditBudget(b)}
                      title="Edit budget"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleDelete(b)}
                      className="hover:text-rose-500"
                      title="Delete budget"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Numbers */}
                <div className="flex items-baseline justify-between tabular-nums">
                  <div className="text-sm font-bold text-theme-title">
                    {formatCurrency(spent, baseCurrency, privacyMode)}
                    <span className="text-xs text-theme-muted font-normal"> / {formatCurrency(b.amount, baseCurrency, privacyMode)}</span>
                  </div>
                  <span className={`text-[11px] font-semibold ${isOver ? 'text-rose-500' : 'text-theme-muted'}`}>
                    {percentage}%
                  </span>
                </div>

                {/* Progress bar */}
                <ProgressBar value={percentage} variant="auto" size="sm" />

                <div className="flex items-center justify-between text-[11px] pt-1 border-t border-theme">
                  <span className={`flex items-center gap-1 ${isOver ? 'text-rose-500 font-bold' : 'text-theme-muted'}`}>
                    {isOver ? <AlertCircle className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
                    {isOver
                      ? `Over by ${formatCurrency(Math.abs(remaining), baseCurrency, privacyMode)}`
                      : `${formatCurrency(remaining, baseCurrency, privacyMode)} left`}
                  </span>

                  <span className="text-theme-muted font-medium">
                    {isOver ? 'Limit exceeded' : `Safe: ${formatCurrency(dailySafe, baseCurrency, privacyMode)}/day`}
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
