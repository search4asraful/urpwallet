'use client';

import React, { useState } from 'react';
import { Plus, Edit3, Trash2, CheckCircle2, Clock, UserCheck, AlertCircle, Users } from 'lucide-react';
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

export const DebtsView: React.FC<DebtsViewProps> = ({
  debts,
  privacyMode,
  baseCurrency,
  onOpenAddDebt,
  onEditDebt,
  onDeleteDebt,
  onRecordPayment,
}) => {
  const [activeTab, setActiveTab] = useState<DebtType>('loan_owed_to_me');

  const filtered = debts.filter((d) => d.type === activeTab);

  const totalOwedToMe = debts
    .filter((d) => d.type === 'loan_owed_to_me' && d.status === 'active')
    .reduce((sum, d) => sum + (d.amount - d.settled_amount), 0);

  const totalIOwe = debts
    .filter((d) => d.type === 'debt_i_owe' && d.status === 'active')
    .reduce((sum, d) => sum + (d.amount - d.settled_amount), 0);

  const handleDelete = (d: Debt) => {
    if (confirm(`Delete debt record for "${d.person_name}"?`)) {
      onDeleteDebt(d.id);
    }
  };

  const debtTabs = [
    { id: 'loan_owed_to_me' as DebtType, label: 'Lent (Owed to Me)', activeColor: 'emerald' as const },
    { id: 'debt_i_owe' as DebtType, label: 'Borrowed (I Owe)', activeColor: 'rose' as const },
  ];

  return (
    <div className="space-y-6 pb-20 md:pb-8 max-w-6xl mx-auto w-full animate-in fade-in duration-200">
      {/* 2 Summary Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <StatCard
          label="Lent (Owed to Me)"
          value={formatCurrency(totalOwedToMe, baseCurrency, privacyMode)}
          icon={<UserCheck className="w-3.5 h-3.5" />}
          iconColor="text-emerald-500"
          subtitle="Active money to be collected"
        />

        <StatCard
          label="Borrowed (I Owe)"
          value={formatCurrency(totalIOwe, baseCurrency, privacyMode)}
          icon={<AlertCircle className="w-3.5 h-3.5" />}
          iconColor="text-rose-500"
          subtitle="Outstanding debts to repay"
        />
      </div>

      {/* Tabs & Add Trigger */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Tabs
          items={debtTabs}
          activeTab={activeTab}
          onChange={(t) => setActiveTab(t)}
          className="w-full sm:w-auto"
        />

        <Button
          onClick={onOpenAddDebt}
          variant="primary"
          size="sm"
          leftIcon={<Plus className="w-3.5 h-3.5 stroke-[2.5]" />}
          className="self-start sm:self-auto"
        >
          Record Debt / Loan
        </Button>
      </div>

      {/* Debts List */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<Users className="w-8 h-8 text-theme-faint mx-auto mb-2" />}
          title={`No records under "${activeTab === 'loan_owed_to_me' ? 'Lent' : 'Borrowed'}"`}
          description="Keep track of personal loans, shared tabs, and borrowed money."
          action={
            <Button
              variant="primary"
              size="sm"
              onClick={onOpenAddDebt}
              leftIcon={<Plus className="w-3.5 h-3.5" />}
            >
              Add First Record
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filtered.map((d) => {
            const remaining = Math.max(0, d.amount - d.settled_amount);
            const progress = d.amount > 0 ? Math.min(100, Math.round((d.settled_amount / d.amount) * 100)) : 0;
            const isSettled = d.status === 'settled' || remaining <= 0;

            return (
              <Card
                key={d.id}
                hoverable
                className="p-4 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs font-bold text-theme-title">{d.person_name}</h3>
                      <Badge variant={isSettled ? 'success' : 'warning'} size="xs">
                        {isSettled ? 'Settled' : 'Active'}
                      </Badge>
                    </div>
                    {d.notes && <p className="text-[11px] text-theme-muted mt-0.5">{d.notes}</p>}
                  </div>

                  <div className="flex items-center gap-1 opacity-70 hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => onEditDebt(d)}
                      title="Edit record"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleDelete(d)}
                      className="hover:text-rose-500"
                      title="Delete record"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                <div className="flex items-baseline justify-between tabular-nums text-xs">
                  <div>
                    <span className="text-sm font-bold text-theme-title">
                      {formatCurrency(remaining, baseCurrency, privacyMode)}
                    </span>
                    <span className="text-theme-muted text-[11px]"> of {formatCurrency(d.amount, baseCurrency, privacyMode)}</span>
                  </div>
                  <span className="text-[11px] font-semibold text-theme-muted">{progress}% settled</span>
                </div>

                {/* Progress bar */}
                <ProgressBar value={progress} variant="emerald" size="sm" />

                <div className="flex items-center justify-between text-[11px] pt-1 border-t border-theme">
                  <span className="flex items-center gap-1 text-theme-muted">
                    {d.due_date ? (
                      <>
                        <Clock className="w-3 h-3 text-theme-faint" /> Due: {formatDate(d.due_date)}
                      </>
                    ) : (
                      'No due date'
                    )}
                  </span>

                  {!isSettled && (
                    <Button
                      size="xs"
                      variant="emerald-subtle"
                      onClick={() => onRecordPayment(d)}
                      leftIcon={<CheckCircle2 className="w-3 h-3" />}
                    >
                      Record Settlement
                    </Button>
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
