'use client';

import React, { useState, useEffect } from 'react';
import { Check, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { Debt, Account } from '@/types';
import { formatCurrency, getCurrencySymbol } from '@/lib/utils';
import { Modal, Button, ProgressBar, Badge } from '@/components/ui';

interface RecordDebtPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  debt: Debt | null;
  accounts?: Account[];
  baseCurrency?: string;
}

function getInitials(name: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export const RecordDebtPaymentModal: React.FC<RecordDebtPaymentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  debt,
  baseCurrency = 'USD',
}) => {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remaining = debt ? Math.max(0, debt.amount - debt.settled_amount) : 0;

  useEffect(() => {
    if (isOpen && debt) {
      const rem = Math.max(0, debt.amount - debt.settled_amount);
      setAmount(rem > 0 ? rem.toFixed(2) : '');
      setError(null);
    }
  }, [isOpen, debt]);

  if (!debt) return null;

  const isLent = debt.type === 'loan_owed_to_me';
  const progress = debt.amount > 0 ? Math.min(100, Math.round((debt.settled_amount / debt.amount) * 100)) : 0;
  const initials = getInitials(debt.person_name);

  const handlePreset = (fraction: number) => {
    const calculated = (remaining * fraction).toFixed(2);
    setAmount(calculated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid repayment amount greater than 0');
      return;
    }

    if (numAmount > remaining + 0.001) {
      setError(`Amount cannot exceed the remaining balance of ${formatCurrency(remaining, baseCurrency)}`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/debts/${debt.id}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: numAmount,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to record settlement');
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Record Settlement"
      maxWidth="sm"
    >
      <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-500 text-xs font-medium">
            {error}
          </div>
        )}

        {/* Debt Context Card */}
        <div className="bg-theme-subtle p-4 rounded-2xl border border-theme space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 select-none border ${
                  isLent
                    ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                }`}
              >
                {initials}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-theme-title truncate">
                  {debt.person_name}
                </div>
                <div className="text-[10px] text-theme-muted">
                  {isLent ? 'Borrower (Collecting from)' : 'Lender (Paying back to)'}
                </div>
              </div>
            </div>

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
          </div>

          {/* Balance breakdown */}
          <div className="grid grid-cols-3 gap-2 pt-1 text-center tabular-nums">
            <div className="p-1.5 rounded-lg bg-theme-card/60 border border-theme/50">
              <div className="text-[9px] uppercase font-bold text-theme-faint">Total</div>
              <div className="text-xs font-bold text-theme-title mt-0.5">
                {formatCurrency(debt.amount, baseCurrency)}
              </div>
            </div>
            <div className="p-1.5 rounded-lg bg-theme-card/60 border border-theme/50">
              <div className="text-[9px] uppercase font-bold text-theme-faint">Settled</div>
              <div className="text-xs font-bold text-theme-muted mt-0.5">
                {formatCurrency(debt.settled_amount, baseCurrency)}
              </div>
            </div>
            <div className="p-1.5 rounded-lg bg-theme-card border border-theme">
              <div className="text-[9px] uppercase font-bold text-emerald-500">Remaining</div>
              <div className="text-xs font-black text-theme-title mt-0.5">
                {formatCurrency(remaining, baseCurrency)}
              </div>
            </div>
          </div>

          {/* Settlement progress bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-theme-muted font-medium">
              <span>Settlement Progress</span>
              <span className="font-bold">{progress}%</span>
            </div>
            <ProgressBar value={progress} variant={isLent ? 'emerald' : 'sky'} size="sm" />
          </div>
        </div>

        {/* Payment Amount Input & Quick Chips */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-[11px] font-semibold text-theme-muted select-none">
              Payment Amount ({getCurrencySymbol(baseCurrency)})
            </label>
            <button
              type="button"
              onClick={() => setAmount(remaining.toFixed(2))}
              className="text-[11px] text-emerald-500 hover:underline font-bold"
            >
              Pay Full ({formatCurrency(remaining, baseCurrency)})
            </button>
          </div>

          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-theme-muted text-sm select-none">
              {getCurrencySymbol(baseCurrency)}
            </span>
            <input
              type="number"
              step="0.01"
              min="0.01"
              max={remaining}
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              className="w-full h-10 pl-8 pr-3 text-base font-bold tabular-nums bg-theme-subtle border border-theme rounded-xl text-theme-title placeholder:text-theme-faint focus:outline-none focus:border-theme-strong focus:bg-theme-card transition-colors"
            />
          </div>

          {/* Quick Percentage Chips */}
          <div className="grid grid-cols-4 gap-1.5 pt-0.5">
            <button
              type="button"
              onClick={() => handlePreset(0.25)}
              className="py-1 px-2 text-[10px] font-semibold rounded-lg bg-theme-subtle hover:bg-theme-subtle-hover text-theme-muted hover:text-theme-title border border-theme transition-colors"
            >
              25%
            </button>
            <button
              type="button"
              onClick={() => handlePreset(0.5)}
              className="py-1 px-2 text-[10px] font-semibold rounded-lg bg-theme-subtle hover:bg-theme-subtle-hover text-theme-muted hover:text-theme-title border border-theme transition-colors"
            >
              50%
            </button>
            <button
              type="button"
              onClick={() => handlePreset(0.75)}
              className="py-1 px-2 text-[10px] font-semibold rounded-lg bg-theme-subtle hover:bg-theme-subtle-hover text-theme-muted hover:text-theme-title border border-theme transition-colors"
            >
              75%
            </button>
            <button
              type="button"
              onClick={() => handlePreset(1.0)}
              className="py-1 px-2 text-[10px] font-bold rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/20 transition-colors"
            >
              100%
            </button>
          </div>
        </div>

        {/* Transaction Record Notice */}
        <div className="p-2.5 rounded-xl bg-theme-subtle border border-theme text-[11px] text-theme-muted flex items-center justify-between">
          <span>Recorded to transactions as:</span>
          <span className={`font-bold ${isLent ? 'text-emerald-500' : 'text-rose-500'}`}>
            {isLent ? '+ Income' : '- Expense'}
          </span>
        </div>

        {/* Submit Button */}
        <div className="pt-2">
          <Button
            type="submit"
            variant="primary"
            isLoading={loading}
            leftIcon={<Check className="w-4 h-4 stroke-[2.5]" />}
            className="w-full font-bold"
            size="md"
          >
            Confirm Settlement
          </Button>
        </div>
      </form>
    </Modal>
  );
};
