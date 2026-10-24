export type AccountType = 'cash' | 'bank' | 'credit_card' | 'savings' | 'investment' | 'loan';
export type TransactionType = 'expense' | 'income' | 'transfer';
export type PaymentType = 'cash' | 'debit_card' | 'credit_card' | 'transfer' | 'voucher' | 'mobile_payment';
export type TransactionStatus = 'cleared' | 'pending';
export type BudgetPeriod = 'monthly' | 'weekly' | 'one_time';
export type PlannedFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';
export type DebtType = 'debt_i_owe' | 'loan_owed_to_me';
export type DebtStatus = 'active' | 'settled';
export type ThemeMode = 'system' | 'light' | 'dark' | 'midnight' | 'emerald';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  currency: string;
  balance: number;
  color: string;
  icon: string;
  is_archived: number; // 0 or 1
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  type: 'expense' | 'income';
  icon: string;
  color: string;
  parent_id?: string | null;
  created_at: string;
}

export interface Transaction {
  id: string;
  account_id: string;
  to_account_id?: string | null;
  category_id?: string | null;
  type: TransactionType;
  amount: number;
  currency: string;
  date: string; // YYYY-MM-DD
  time?: string | null; // HH:mm
  payee?: string | null;
  note?: string | null;
  status: TransactionStatus;
  payment_type: PaymentType;
  created_at: string;

  // Joined fields for display
  category_name?: string;
  category_icon?: string;
  category_color?: string;
  account_name?: string;
  account_color?: string;
  account_icon?: string;
  account_currency?: string;
  to_account_name?: string;
  to_account_currency?: string;
}

export interface Budget {
  id: string;
  name: string;
  amount: number;
  period: BudgetPeriod;
  category_id?: string | null;
  start_date: string;
  end_date: string;
  created_at: string;

  // Computed fields
  spent?: number;
  category_name?: string;
  category_color?: string;
  category_icon?: string;
}

export interface PlannedPayment {
  id: string;
  name: string;
  amount: number;
  type: 'expense' | 'income';
  account_id: string;
  category_id?: string | null;
  payee?: string | null;
  frequency: PlannedFrequency;
  next_date: string; // YYYY-MM-DD
  auto_record: number; // 0 or 1
  is_active: number; // 0 or 1
  created_at: string;

  // Joined fields
  account_name?: string;
  category_name?: string;
  category_color?: string;
  category_icon?: string;
}

export interface Debt {
  id: string;
  type: DebtType;
  person_name: string;
  amount: number;
  settled_amount: number;
  due_date?: string | null;
  notes?: string | null;
  status: DebtStatus;
  created_at: string;
}

export interface UserSettings {
  base_currency: string;
  theme: ThemeMode;
  privacy_mode: boolean;
  date_format: string;
}

export interface CategoryBreakdown {
  category_id: string;
  name: string;
  color: string;
  icon: string;
  total: number;
  percentage: number;
}

export interface CashFlowTrendItem {
  period: string; // e.g. "Week 1", "Oct", or Date
  income: number;
  expense: number;
}

export interface DashboardData {
  netWorth: number;
  monthlyIncome: number;
  monthlyExpense: number;
  balanceChange: number;
  baseCurrency: string;
  accounts: Account[];
  recentTransactions: Transaction[];
  activeBudgets: Budget[];
  upcomingPlanned: PlannedPayment[];
  categoryBreakdown: CategoryBreakdown[];
  cashFlowTrend: CashFlowTrendItem[];
}
