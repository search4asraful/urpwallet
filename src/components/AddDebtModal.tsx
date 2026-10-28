'use client';

import React, { useState } from 'react';
import { Check, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { Debt, DebtType } from '@/types';
import { getCurrencySymbol } from '@/lib/utils';
import { Modal, Button, Input } from '@/components/ui';

interface AddDebtModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingDebt?: Debt | null;
  baseCurrency?: string;
}

export const AddDebtModal: React.FC<AddDebtModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  editingDebt = null,
  baseCurrency = 'USD',
}) => {
  const [type, setType] = useState<DebtType>('loan_owed_to_me');
  const [personName, setPersonName] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [prevDebtKey, setPrevDebtKey] = useState<string | null>(
    isOpen ? (editingDebt ? `${editingDebt.id}_${editingDebt.amount}` : '__new__') : null
  );

  const currentDebtKey = isOpen ? (editingDebt ? `${editingDebt.id}_${editingDebt.amount}` : '__new__') : null;
  if (currentDebtKey !== prevDebtKey) {
    setPrevDebtKey(currentDebtKey);
    if (editingDebt) {
      setType(editingDebt.type);
      setPersonName(editingDebt.person_name);
      setAmount(String(editingDebt.amount));
      setDueDate(editingDebt.due_date || '');
      setNotes(editingDebt.notes || '');
    } else {
      setType('loan_owed_to_me');
      setPersonName('');
      setAmount('');
      setDueDate('');
      setNotes('');
    }
    setError(null);
  }

  const handleQuickDueDate = (daysToAdd: number) => {
    const target = new Date();
    target.setDate(target.getDate() + daysToAdd);
    setDueDate(target.toISOString().split('T')[0]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid amount greater than 0');
      return;
    }
    if (!personName.trim()) {
      setError('Person or entity name is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = {
        type,
        person_name: personName.trim(),
        amount: numAmount,
        due_date: dueDate || null,
        notes: notes.trim() || null,
      };

      const url = editingDebt ? `/api/debts/${editingDebt.id}` : '/api/debts';
      const method = editingDebt ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save record');
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const isLent = type === 'loan_owed_to_me';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingDebt ? 'Edit Debt Record' : 'Record Debt or Loan'}
      maxWidth="sm"
    >
      <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-500 text-xs font-medium">
            {error}
          </div>
        )}

        {/* Direction Selector */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-theme-subtle rounded-xl border border-theme">
          <button
            type="button"
            onClick={() => setType('loan_owed_to_me')}
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
              isLent
                ? 'bg-emerald-500 text-zinc-950 shadow-xs'
                : 'text-theme-muted hover:text-theme-title'
            }`}
          >
            <ArrowDownLeft className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>I Lent Money</span>
          </button>

          <button
            type="button"
            onClick={() => setType('debt_i_owe')}
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
              !isLent
                ? 'bg-rose-500 text-white shadow-xs'
                : 'text-theme-muted hover:text-theme-title'
            }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>I Borrowed Money</span>
          </button>
        </div>

        {/* Direction Description Note */}
        <div className="text-[11px] text-theme-muted px-1 flex items-center gap-1.5">
          <span
            className={`w-2 h-2 rounded-full ${
              isLent ? 'bg-emerald-500' : 'bg-rose-500'
            }`}
          />
          <span>
            {isLent
              ? 'Receivable: Someone owes you money to be collected'
              : 'Payable: You owe someone money that you will repay'}
          </span>
        </div>

        {/* Person / Entity Name */}
        <div>
          <Input
            label={isLent ? 'Borrower Name (Who owes you)' : 'Lender Name (Who you owe)'}
            type="text"
            placeholder={isLent ? 'e.g. Alex Johnson, Sarah' : 'e.g. Bank, Michael, Landlord'}
            value={personName}
            onChange={(e) => setPersonName(e.target.value)}
            required
            autoFocus
          />
        </div>

        {/* Amount */}
        <div>
          <label className="block text-[11px] font-semibold text-theme-muted mb-1 select-none">
            Amount ({getCurrencySymbol(baseCurrency)})
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-theme-muted text-sm select-none">
              {getCurrencySymbol(baseCurrency)}
            </span>
            <input
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              className="w-full h-10 pl-8 pr-3 text-base font-bold tabular-nums bg-theme-subtle border border-theme rounded-xl text-theme-title placeholder:text-theme-faint focus:outline-none focus:border-theme-strong focus:bg-theme-card transition-colors"
            />
          </div>
        </div>

        {/* Due Date & Quick Presets */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="block text-[11px] font-semibold text-theme-muted select-none">
              Due Date (optional)
            </label>
            {dueDate && (
              <button
                type="button"
                onClick={() => setDueDate('')}
                className="text-[10px] text-theme-muted hover:text-theme-title"
              >
                Clear date
              </button>
            )}
          </div>

          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full h-9 px-3 text-xs bg-theme-subtle border border-theme rounded-xl text-theme-title focus:outline-none focus:border-theme-strong focus:bg-theme-card transition-colors"
          />

          {/* Quick presets */}
          <div className="flex items-center gap-1.5 pt-1 overflow-x-auto">
            <span className="text-[10px] text-theme-faint shrink-0">Presets:</span>
            <button
              type="button"
              onClick={() => handleQuickDueDate(7)}
              className="text-[10px] font-semibold px-2 py-0.5 rounded-lg bg-theme-subtle hover:bg-theme-subtle-hover text-theme-muted hover:text-theme-title border border-theme transition-colors shrink-0"
            >
              +7 Days
            </button>
            <button
              type="button"
              onClick={() => handleQuickDueDate(14)}
              className="text-[10px] font-semibold px-2 py-0.5 rounded-lg bg-theme-subtle hover:bg-theme-subtle-hover text-theme-muted hover:text-theme-title border border-theme transition-colors shrink-0"
            >
              +14 Days
            </button>
            <button
              type="button"
              onClick={() => handleQuickDueDate(30)}
              className="text-[10px] font-semibold px-2 py-0.5 rounded-lg bg-theme-subtle hover:bg-theme-subtle-hover text-theme-muted hover:text-theme-title border border-theme transition-colors shrink-0"
            >
              +30 Days
            </button>
            <button
              type="button"
              onClick={() => handleQuickDueDate(90)}
              className="text-[10px] font-semibold px-2 py-0.5 rounded-lg bg-theme-subtle hover:bg-theme-subtle-hover text-theme-muted hover:text-theme-title border border-theme transition-colors shrink-0"
            >
              +3 Months
            </button>
          </div>
        </div>

        {/* Notes */}
        <div>
          <Input
            label="Notes / Description (optional)"
            type="text"
            placeholder="e.g. For dinner bill, concert ticket, loan agreement..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
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
            {editingDebt ? 'Update Record' : 'Save Debt / Loan'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
