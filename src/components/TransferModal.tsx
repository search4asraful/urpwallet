'use client';

import React, { useState } from 'react';
import { ArrowRight, Check } from 'lucide-react';
import { Account } from '@/types';
import { formatCurrency, getCurrencySymbol } from '@/lib/utils';
import { Modal, Button, Input, Select } from '@/components/ui';

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  accounts: Account[];
  baseCurrency?: string;
}

export const TransferModal: React.FC<TransferModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  accounts,
  baseCurrency = 'USD',
}) => {
  const [fromAccountId, setFromAccountId] = useState(accounts[0]?.id || '');
  const [toAccountId, setToAccountId] = useState(accounts[1]?.id || '');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fromAccount = accounts.find((a) => a.id === fromAccountId);
  const currSymbol = getCurrencySymbol(fromAccount?.currency || baseCurrency);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Enter a valid amount');
      return;
    }
    if (fromAccountId === toAccountId) {
      setError('Source and destination accounts must be different');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'transfer',
          amount: numAmount,
          currency: fromAccount?.currency || baseCurrency || 'USD',
          account_id: fromAccountId,
          to_account_id: toAccountId,
          date,
          note: note.trim() || 'Account transfer',
          payment_type: 'transfer',
          status: 'cleared',
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Transfer failed');
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
      title="Transfer Funds"
      maxWidth="sm"
    >
      <form onSubmit={handleSubmit} className="p-5 space-y-3.5">
        {error && (
          <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-500 text-xs">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <Select
            label="From Account"
            value={fromAccountId}
            onChange={(e) => setFromAccountId(e.target.value)}
          >
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id} className="bg-theme-card text-theme-title">
                {acc.name} ({formatCurrency(acc.balance, acc.currency)})
              </option>
            ))}
          </Select>

          <div className="flex justify-center -my-0.5 text-theme-faint">
            <ArrowRight className="w-3.5 h-3.5 rotate-90" />
          </div>

          <Select
            label="To Account"
            value={toAccountId}
            onChange={(e) => setToAccountId(e.target.value)}
          >
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id} disabled={acc.id === fromAccountId} className="bg-theme-card text-theme-title">
                {acc.name} ({formatCurrency(acc.balance, acc.currency)})
              </option>
            ))}
          </Select>
        </div>

        <Input
          label={`Amount (${currSymbol})`}
          type="number"
          step="0.01"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
          className="text-base font-bold text-sky-500 tabular-nums focus:border-sky-500"
        />

        <Input
          label="Date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
        />

        <Input
          label="Note (optional)"
          type="text"
          placeholder="e.g. Monthly savings, loan return"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />

        <div className="pt-2">
          <Button
            type="submit"
            isLoading={loading}
            leftIcon={<Check className="w-4 h-4 stroke-[2.5]" />}
            className="w-full bg-sky-500 hover:bg-sky-400 text-white font-bold"
            size="md"
          >
            Complete Transfer
          </Button>
        </div>
      </form>
    </Modal>
  );
};
