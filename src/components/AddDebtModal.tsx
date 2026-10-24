'use client';

import React, { useState, useEffect } from 'react';
import { Check } from 'lucide-react';
import { Debt, DebtType } from '@/types';
import { getCurrencySymbol } from '@/lib/utils';
import { Modal, Button, Input, Tabs } from '@/components/ui';

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
  const [type, setType] = useState<DebtType>('debt_i_owe');
  const [personName, setPersonName] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editingDebt) {
      setType(editingDebt.type);
      setPersonName(editingDebt.person_name);
      setAmount(String(editingDebt.amount));
      setDueDate(editingDebt.due_date || '');
      setNotes(editingDebt.notes || '');
    } else {
      setType('debt_i_owe');
      setPersonName('');
      setAmount('');
      setDueDate('');
      setNotes('');
    }
    setError(null);
  }, [isOpen, editingDebt]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Enter a valid amount');
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

  const debtTabs = [
    { id: 'debt_i_owe' as DebtType, label: 'I Borrowed', activeColor: 'rose' as const },
    { id: 'loan_owed_to_me' as DebtType, label: 'I Lent Out', activeColor: 'emerald' as const },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingDebt ? 'Edit Debt Record' : 'Record Debt or Loan'}
      maxWidth="sm"
    >
      <form onSubmit={handleSubmit} className="p-5 space-y-3.5">
        {error && (
          <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-500 text-xs">
            {error}
          </div>
        )}

        <Tabs
          items={debtTabs}
          activeTab={type}
          onChange={(t) => setType(t)}
        />

        <Input
          label={type === 'debt_i_owe' ? 'Lender Name (Who you owe)' : 'Borrower Name (Who owes you)'}
          type="text"
          placeholder="e.g. Alex Johnson, Sarah"
          value={personName}
          onChange={(e) => setPersonName(e.target.value)}
          required
        />

        <div className="grid grid-cols-2 gap-2">
          <Input
            label={`Amount (${getCurrencySymbol(baseCurrency)})`}
            type="number"
            step="0.01"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            className="text-base font-bold tabular-nums"
          />

          <Input
            label="Due Date (optional)"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>

        <Input
          label="Notes (optional)"
          type="text"
          placeholder="e.g. For dinner, concert ticket..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        <div className="pt-2">
          <Button
            type="submit"
            variant="primary"
            isLoading={loading}
            leftIcon={<Check className="w-4 h-4 stroke-[2.5]" />}
            className="w-full"
            size="md"
          >
            {editingDebt ? 'Update Record' : 'Save Record'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
