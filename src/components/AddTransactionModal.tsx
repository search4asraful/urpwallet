'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Check, ArrowDownRight, ArrowUpRight, ArrowLeftRight,
  Calendar, Clock, User, FileText, ChevronDown, Search, Tag, X
} from 'lucide-react';
import {
  Transaction, Account, Category, TransactionType, PaymentType
} from '@/types';
import { formatCurrency, getCurrencySymbol } from '@/lib/utils';
import { CategoryIcon } from './CategoryIcon';
import { Modal, Button, Input, Select, Tabs } from '@/components/ui';

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  accounts: Account[];
  categories: Category[];
  initialType?: TransactionType;
  editingTransaction?: Transaction | null;
  baseCurrency?: string;
}

export const AddTransactionModal: React.FC<AddTransactionModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  accounts,
  categories,
  initialType = 'expense',
  editingTransaction,
  baseCurrency = 'USD',
}) => {
  const [type, setType] = useState<TransactionType>(initialType);
  const [amount, setAmount] = useState<string>('');
  const [accountId, setAccountId] = useState<string>('');
  const [toAccountId, setToAccountId] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [date, setDate] = useState<string>('');
  const [time, setTime] = useState<string>('');
  const [payee, setPayee] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [paymentType, setPaymentType] = useState<PaymentType>('cash');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [isCategoryOpen, setIsCategoryOpen] = useState<boolean>(false);
  const [categorySearch, setCategorySearch] = useState<string>('');
  const [recentCatIds, setRecentCatIds] = useState<string[]>([]);
  const [prevIsCatOpen, setPrevIsCatOpen] = useState(false);

  const categoryDropdownRef = useRef<HTMLDivElement>(null);
  const categoryButtonRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const [prevTxKey, setPrevTxKey] = useState<string | null>(
    isOpen ? (editingTransaction ? `${editingTransaction.id}_${editingTransaction.amount}` : `__new__${initialType}`) : null
  );

  const currentTxKey = isOpen
    ? (editingTransaction ? `${editingTransaction.id}_${editingTransaction.amount}` : `__new__${initialType}`)
    : null;

  if (currentTxKey !== prevTxKey) {
    setPrevTxKey(currentTxKey);
    setIsCategoryOpen(false);
    setCategorySearch('');
    if (editingTransaction) {
      setType(editingTransaction.type);
      setAmount(String(editingTransaction.amount));
      setAccountId(editingTransaction.account_id);
      setToAccountId(editingTransaction.to_account_id || '');
      setCategoryId(editingTransaction.category_id || '');
      setDate(editingTransaction.date);
      setTime(editingTransaction.time || '');
      setPayee(editingTransaction.payee || '');
      setNote(editingTransaction.note || '');
      setPaymentType(editingTransaction.payment_type);
    } else {
      setType(initialType);
      setAmount('');
      if (accounts.length > 0) {
        setAccountId(accounts[0].id);
        if (accounts.length > 1) {
          setToAccountId(accounts[1].id);
        }
      }
      const defaultCategory = categories.find((c) => c.type === (initialType === 'income' ? 'income' : 'expense'));
      if (defaultCategory) {
        setCategoryId(defaultCategory.id);
      }
      const now = new Date();
      setDate(now.toISOString().split('T')[0]);
      setTime(now.toTimeString().slice(0, 5));
      setPayee('');
      setNote('');
      setPaymentType('cash');
    }
    setError(null);
  }

  if (!isCategoryOpen && prevIsCatOpen) {
    setPrevIsCatOpen(false);
    setCategorySearch('');
  } else if (isCategoryOpen && !prevIsCatOpen) {
    setPrevIsCatOpen(true);
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      if (typeof window === 'undefined') return;
      try {
        const storageKey = `urpwallet_recent_cats_${type}`;
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          setRecentCatIds(JSON.parse(stored));
        } else {
          setRecentCatIds([]);
        }
      } catch {
        setRecentCatIds([]);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [type]);

  useEffect(() => {
    if (!isCategoryOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        categoryDropdownRef.current &&
        !categoryDropdownRef.current.contains(e.target as Node)
      ) {
        setIsCategoryOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsCategoryOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isCategoryOpen]);

  useEffect(() => {
    if (isCategoryOpen) {
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isCategoryOpen]);

  const filteredCategories = useMemo(() => {
    return categories.filter((c) => c.type === (type === 'income' ? 'income' : 'expense'));
  }, [categories, type]);

  const frequentCategories = useMemo(() => {
    if (recentCatIds.length > 0) {
      const recent = recentCatIds
        .map((id) => filteredCategories.find((c) => c.id === id))
        .filter((c): c is Category => Boolean(c));
      if (recent.length > 0) return recent.slice(0, 4);
    }
    return filteredCategories.slice(0, 4);
  }, [filteredCategories, recentCatIds]);

  const filteredCategoriesList = useMemo(() => {
    if (!categorySearch.trim()) return filteredCategories;
    const q = categorySearch.toLowerCase().trim();
    return filteredCategories.filter((c) => c.name.toLowerCase().includes(q));
  }, [filteredCategories, categorySearch]);

  const selectedCategory = useMemo(() => {
    return categories.find((c) => c.id === categoryId);
  }, [categories, categoryId]);

  const selectedAccount = useMemo(() => {
    return accounts.find((a) => a.id === accountId);
  }, [accounts, accountId]);

  const currentCurrency =
    selectedAccount?.currency ||
    editingTransaction?.account_currency ||
    editingTransaction?.currency ||
    baseCurrency ||
    'USD';

  const currencySymbol = getCurrencySymbol(currentCurrency);

  const handleSelectCategory = (catId: string) => {
    setCategoryId(catId);
    setIsCategoryOpen(false);
    setCategorySearch('');

    if (typeof window !== 'undefined') {
      try {
        const storageKey = `urpwallet_recent_cats_${type}`;
        const stored = localStorage.getItem(storageKey);
        const prevList: string[] = stored ? JSON.parse(stored) : [];
        const updated = [catId, ...prevList.filter((id) => id !== catId)].slice(0, 4);
        localStorage.setItem(storageKey, JSON.stringify(updated));
        setRecentCatIds(updated);
      } catch {
        // ignore storage errors
      }
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCategoriesList.length > 0) {
        handleSelectCategory(filteredCategoriesList[0].id);
      }
    } else if (e.key === 'Escape') {
      setIsCategoryOpen(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid positive amount.');
      return;
    }

    if (!accountId) {
      setError('Please select an account.');
      return;
    }

    if (type === 'transfer' && (!toAccountId || toAccountId === accountId)) {
      setError('Transfer requires a different destination account.');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        account_id: accountId,
        to_account_id: type === 'transfer' ? toAccountId : null,
        category_id: type === 'transfer' ? null : categoryId || null,
        type,
        amount: numAmount,
        currency: currentCurrency,
        date,
        time: time || null,
        payee: type === 'transfer' ? null : payee.trim() || null,
        note: note.trim() || null,
        status: 'cleared',
        payment_type: paymentType,
      };

      const url = editingTransaction
        ? `/api/transactions/${editingTransaction.id}`
        : '/api/transactions';
      const method = editingTransaction ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save transaction');
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const addAmount = (delta: number) => {
    const current = parseFloat(amount) || 0;
    setAmount((current + delta).toFixed(2));
  };

  const typeTabs = [
    {
      id: 'expense' as TransactionType,
      label: 'Expense',
      icon: <ArrowDownRight className="w-3.5 h-3.5" />,
      activeColor: 'rose' as const,
    },
    {
      id: 'income' as TransactionType,
      label: 'Income',
      icon: <ArrowUpRight className="w-3.5 h-3.5" />,
      activeColor: 'emerald' as const,
    },
    {
      id: 'transfer' as TransactionType,
      label: 'Transfer',
      icon: <ArrowLeftRight className="w-3.5 h-3.5" />,
      activeColor: 'sky' as const,
    },
  ];

  const handleTypeChange = (newType: TransactionType) => {
    setType(newType);
    setIsCategoryOpen(false);
    setCategorySearch('');
    if (newType !== 'transfer') {
      const cat = categories.find((c) => c.type === (newType === 'income' ? 'income' : 'expense'));
      if (cat) setCategoryId(cat.id);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingTransaction ? 'Edit Record' : 'Record Transaction'}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        {error && (
          <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-500 text-xs">
            {error}
          </div>
        )}

        {/* Segmented Type Selector */}
        <Tabs
          items={typeTabs}
          activeTab={type}
          onChange={handleTypeChange}
        />

        {/* Amount Box */}
        <div className="bg-theme-subtle border border-theme rounded-2xl p-4 text-center focus-within:border-emerald-500/50 transition-colors">
          <span className="block text-[10px] uppercase font-bold tracking-wider text-theme-muted mb-1 select-none">
            Amount ({currentCurrency})
          </span>
          <div className="flex items-center justify-center gap-1.5">
            <span className={`text-2xl font-bold ${
              type === 'expense' ? 'text-rose-500' : type === 'income' ? 'text-emerald-500' : 'text-sky-500'
            }`}>
              {type === 'expense' ? '-' : type === 'income' ? '+' : ''}{currencySymbol}
            </span>
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              autoFocus
              required
              className="bg-transparent text-3xl font-extrabold text-theme-title text-center w-44 outline-none tabular-nums placeholder:text-theme-faint"
            />
          </div>

          {/* Quick shortcuts */}
          <div className="flex items-center justify-center gap-1.5 mt-2.5 pt-2 border-t border-theme">
            <Button
              size="xs"
              variant="secondary"
              onClick={() => addAmount(10)}
            >
              +{currencySymbol}10
            </Button>
            <Button
              size="xs"
              variant="secondary"
              onClick={() => addAmount(50)}
            >
              +{currencySymbol}50
            </Button>
            <Button
              size="xs"
              variant="secondary"
              onClick={() => addAmount(100)}
            >
              +{currencySymbol}100
            </Button>
          </div>
        </div>

        {/* Account & Category Row */}
        {type === 'transfer' ? (
          <div className="grid grid-cols-2 gap-2">
            <Select
              label="From"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="focus:border-sky-500"
            >
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id} className="bg-theme-card text-theme-title">
                  {acc.name} ({formatCurrency(acc.balance, acc.currency)})
                </option>
              ))}
            </Select>

            <Select
              label="To"
              value={toAccountId}
              onChange={(e) => setToAccountId(e.target.value)}
              className="focus:border-sky-500"
            >
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id} disabled={acc.id === accountId} className="bg-theme-card text-theme-title">
                  {acc.name} ({formatCurrency(acc.balance, acc.currency)})
                </option>
              ))}
            </Select>
          </div>
        ) : (
          <div className="relative" ref={categoryDropdownRef}>
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

              <div>
                <label className="block text-[11px] font-semibold text-theme-muted mb-1 select-none">Category</label>
                <button
                  type="button"
                  ref={categoryButtonRef}
                  onClick={() => setIsCategoryOpen((prev) => !prev)}
                  className={`w-full h-8 flex items-center justify-between bg-theme-input hover:bg-theme-subtle border rounded-xl px-2.5 text-xs text-theme-title transition-all focus:outline-none ${
                    isCategoryOpen
                      ? 'border-emerald-500 ring-1 ring-emerald-500/30'
                      : 'border-theme-input hover:border-theme-strong'
                  }`}
                >
                  {selectedCategory ? (
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className="w-4 h-4 rounded-sm flex items-center justify-center text-white shrink-0 shadow-2xs"
                        style={{ backgroundColor: selectedCategory.color }}
                      >
                        <CategoryIcon name={selectedCategory.icon} className="w-2.5 h-2.5" />
                      </div>
                      <span className="truncate font-medium">{selectedCategory.name}</span>
                    </div>
                  ) : (
                    <span className="text-theme-muted flex items-center gap-1.5">
                      <Tag className="w-3 h-3" /> Select Category
                    </span>
                  )}
                  <ChevronDown className={`w-3.5 h-3.5 text-theme-muted shrink-0 ml-1 transition-transform duration-200 ${isCategoryOpen ? 'rotate-180 text-emerald-500' : ''}`} />
                </button>
              </div>
            </div>

            {/* Smart Category Popover */}
            {isCategoryOpen && (
              <div
                ref={popoverRef}
                className="absolute top-full left-0 right-0 mt-1.5 bg-theme-popover border border-theme-strong rounded-2xl shadow-2xl z-30 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
                style={{ maxHeight: '280px' }}
              >
                {/* Search Header */}
                <div className="p-2 border-b border-theme bg-theme-card">
                  <div className="relative flex items-center">
                    <Search className="w-3.5 h-3.5 text-theme-muted absolute left-2.5 pointer-events-none" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={categorySearch}
                      onChange={(e) => setCategorySearch(e.target.value)}
                      onKeyDown={handleSearchKeyDown}
                      placeholder="Search categories..."
                      className="w-full bg-theme-input border border-theme-input rounded-lg pl-8 pr-7 py-1.5 text-xs text-theme-title placeholder:text-theme-faint focus:outline-none focus:border-emerald-500"
                    />
                    {categorySearch && (
                      <button
                        type="button"
                        onClick={() => setCategorySearch('')}
                        className="absolute right-2 p-0.5 text-theme-muted hover:text-theme-title rounded"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Quick Frequent Categories */}
                {!categorySearch && frequentCategories.length > 0 && (
                  <div className="p-2 border-b border-theme bg-theme-subtle/30">
                    <div className="text-[10px] uppercase font-bold tracking-wider text-theme-muted mb-1.5 px-0.5">
                      Frequent
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {frequentCategories.map((cat) => {
                        const isSelected = categoryId === cat.id;
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => handleSelectCategory(cat.id)}
                            className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-medium transition-all ${
                              isSelected
                                ? 'bg-emerald-500/20 text-emerald-400 font-semibold ring-1 ring-emerald-500/50'
                                : 'bg-theme-card hover:bg-theme-subtle text-theme-title border border-theme'
                            }`}
                          >
                            <div
                              className="w-3.5 h-3.5 rounded-sm flex items-center justify-center text-white shrink-0"
                              style={{ backgroundColor: cat.color }}
                            >
                              <CategoryIcon name={cat.icon} className="w-2.5 h-2.5" />
                            </div>
                            <span className="truncate max-w-[85px]">{cat.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Filtered Categories List */}
                <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
                  {filteredCategoriesList.length === 0 ? (
                    <div className="py-6 text-center text-xs text-theme-muted">
                      No categories found for &quot;{categorySearch}&quot;
                    </div>
                  ) : (
                    filteredCategoriesList.map((cat) => {
                      const isSelected = categoryId === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => handleSelectCategory(cat.id)}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs transition-colors ${
                            isSelected
                              ? 'bg-emerald-500/15 text-emerald-400 font-semibold'
                              : 'text-theme-title hover:bg-theme-subtle'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className="w-5 h-5 rounded-md flex items-center justify-center text-white shrink-0 shadow-2xs"
                              style={{ backgroundColor: cat.color }}
                            >
                              <CategoryIcon name={cat.icon} className="w-3 h-3" />
                            </div>
                            <span className="truncate">{cat.name}</span>
                          </div>
                          {isSelected && <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 stroke-[2.5]" />}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Date and Time */}
        <div className="grid grid-cols-2 gap-2">
          <Input
            label={
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3 text-emerald-500" /> Date
              </span>
            }
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />

          <Input
            label={
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-emerald-500" /> Time
              </span>
            }
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
          />
        </div>

        {/* Payee & Payment Method */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Input
            label={
              <span className="flex items-center gap-1">
                <User className="w-3 h-3 text-emerald-500" /> Payee / Merchant
              </span>
            }
            type="text"
            placeholder="e.g. Starbucks, Amazon"
            value={payee}
            onChange={(e) => setPayee(e.target.value)}
          />

          <Select
            label="Payment Method"
            value={paymentType}
            onChange={(e) => setPaymentType(e.target.value as PaymentType)}
          >
            <option value="cash" className="bg-theme-card text-theme-title">Cash</option>
            <option value="debit_card" className="bg-theme-card text-theme-title">Debit Card</option>
            <option value="credit_card" className="bg-theme-card text-theme-title">Credit Card</option>
            <option value="transfer" className="bg-theme-card text-theme-title">Bank Transfer</option>
            <option value="voucher" className="bg-theme-card text-theme-title">Voucher</option>
            <option value="mobile_payment" className="bg-theme-card text-theme-title">Mobile Payment</option>
          </Select>
        </div>

        {/* Note */}
        <Input
          label={
            <span className="flex items-center gap-1">
              <FileText className="w-3 h-3 text-emerald-500" /> Note (optional)
            </span>
          }
          type="text"
          placeholder="Add details, receipt notes..."
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />

        {/* Submit */}
        <div className="pt-2">
          <Button
            type="submit"
            isLoading={loading}
            variant={type === 'expense' ? 'danger' : type === 'income' ? 'primary' : 'primary'}
            leftIcon={<Check className="w-4 h-4 stroke-[2.5]" />}
            className={`w-full ${type === 'transfer' ? 'bg-sky-500 hover:bg-sky-400 text-white' : ''}`}
            size="md"
          >
            {editingTransaction ? 'Update Entry' : 'Save Transaction'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
