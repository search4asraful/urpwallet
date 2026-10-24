'use client';

import React, { useState, useEffect } from 'react';
import { Check } from 'lucide-react';
import { PlannedPayment, Account, Category, PlannedFrequency } from '@/types';
import { formatCurrency, getCurrencySymbol } from '@/lib/utils';
import { Modal, Button, Input, Select } from '@/components/ui';

interface AddPlannedModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  accounts: Account[];
  categories: Category[];
  editingPlanned?: PlannedPayment | null;
  baseCurrency?: string;
}

export const AddPlannedModal: React.FC<AddPlannedModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  accounts,
  categories,
  editingPlanned = null,
  baseCurrency = 'USD',
}) => {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [accountId, setAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [payee, setPayee] = useState('');
  const [frequency, setFrequency] = useState<PlannedFrequency>('monthly');
  const [nextDate, setNextDate] = useState('');
  const [autoRecord, setAutoRecord] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    if (editingPlanned) {
      setName(editingPlanned.name);
      setAmount(String(editingPlanned.amount));
      setType(editingPlanned.type);
      setAccountId(editingPlanned.account_id);
      setCategoryId(editingPlanned.category_id || '');
      setPayee(editingPlanned.payee || '');
      setFrequency(editingPlanned.frequency);
      setNextDate(editingPlanned.next_date);
      setAutoRecord(editingPlanned.auto_record === 1);
    } else {
      setName('');
      setAmount('');
      setType('expense');
      setAccountId(accounts[0]?.id || '');
      setCategoryId(categories[0]?.id || '');
      setPayee('');
      setFrequency('monthly');
      setNextDate(today);
      setAutoRecord(false);
    }
    setError(null);
  }, [isOpen, editingPlanned, accounts, categories]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Enter a valid amount');
      return;
    }
    if (!accountId) {
      setError('Select an account');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = {
        name: name.trim() || 'Planned Bill',
        amount: numAmount,
        type,
        account_id: accountId,
        category_id: categoryId || null,
        payee: payee.trim() || null,
        frequency,
        next_date: nextDate,
        auto_record: autoRecord ? 1 : 0,
      };

      const url = editingPlanned ? `/api/planned/${editingPlanned.id}` : '/api/planned';
      const method = editingPlanned ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save scheduled payment');
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
      title={editingPlanned ? 'Edit Bill' : 'Schedule Recurring Bill'}
      maxWidth="sm"
    >
      <form onSubmit={handleSubmit} className="p-5 space-y-3.5">
        {error && (
          <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-500 text-xs">
            {error}
          </div>
        )}

        <Input
          label="Bill Name"
          type="text"
          placeholder="e.g. Rent, Netflix, Internet"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <div className="grid grid-cols-2 gap-2">
          <Input
            label={`Amount (${getCurrencySymbol(accounts.find((a) => a.id === accountId)?.currency || baseCurrency)})`}
            type="number"
            step="0.01"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            className="text-base font-bold tabular-nums"
          />

          <Select
            label="Type"
            value={type}
            onChange={(e) => setType(e.target.value as 'expense' | 'income')}
          >
            <option value="expense" className="bg-theme-card text-theme-title">Expense</option>
            <option value="income" className="bg-theme-card text-theme-title">Income</option>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Select
            label="Account"
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
          >
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id} className="bg-theme-card text-theme-title">
                {acc.name} ({formatCurrency(acc.balance, acc.currency)})
              </option>
            ))}
          </Select>

          <Select
            label="Category"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
          >
            {categories.filter((c) => c.type === type).map((cat) => (
              <option key={cat.id} value={cat.id} className="bg-theme-card text-theme-title">
                {cat.name}
              </option>
            ))}
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Select
            label="Frequency"
            value={frequency}
            onChange={(e) => setFrequency(e.target.value as PlannedFrequency)}
          >
            <option value="monthly" className="bg-theme-card text-theme-title">Monthly</option>
            <option value="weekly" className="bg-theme-card text-theme-title">Weekly</option>
            <option value="daily" className="bg-theme-card text-theme-title">Daily</option>
            <option value="yearly" className="bg-theme-card text-theme-title">Yearly</option>
          </Select>

          <Input
            label="Due Date"
            type="date"
            value={nextDate}
            onChange={(e) => setNextDate(e.target.value)}
            required
          />
        </div>

        <Input
          label="Payee / Biller"
          type="text"
          placeholder="e.g. Utility Co, Landlord"
          value={payee}
          onChange={(e) => setPayee(e.target.value)}
        />

        <div className="flex items-center gap-2 pt-0.5">
          <input
            type="checkbox"
            id="autoRecord"
            checked={autoRecord}
            onChange={(e) => setAutoRecord(e.target.checked)}
            className="w-3.5 h-3.5 rounded text-emerald-500 bg-theme-input border-theme-input focus:ring-0 cursor-pointer"
          />
          <label htmlFor="autoRecord" className="text-[11px] text-theme-muted select-none cursor-pointer">
            Auto-record without manual confirmation
          </label>
        </div>

        <div className="pt-2">
          <Button
            type="submit"
            variant="primary"
            isLoading={loading}
            leftIcon={<Check className="w-4 h-4 stroke-[2.5]" />}
            className="w-full"
            size="md"
          >
            {editingPlanned ? 'Update Bill' : 'Schedule Bill'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
