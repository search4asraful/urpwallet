'use client';

import React from 'react';
import { Plus, Edit3, Trash2, CheckCircle2, Clock, Calendar } from 'lucide-react';
import { PlannedPayment } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { CategoryIcon } from './CategoryIcon';
import { Card, Button, Badge, EmptyState } from '@/components/ui';

interface PlannedViewProps {
  planned: PlannedPayment[];
  privacyMode: boolean;
  baseCurrency: string;
  onOpenAddPlanned: () => void;
  onEditPlanned: (p: PlannedPayment) => void;
  onDeletePlanned: (id: string) => void;
  onExecutePlanned: (id: string) => void;
}

export const PlannedView: React.FC<PlannedViewProps> = ({
  planned,
  privacyMode,
  baseCurrency,
  onOpenAddPlanned,
  onEditPlanned,
  onDeletePlanned,
  onExecutePlanned,
}) => {
  const totalUpcoming = planned
    .filter((p) => p.is_active === 1 && p.type === 'expense')
    .reduce((sum, p) => sum + p.amount, 0);

  const handleDelete = (p: PlannedPayment) => {
    if (confirm(`Delete planned payment "${p.name}"?`)) {
      onDeletePlanned(p.id);
    }
  };

  return (
    <div className="space-y-6 pb-20 md:pb-8 max-w-6xl mx-auto w-full animate-in fade-in duration-200">
      {/* Top Banner */}
      <Card className="p-5 md:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] uppercase tracking-wider font-semibold text-theme-muted">
            Recurring & Scheduled
          </span>
          <h1 className="text-2xl md:text-3xl font-extrabold text-theme-title mt-1 tabular-nums">
            {formatCurrency(totalUpcoming, baseCurrency, privacyMode)}
            <span className="text-xs font-normal text-theme-muted"> / upcoming bills</span>
          </h1>
          <p className="text-xs text-theme-muted mt-0.5">
            Subscriptions, utilities, and scheduled transfers
          </p>
        </div>

        <Button
          onClick={onOpenAddPlanned}
          variant="primary"
          size="sm"
          leftIcon={<Plus className="w-3.5 h-3.5 stroke-[2.5]" />}
          className="self-start sm:self-auto"
        >
          Schedule Bill
        </Button>
      </Card>

      {/* Planned Payments List */}
      {planned.length === 0 ? (
        <EmptyState
          icon={<Calendar className="w-8 h-8 text-theme-faint mx-auto mb-2" />}
          title="No scheduled recurring payments yet"
          description="Add your recurring bills, subscriptions, and paychecks to stay ahead."
          action={
            <Button
              variant="primary"
              size="sm"
              onClick={onOpenAddPlanned}
              leftIcon={<Plus className="w-3.5 h-3.5" />}
            >
              Schedule First Bill
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {planned.map((p) => (
            <Card
              key={p.id}
              hoverable
              className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0 shadow-xs"
                  style={{ backgroundColor: p.category_color || '#3B82F6' }}
                >
                  <CategoryIcon name={p.category_icon || 'Calendar'} className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-semibold text-theme-title">{p.name}</h3>
                    <Badge variant="neutral" size="xs">
                      <span className="uppercase">{p.frequency}</span>
                    </Badge>
                    {p.auto_record === 1 && (
                      <Badge variant="success" size="xs">
                        Auto
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-theme-muted mt-0.5">
                    <span className="flex items-center gap-1 text-theme-title font-medium">
                      <Clock className="w-2.5 h-2.5 text-emerald-500" /> Due: {formatDate(p.next_date)}
                    </span>
                    <span>•</span>
                    <span>{p.account_name || 'Account'}</span>
                    {p.payee && (
                      <>
                        <span>•</span>
                        <span>{p.payee}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-0 border-theme">
                <div className="text-left sm:text-right tabular-nums">
                  <span className={`text-xs font-bold ${
                    p.type === 'expense' ? 'text-theme-title' : 'text-emerald-500'
                  }`}>
                    {p.type === 'expense' ? '-' : '+'}{formatCurrency(p.amount, baseCurrency, privacyMode)}
                  </span>
                  <div className="text-[9px] uppercase tracking-wider text-theme-faint font-semibold">{p.type}</div>
                </div>

                <div className="flex items-center gap-1.5">
                  <Button
                    size="xs"
                    variant="emerald-subtle"
                    onClick={() => onExecutePlanned(p.id)}
                    leftIcon={<CheckCircle2 className="w-3 h-3" />}
                  >
                    Pay Now
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => onEditPlanned(p)}
                    title="Edit bill"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => handleDelete(p)}
                    className="hover:text-rose-500"
                    title="Delete bill"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
