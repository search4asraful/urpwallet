'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  DashboardData, Transaction, Account, Category, Budget,
  PlannedPayment, Debt, TransactionType
} from '@/types';
import { Navigation } from '@/components/Navigation';
import { DashboardView } from '@/components/DashboardView';
import { TransactionsView } from '@/components/TransactionsView';
import { AccountsView } from '@/components/AccountsView';
import { BudgetsView } from '@/components/BudgetsView';
import { PlannedView } from '@/components/PlannedView';
import { DebtsView } from '@/components/DebtsView';
import { ReportsView } from '@/components/ReportsView';
import { SettingsView } from '@/components/SettingsView';
import { AddTransactionModal } from '@/components/AddTransactionModal';
import { TransactionDetailModal } from '@/components/TransactionDetailModal';
import { AddAccountModal } from '@/components/AddAccountModal';
import { TransferModal } from '@/components/TransferModal';
import { AddBudgetModal } from '@/components/AddBudgetModal';
import { AddPlannedModal } from '@/components/AddPlannedModal';
import { AddDebtModal } from '@/components/AddDebtModal';
import { RecordDebtPaymentModal } from '@/components/RecordDebtPaymentModal';
import { ImportModal } from '@/components/ImportModal';
import { GoogleDriveModal } from '@/components/GoogleDriveModal';
import { useAuth } from '@/context/AuthContext';
import { AuthSetupScreen } from '@/components/auth/AuthSetupScreen';
import { AuthLoginScreen } from '@/components/auth/AuthLoginScreen';

export default function WalletApp() {
  const { user, isLoading: authLoading, isSetup } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [loading, setLoading] = useState<boolean>(true);
  const [privacyMode, setPrivacyMode] = useState<boolean>(false);
  const [baseCurrency, setBaseCurrency] = useState<string>('USD');

  // Route protection redirect
  useEffect(() => {
    if (!authLoading) {
      if (!isSetup) {
        router.replace('/setup');
      } else if (!user) {
        router.replace('/login');
      }
    }
  }, [authLoading, isSetup, user, router]);

  // Master Data
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [planned, setPlanned] = useState<PlannedPayment[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);

  // Modals state
  const [addTxOpen, setAddTxOpen] = useState(false);
  const [addTxType, setAddTxType] = useState<TransactionType>('expense');
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  const [addAccountOpen, setAddAccountOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);

  const [transferOpen, setTransferOpen] = useState(false);

  const [addBudgetOpen, setAddBudgetOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);

  const [addPlannedOpen, setAddPlannedOpen] = useState(false);
  const [editingPlanned, setEditingPlanned] = useState<PlannedPayment | null>(null);

  const [addDebtOpen, setAddDebtOpen] = useState(false);
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);
  const [payingDebt, setPayingDebt] = useState<Debt | null>(null);

  const [importOpen, setImportOpen] = useState(false);
  const [gdriveOpen, setGdriveOpen] = useState(false);
  const [isGDriveConnected, setIsGDriveConnected] = useState(false);

  // Fetch all data
  const refreshData = useCallback(async () => {
    if (!user) return;
    try {
      const [dashRes, txRes, accRes, catRes, budRes, planRes, debtRes, setRes] = await Promise.all([
        fetch('/api/dashboard'),
        fetch('/api/transactions?limit=200'),
        fetch('/api/accounts'),
        fetch('/api/categories'),
        fetch('/api/budgets'),
        fetch('/api/planned'),
        fetch('/api/debts'),
        fetch('/api/settings'),
      ]);

      const [dash, txs, accs, cats, buds, plans, dbs, sets] = await Promise.all([
        dashRes.json(),
        txRes.json(),
        accRes.json(),
        catRes.json(),
        budRes.json(),
        planRes.json(),
        debtRes.json(),
        setRes.json(),
      ]);

      setDashboardData(dash);
      setAllTransactions(Array.isArray(txs) ? txs : []);
      setAccounts(Array.isArray(accs) ? accs : []);
      setCategories(Array.isArray(cats) ? cats : []);
      setBudgets(Array.isArray(buds) ? buds : []);
      setPlanned(Array.isArray(plans) ? plans : []);
      setDebts(Array.isArray(dbs) ? dbs : []);

      if (sets?.base_currency) {
        setBaseCurrency(sets.base_currency);
      }
      if (sets?.privacy_mode) {
        setPrivacyMode(sets.privacy_mode === 'true');
      }
      setIsGDriveConnected(Boolean(sets?.gdrive_refresh_token));
    } catch (err) {
      console.error('Failed to load urpwallet data:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      const timer = setTimeout(() => {
        refreshData();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [refreshData, user]);

  // Handle Google Drive OAuth callback & background scheduled backup sync
  useEffect(() => {
    let openTimer: NodeJS.Timeout | undefined;
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (url.searchParams.has('gdrive')) {
        openTimer = setTimeout(() => {
          setGdriveOpen(true);
        }, 0);
        url.searchParams.delete('gdrive');
        window.history.replaceState({}, '', url.toString());
      } else if (url.searchParams.has('gdrive_error')) {
        openTimer = setTimeout(() => {
          setGdriveOpen(true);
        }, 0);
        url.searchParams.delete('gdrive_error');
        window.history.replaceState({}, '', url.toString());
      }
    }

    const checkAutoSync = async () => {
      try {
        await fetch('/api/gdrive/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
      } catch {
        // Silent failure in background runner
      }
    };

    const initialTimer = setTimeout(checkAutoSync, 4000);
    const interval = setInterval(checkAutoSync, 5 * 60 * 1000);

    return () => {
      if (openTimer) clearTimeout(openTimer);
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, []);

  // Actions
  const handleTogglePrivacy = async () => {
    const nextVal = !privacyMode;
    setPrivacyMode(nextVal);
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ privacy_mode: String(nextVal) }),
    });
  };

  const handleUpdateCurrency = async (curr: string) => {
    setBaseCurrency(curr);
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ base_currency: curr }),
    });
    refreshData();
  };

  const handleDeleteTransaction = async (id: string) => {
    await fetch(`/api/transactions/${id}`, { method: 'DELETE' });
    refreshData();
  };

  const handleBulkDeleteTransactions = async (ids: string[]) => {
    try {
      const res = await fetch('/api/transactions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      if (res.ok) {
        await refreshData();
      }
    } catch (err) {
      console.error('Failed to bulk delete transactions:', err);
    }
  };

  const handleDeleteAccount = async (id: string) => {
    await fetch(`/api/accounts/${id}`, { method: 'DELETE' });
    refreshData();
  };

  const handleDeleteBudget = async (id: string) => {
    await fetch(`/api/budgets/${id}`, { method: 'DELETE' });
    refreshData();
  };

  const handleDeletePlanned = async (id: string) => {
    await fetch(`/api/planned/${id}`, { method: 'DELETE' });
    refreshData();
  };

  const handleExecutePlanned = async (id: string) => {
    await fetch(`/api/planned/${id}/execute`, { method: 'POST' });
    refreshData();
  };

  const handleDeleteDebt = async (id: string) => {
    await fetch(`/api/debts/${id}`, { method: 'DELETE' });
    refreshData();
  };

  const handleAddCategory = async (cat: Partial<Category>) => {
    await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cat),
    });
    refreshData();
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      const res = await fetch(`/api/categories/${id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error || 'Failed to delete category');
        return;
      }
      refreshData();
    } catch (err) {
      console.error('Failed to delete category:', err);
      alert('An error occurred while deleting the category.');
    }
  };

  const handleSeedData = async () => {
    await fetch('/api/seed', { method: 'POST' });
    await refreshData();
  };

  const openAddTx = (type: TransactionType = 'expense') => {
    setEditingTx(null);
    setAddTxType(type);
    setAddTxOpen(true);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-theme-app flex flex-col items-center justify-center text-theme-muted">
        <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 mb-3 animate-pulse">
          <span className="font-bold text-base">W</span>
        </div>
        <p className="text-xs font-medium text-theme-muted">Verifying secure session...</p>
      </div>
    );
  }

  if (!isSetup) {
    return <AuthSetupScreen />;
  }

  if (!user) {
    return <AuthLoginScreen />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-theme-app flex flex-col items-center justify-center text-theme-muted">
        <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 mb-3 animate-pulse">
          <span className="font-bold text-sm">W</span>
        </div>
        <p className="text-xs font-medium text-theme-muted">Loading ledger...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-theme-app text-theme-main flex flex-col selection:bg-emerald-500 selection:text-zinc-950">
      {/* Navigation Layout (renders Sidebar, Top Header, and wraps children with md:pl-64) */}
      <Navigation
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        privacyMode={privacyMode}
        onTogglePrivacy={handleTogglePrivacy}
        onOpenAddModal={openAddTx}
        onOpenGDrive={() => setGdriveOpen(true)}
        isGDriveConnected={isGDriveConnected}
      >
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="max-w-6xl mx-auto w-full">
            {activeTab === 'dashboard' && dashboardData && (
              <DashboardView
                data={dashboardData}
                privacyMode={privacyMode}
                onOpenAddModal={openAddTx}
                onSelectTab={setActiveTab}
                onSelectTransaction={(tx) => setSelectedTx(tx)}
                onExecutePlanned={handleExecutePlanned}
              />
            )}

            {activeTab === 'transactions' && (
              <TransactionsView
                transactions={allTransactions}
                accounts={accounts}
                categories={categories}
                privacyMode={privacyMode}
                baseCurrency={baseCurrency}
                onOpenAddModal={openAddTx}
                onOpenImport={() => setImportOpen(true)}
                onSelectTransaction={(tx) => setSelectedTx(tx)}
                onDeleteTransaction={handleDeleteTransaction}
                onBulkDeleteTransactions={handleBulkDeleteTransactions}
              />
            )}

            {activeTab === 'accounts' && (
              <AccountsView
                accounts={accounts}
                privacyMode={privacyMode}
                baseCurrency={baseCurrency}
                onOpenAddAccount={() => {
                  setEditingAccount(null);
                  setAddAccountOpen(true);
                }}
                onEditAccount={(acc) => {
                  setEditingAccount(acc);
                  setAddAccountOpen(true);
                }}
                onDeleteAccount={handleDeleteAccount}
                onOpenTransfer={() => setTransferOpen(true)}
              />
            )}

            {activeTab === 'budgets' && (
              <BudgetsView
                budgets={budgets}
                privacyMode={privacyMode}
                baseCurrency={baseCurrency}
                onOpenAddBudget={() => {
                  setEditingBudget(null);
                  setAddBudgetOpen(true);
                }}
                onEditBudget={(b) => {
                  setEditingBudget(b);
                  setAddBudgetOpen(true);
                }}
                onDeleteBudget={handleDeleteBudget}
              />
            )}

            {activeTab === 'planned' && (
              <PlannedView
                planned={planned}
                privacyMode={privacyMode}
                baseCurrency={baseCurrency}
                onOpenAddPlanned={() => {
                  setEditingPlanned(null);
                  setAddPlannedOpen(true);
                }}
                onEditPlanned={(p) => {
                  setEditingPlanned(p);
                  setAddPlannedOpen(true);
                }}
                onDeletePlanned={handleDeletePlanned}
                onExecutePlanned={handleExecutePlanned}
              />
            )}

            {activeTab === 'debts' && (
              <DebtsView
                debts={debts}
                privacyMode={privacyMode}
                baseCurrency={baseCurrency}
                onOpenAddDebt={() => {
                  setEditingDebt(null);
                  setAddDebtOpen(true);
                }}
                onEditDebt={(d) => {
                  setEditingDebt(d);
                  setAddDebtOpen(true);
                }}
                onDeleteDebt={handleDeleteDebt}
                onRecordPayment={(d) => setPayingDebt(d)}
              />
            )}

            {activeTab === 'reports' && dashboardData && (
              <ReportsView
                data={dashboardData}
                privacyMode={privacyMode}
                baseCurrency={baseCurrency}
              />
            )}

            {activeTab === 'settings' && (
              <SettingsView
                baseCurrency={baseCurrency}
                privacyMode={privacyMode}
                categories={categories}
                transactions={allTransactions}
                onUpdateCurrency={handleUpdateCurrency}
                onTogglePrivacy={handleTogglePrivacy}
                onSeedData={handleSeedData}
                onAddCategory={handleAddCategory}
                onDeleteCategory={handleDeleteCategory}
                onOpenImport={() => setImportOpen(true)}
                onOpenGDrive={() => setGdriveOpen(true)}
              />
            )}
          </div>
        </main>
      </Navigation>

      {/* MODALS */}
      <AddTransactionModal
        isOpen={addTxOpen}
        onClose={() => {
          setAddTxOpen(false);
          setEditingTx(null);
        }}
        onSuccess={refreshData}
        accounts={accounts}
        categories={categories}
        initialType={addTxType}
        editingTransaction={editingTx}
        baseCurrency={baseCurrency}
      />

      <TransactionDetailModal
        transaction={selectedTx}
        isOpen={!!selectedTx}
        privacyMode={privacyMode}
        baseCurrency={baseCurrency}
        onClose={() => setSelectedTx(null)}
        onEdit={(tx) => {
          setSelectedTx(null);
          setEditingTx(tx);
          setAddTxOpen(true);
        }}
        onDelete={handleDeleteTransaction}
      />

      <AddAccountModal
        isOpen={addAccountOpen}
        onClose={() => {
          setAddAccountOpen(false);
          setEditingAccount(null);
        }}
        onSuccess={refreshData}
        editingAccount={editingAccount}
        baseCurrency={baseCurrency}
      />

      <TransferModal
        isOpen={transferOpen}
        onClose={() => setTransferOpen(false)}
        onSuccess={refreshData}
        accounts={accounts}
        baseCurrency={baseCurrency}
      />

      <AddBudgetModal
        isOpen={addBudgetOpen}
        onClose={() => {
          setAddBudgetOpen(false);
          setEditingBudget(null);
        }}
        onSuccess={refreshData}
        categories={categories}
        editingBudget={editingBudget}
        baseCurrency={baseCurrency}
      />

      <AddPlannedModal
        isOpen={addPlannedOpen}
        onClose={() => {
          setAddPlannedOpen(false);
          setEditingPlanned(null);
        }}
        onSuccess={refreshData}
        accounts={accounts}
        categories={categories}
        editingPlanned={editingPlanned}
        baseCurrency={baseCurrency}
      />

      <AddDebtModal
        isOpen={addDebtOpen}
        onClose={() => {
          setAddDebtOpen(false);
          setEditingDebt(null);
        }}
        onSuccess={refreshData}
        editingDebt={editingDebt}
        baseCurrency={baseCurrency}
      />

      <RecordDebtPaymentModal
        isOpen={!!payingDebt}
        onClose={() => setPayingDebt(null)}
        onSuccess={refreshData}
        debt={payingDebt}
        accounts={accounts}
        baseCurrency={baseCurrency}
      />

      <ImportModal
        isOpen={importOpen}
        onClose={() => setImportOpen(false)}
        onSuccess={refreshData}
        accounts={accounts}
      />

      <GoogleDriveModal
        isOpen={gdriveOpen}
        onClose={() => setGdriveOpen(false)}
        onDataRestored={refreshData}
      />
    </div>
  );
}
