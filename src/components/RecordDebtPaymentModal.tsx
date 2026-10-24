'use client';

import React, { useState } from 'react';
import { Check } from 'lucide-react';
import { Debt, Account } from '@/types';
import { formatCurrency, getCurrencySymbol } from '@/lib/utils';
import { Modal, Button, Input, Select } from '@/components/ui';

interface RecordDebtPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  debt: Debt | null;
  accounts: Account[];
  baseCurrency?: string;
}

export const RecordDebtPaymentModal: React.FC<RecordDebtPaymentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  debt,
  accounts,
  baseCurrency = 'USD',
}) => {
  const [amount, setAmount] = useState('');
  const [accountId, setAccountId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!debt) return null;

  const remaining = Math.max(0, debt.amount - debt.settled_amount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Enter a valid payment amount');
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
          account_id: accountId || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to record repayment');
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
      <form onSubmit={handleSubmit} className="p-5 space-y-3.5">
        {error && (
          <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-500 text-xs">
            {error}
          </div>
        )}

        <div className="bg-theme-subtle p-3.5 rounded-xl border border-theme">
          <div className="text-[10px] text-theme-muted uppercase tracking-wider font-semibold">
            {debt.type === 'loan_owed_to_me' ? 'Borrower' : 'Lender'}
          </div>
          <div className="text-sm font-bold text-theme-title mb-1.5">{debt.person_name}</div>
          <div className="flex justify-between items-center text-[11px] text-theme-muted tabular-nums">
            <span>Total: {formatCurrency(debt.amount)}</span>
            <span className="text-emerald-500 font-semibold">Remaining: {formatCurrency(remaining)}</span>
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="text-[11px] font-semibold text-theme-muted select-none">
              Payment Amount ({getCurrencySymbol(accounts.find((a) => a.id === accountId)?.currency || baseCurrency)})
            </label>
            <button
              type="button"
              onClick={() => setAmount(remaining.toFixed(2))}
              className="text-[10px] text-emerald-500 hover:underline font-semibold"
            >
              Pay Full ({formatCurrency(remaining, baseCurrency)})
            </button>
          </div>
          <Input
            type="number"
            step="0.01"
            max={remaining}
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            className="text-base font-bold tabular-nums"
          />
        </div>

        <Select
          label="Sync Account (optional)"
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
        >
          <option value="" className="bg-theme-card text-theme-title">Do not create account transaction</option>
          {accounts.map((acc) => (
            <option key={acc.id} value={acc.id} className="bg-theme-card text-theme-title">
              {acc.name} ({formatCurrency(acc.balance, acc.currency)})
            </option>
          ))}
        </Select>

        <div className="pt-2">
          <Button
            type="submit"
            variant="primary"
            isLoading={loading}
            leftIcon={<Check className="w-4 h-4 stroke-[2.5]" />}
            className="w-full"
            size="md"
          >
            Confirm Repayment
          </Button>
        </div>
      </form>
    </Modal>
  );
};
