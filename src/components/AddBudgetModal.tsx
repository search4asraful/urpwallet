'use client';

import React, { useState } from 'react';
import { Check } from 'lucide-react';
import { Budget, Category, BudgetPeriod } from '@/types';
import { getCurrencySymbol } from '@/lib/utils';
import { Modal, Button, Input, Select } from '@/components/ui';

interface AddBudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  categories: Category[];
  editingBudget?: Budget | null;
  baseCurrency?: string;
}

export const AddBudgetModal: React.FC<AddBudgetModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  categories,
  editingBudget = null,
  baseCurrency = 'USD',
}) => {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [period, setPeriod] = useState<BudgetPeriod>('monthly');
  const [categoryId, setCategoryId] = useState<string>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [prevBudgetKey, setPrevBudgetKey] = useState<string | null>(
    isOpen ? (editingBudget ? `${editingBudget.id}_${editingBudget.amount}` : '__new__') : null
  );

  const currentBudgetKey = isOpen ? (editingBudget ? `${editingBudget.id}_${editingBudget.amount}` : '__new__') : null;
  if (currentBudgetKey !== prevBudgetKey) {
    setPrevBudgetKey(currentBudgetKey);
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const firstDay = `${y}-${m}-01`;
    const lastDay = new Date(y, today.getMonth() + 1, 0).toISOString().split('T')[0];

    if (editingBudget) {
      setName(editingBudget.name);
      setAmount(String(editingBudget.amount));
      setPeriod(editingBudget.period);
      setCategoryId(editingBudget.category_id || '');
      setStartDate(editingBudget.start_date);
      setEndDate(editingBudget.end_date);
    } else {
      setName('');
      setAmount('');
      setPeriod('monthly');
      setCategoryId(categories[0]?.id || '');
      setStartDate(firstDay);
      setEndDate(lastDay);
    }
    setError(null);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Enter a valid budget limit');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = {
        name: name.trim() || 'Budget',
        amount: numAmount,
        period,
        category_id: categoryId || null,
        start_date: startDate,
        end_date: endDate,
      };

      const url = editingBudget ? `/api/budgets/${editingBudget.id}` : '/api/budgets';
      const method = editingBudget ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save budget');
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
      title={editingBudget ? 'Edit Budget' : 'Set Budget Limit'}
      maxWidth="sm"
    >
      <form onSubmit={handleSubmit} className="p-5 space-y-3.5">
        {error && (
          <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-500 text-xs">
            {error}
          </div>
        )}

        <Input
          label="Budget Label"
          type="text"
          placeholder="e.g. Dining Out, Groceries"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <Input
          label={`Limit (${getCurrencySymbol(baseCurrency)})`}
          type="number"
          step="0.01"
          placeholder="400.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
          className="text-base font-bold text-emerald-500 tabular-nums"
        />

        <div className="grid grid-cols-2 gap-2">
          <Select
            label="Period"
            value={period}
            onChange={(e) => setPeriod(e.target.value as BudgetPeriod)}
          >
            <option value="monthly" className="bg-theme-card text-theme-title">Monthly</option>
            <option value="weekly" className="bg-theme-card text-theme-title">Weekly</option>
            <option value="one_time" className="bg-theme-card text-theme-title">One-time</option>
          </Select>

          <Select
            label="Category"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
          >
            <option value="" className="bg-theme-card text-theme-title">All Categories</option>
            {categories.filter((c) => c.type === 'expense').map((cat) => (
              <option key={cat.id} value={cat.id} className="bg-theme-card text-theme-title">
                {cat.name}
              </option>
            ))}
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Input
            label="Start Date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
          />

          <Input
            label="End Date"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            required
          />
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
            {editingBudget ? 'Update Budget' : 'Set Budget'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
