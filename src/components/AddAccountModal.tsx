'use client';

import React, { useState, useEffect } from 'react';
import { Check } from 'lucide-react';
import { Account, AccountType } from '@/types';
import { getCurrencySymbol } from '@/lib/utils';
import { CategoryIcon } from './CategoryIcon';
import { Modal, Button, Input, Select } from '@/components/ui';

interface AddAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingAccount?: Account | null;
  baseCurrency?: string;
}

const ACCOUNT_TYPES: { type: AccountType; label: string; defaultIcon: string }[] = [
  { type: 'bank', label: 'Bank Account', defaultIcon: 'CreditCard' },
  { type: 'cash', label: 'Cash / Wallet', defaultIcon: 'Wallet' },
  { type: 'savings', label: 'Savings & Goals', defaultIcon: 'PiggyBank' },
  { type: 'credit_card', label: 'Credit Card', defaultIcon: 'CreditCard' },
  { type: 'investment', label: 'Investments', defaultIcon: 'TrendingUp' },
  { type: 'loan', label: 'Loan / Debt', defaultIcon: 'Landmark' },
];

const PRESET_COLORS = [
  '#3B82F6', '#10B981', '#06B6D4', '#F59E0B', '#8B5CF6',
  '#EC4899', '#EF4444', '#14B8A6', '#6366F1', '#64748B'
];

const PRESET_ICONS = [
  'CreditCard', 'Wallet', 'PiggyBank', 'Landmark', 'TrendingUp',
  'Building2', 'Coins', 'CircleDollarSign', 'Briefcase', 'Vault'
];

export const AddAccountModal: React.FC<AddAccountModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  editingAccount = null,
  baseCurrency = 'USD',
}) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('bank');
  const [balance, setBalance] = useState('');
  const [currency, setCurrency] = useState(baseCurrency || 'USD');
  const [color, setColor] = useState('#3B82F6');
  const [icon, setIcon] = useState('CreditCard');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editingAccount) {
      setName(editingAccount.name);
      setType(editingAccount.type);
      setBalance(String(editingAccount.balance));
      setCurrency(editingAccount.currency);
      setColor(editingAccount.color);
      setIcon(editingAccount.icon);
    } else {
      setName('');
      setType('bank');
      setBalance('0.00');
      setCurrency(baseCurrency || 'USD');
      setColor('#3B82F6');
      setIcon('CreditCard');
    }
    setError(null);
  }, [isOpen, editingAccount, baseCurrency]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Account name is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = {
        name: name.trim(),
        type,
        currency,
        balance: parseFloat(balance) || 0,
        color,
        icon,
      };

      const url = editingAccount ? `/api/accounts/${editingAccount.id}` : '/api/accounts';
      const method = editingAccount ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save account');
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
      title={editingAccount ? 'Edit Account' : 'New Account'}
      maxWidth="sm"
    >
      <form onSubmit={handleSubmit} className="p-5 space-y-3.5">
        {error && (
          <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-500 text-xs">
            {error}
          </div>
        )}

        <Input
          label="Account Name"
          type="text"
          placeholder="e.g. Chase Checking, Daily Cash"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <div className="grid grid-cols-2 gap-2">
          <Select
            label="Type"
            value={type}
            onChange={(e) => {
              const t = e.target.value as AccountType;
              setType(t);
              const def = ACCOUNT_TYPES.find((item) => item.type === t);
              if (def) setIcon(def.defaultIcon);
            }}
          >
            {ACCOUNT_TYPES.map((t) => (
              <option key={t.type} value={t.type} className="bg-theme-card text-theme-title">
                {t.label}
              </option>
            ))}
          </Select>

          <Select
            label="Currency"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
          >
            <option value="USD" className="bg-theme-card text-theme-title">USD ($)</option>
            <option value="EUR" className="bg-theme-card text-theme-title">EUR (€)</option>
            <option value="GBP" className="bg-theme-card text-theme-title">GBP (£)</option>
            <option value="BDT" className="bg-theme-card text-theme-title">BDT (৳)</option>
            <option value="INR" className="bg-theme-card text-theme-title">INR (₹)</option>
            <option value="CAD" className="bg-theme-card text-theme-title">CAD ($)</option>
            <option value="AUD" className="bg-theme-card text-theme-title">AUD ($)</option>
            <option value="JPY" className="bg-theme-card text-theme-title">JPY (¥)</option>
          </Select>
        </div>

        <Input
          label={`${editingAccount ? 'Balance' : 'Initial Balance'} (${getCurrencySymbol(currency)})`}
          type="number"
          step="0.01"
          placeholder="0.00"
          value={balance}
          onChange={(e) => setBalance(e.target.value)}
          className="text-sm font-bold tabular-nums"
        />

        {/* Color & Icon */}
        <div>
          <label className="block text-[11px] font-semibold text-theme-muted mb-1.5 select-none">Color</label>
          <div className="flex items-center gap-1.5 flex-wrap">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`w-5 h-5 rounded-full transition-transform ${
                  color === c ? 'scale-125 ring-2 ring-emerald-500' : 'opacity-60 hover:opacity-100'
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-theme-muted mb-1.5 select-none">Icon</label>
          <div className="flex items-center gap-1.5 flex-wrap">
            {PRESET_ICONS.map((ic) => (
              <button
                key={ic}
                type="button"
                onClick={() => setIcon(ic)}
                className={`p-1.5 rounded-lg transition-all ${
                  icon === ic
                    ? 'bg-emerald-500/20 text-emerald-500 ring-1 ring-emerald-500'
                    : 'bg-theme-subtle text-theme-muted hover:text-theme-title'
                }`}
              >
                <CategoryIcon name={ic} className="w-4 h-4" />
              </button>
            ))}
          </div>
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
            {editingAccount ? 'Update Account' : 'Create Account'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
