import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DB_DIR, 'wallet.db');

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

// Global database instance for Next.js hot reload
declare global {
  // eslint-disable-next-line no-var
  var __db: Database.Database | undefined;
}

export function getDb(): Database.Database {
  if (!global.__db) {
    const db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initTables(db);
    global.__db = db;
  }
  return global.__db;
}

function initTables(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL, -- 'cash' | 'bank' | 'credit_card' | 'savings' | 'investment' | 'loan'
      currency TEXT NOT NULL DEFAULT 'USD',
      balance REAL NOT NULL DEFAULT 0.0,
      color TEXT NOT NULL DEFAULT '#10B981',
      icon TEXT NOT NULL DEFAULT 'Wallet',
      is_archived INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL, -- 'expense' | 'income'
      icon TEXT NOT NULL DEFAULT 'CircleDollarSign',
      color TEXT NOT NULL DEFAULT '#64748B',
      parent_id TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      account_id TEXT NOT NULL,
      to_account_id TEXT,
      category_id TEXT,
      type TEXT NOT NULL, -- 'expense' | 'income' | 'transfer'
      amount REAL NOT NULL,
      currency TEXT NOT NULL DEFAULT 'USD',
      date TEXT NOT NULL, -- YYYY-MM-DD
      time TEXT,          -- HH:mm
      payee TEXT,
      note TEXT,
      status TEXT NOT NULL DEFAULT 'cleared', -- 'cleared' | 'pending'
      payment_type TEXT NOT NULL DEFAULT 'cash', -- 'cash' | 'debit_card' | 'credit_card' | 'transfer' | 'voucher' | 'mobile_payment'
      created_at TEXT NOT NULL,
      FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
      FOREIGN KEY (to_account_id) REFERENCES accounts(id) ON DELETE SET NULL,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS budgets (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      amount REAL NOT NULL,
      period TEXT NOT NULL DEFAULT 'monthly', -- 'monthly' | 'weekly' | 'one_time'
      category_id TEXT,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS planned_payments (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      amount REAL NOT NULL,
      type TEXT NOT NULL DEFAULT 'expense', -- 'expense' | 'income'
      account_id TEXT NOT NULL,
      category_id TEXT,
      payee TEXT,
      frequency TEXT NOT NULL DEFAULT 'monthly', -- 'daily' | 'weekly' | 'monthly' | 'yearly'
      next_date TEXT NOT NULL,
      auto_record INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS debts (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL, -- 'debt_i_owe' | 'loan_owed_to_me'
      person_name TEXT NOT NULL,
      amount REAL NOT NULL,
      settled_amount REAL NOT NULL DEFAULT 0.0,
      due_date TEXT,
      notes TEXT,
      status TEXT NOT NULL DEFAULT 'active', -- 'active' | 'settled'
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  // Check if categories are empty, if so, seed
  const count = db.prepare('SELECT count(*) as cnt FROM categories').get() as { cnt: number };
  if (count.cnt === 0) {
    seedDatabase(db);
  }
}

export function seedDatabase(db: Database.Database = getDb()) {
  const now = new Date().toISOString();
  const todayStr = new Date().toISOString().split('T')[0];
  const [year, month] = todayStr.split('-');

  let existingBaseCurrency = 'USD';
  let existingTheme = 'dark';
  let existingPrivacy = 'false';
  try {
    const curRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('base_currency') as { value: string } | undefined;
    if (curRow?.value) existingBaseCurrency = curRow.value;
    const thRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('theme') as { value: string } | undefined;
    if (thRow?.value) existingTheme = thRow.value;
    const prRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('privacy_mode') as { value: string } | undefined;
    if (prRow?.value) existingPrivacy = prRow.value;
  } catch {
    // ignore if tables not created yet
  }

  // Clear existing data cleanly
  db.exec(`
    DELETE FROM transactions;
    DELETE FROM budgets;
    DELETE FROM planned_payments;
    DELETE FROM debts;
    DELETE FROM accounts;
    DELETE FROM categories;
    DELETE FROM settings;
  `);

  // Default Settings
  const insertSetting = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)');
  insertSetting.run('base_currency', existingBaseCurrency);
  insertSetting.run('theme', existingTheme);
  insertSetting.run('privacy_mode', existingPrivacy);
  insertSetting.run('date_format', 'YYYY-MM-DD');

  // Categories
  const categories = [
    // Expenses
    { id: 'cat_groceries', name: 'Groceries', type: 'expense', icon: 'ShoppingBag', color: '#10B981' },
    { id: 'cat_food_drinks', name: 'Food & Drinks', type: 'expense', icon: 'Utensils', color: '#F59E0B' },
    { id: 'cat_shopping', name: 'Shopping', type: 'expense', icon: 'Shirt', color: '#8B5CF6' },
    { id: 'cat_housing', name: 'Housing & Rent', type: 'expense', icon: 'Home', color: '#3B82F6' },
    { id: 'cat_transport', name: 'Transportation', type: 'expense', icon: 'Car', color: '#06B6D4' },
    { id: 'cat_vehicle', name: 'Vehicle & Fuel', type: 'expense', icon: 'Fuel', color: '#EC4899' },
    { id: 'cat_entertainment', name: 'Entertainment', type: 'expense', icon: 'Film', color: '#F43F5E' },
    { id: 'cat_communication', name: 'Internet & Phone', type: 'expense', icon: 'Wifi', color: '#6366F1' },
    { id: 'cat_fitness', name: 'Health & Fitness', type: 'expense', icon: 'Activity', color: '#14B8A6' },
    { id: 'cat_financial', name: 'Financial Expenses', type: 'expense', icon: 'Landmark', color: '#64748B' },
    // Income
    { id: 'cat_salary', name: 'Salary', type: 'income', icon: 'Briefcase', color: '#10B981' },
    { id: 'cat_freelance', name: 'Freelance & Side Gig', type: 'income', icon: 'Laptop', color: '#3B82F6' },
    { id: 'cat_investments', name: 'Investments & Dividends', type: 'income', icon: 'TrendingUp', color: '#8B5CF6' },
    { id: 'cat_gifts', name: 'Gifts & Bonuses', type: 'income', icon: 'Gift', color: '#EC4899' },
  ];

  const insertCategory = db.prepare(`
    INSERT INTO categories (id, name, type, icon, color, created_at)
    VALUES (@id, @name, @type, @icon, @color, '${now}')
  `);
  for (const cat of categories) {
    insertCategory.run(cat);
  }

  // Accounts
  const accounts = [
    { id: 'acc_checking', name: 'Main Checking (Chase)', type: 'bank', currency: existingBaseCurrency, balance: 5240.50, color: '#3B82F6', icon: 'CreditCard' },
    { id: 'acc_cash', name: 'Cash Wallet', type: 'cash', currency: existingBaseCurrency, balance: 260.00, color: '#10B981', icon: 'Wallet' },
    { id: 'acc_savings', name: 'Emergency Fund', type: 'savings', currency: existingBaseCurrency, balance: 14500.00, color: '#06B6D4', icon: 'PiggyBank' },
    { id: 'acc_credit', name: 'Amex Gold Card', type: 'credit_card', currency: existingBaseCurrency, balance: -385.40, color: '#F59E0B', icon: 'CreditCard' },
  ];

  const insertAccount = db.prepare(`
    INSERT INTO accounts (id, name, type, currency, balance, color, icon, created_at, updated_at)
    VALUES (@id, @name, @type, @currency, @balance, @color, @icon, '${now}', '${now}')
  `);
  for (const acc of accounts) {
    insertAccount.run(acc);
  }

  // Budgets for current month
  const startOfMonth = `${year}-${month}-01`;
  const endOfMonth = `${year}-${month}-31`;

  const budgets = [
    { id: 'b_food', name: 'Food & Dining Out', amount: 450, period: 'monthly', category_id: 'cat_food_drinks', start_date: startOfMonth, end_date: endOfMonth },
    { id: 'b_groceries', name: 'Monthly Groceries', amount: 500, period: 'monthly', category_id: 'cat_groceries', start_date: startOfMonth, end_date: endOfMonth },
    { id: 'b_shopping', name: 'Discretionary Shopping', amount: 250, period: 'monthly', category_id: 'cat_shopping', start_date: startOfMonth, end_date: endOfMonth },
    { id: 'b_transport', name: 'Commute & Fuel', amount: 180, period: 'monthly', category_id: 'cat_transport', start_date: startOfMonth, end_date: endOfMonth },
  ];

  const insertBudget = db.prepare(`
    INSERT INTO budgets (id, name, amount, period, category_id, start_date, end_date, created_at)
    VALUES (@id, @name, @amount, @period, @category_id, @start_date, @end_date, '${now}')
  `);
  for (const b of budgets) {
    insertBudget.run(b);
  }

  // Planned Payments
  const planned = [
    { id: 'plan_rent', name: 'Apartment Rent', amount: 1250, type: 'expense', account_id: 'acc_checking', category_id: 'cat_housing', payee: 'Avalon Properties', frequency: 'monthly', next_date: `${year}-${month}-01`, auto_record: 1 },
    { id: 'plan_net_spo', name: 'Streaming (Netflix & Spotify)', amount: 27.98, type: 'expense', account_id: 'acc_credit', category_id: 'cat_entertainment', payee: 'Media Subscriptions', frequency: 'monthly', next_date: `${year}-${month}-15`, auto_record: 1 },
    { id: 'plan_wifi', name: 'Fiber Gigabit Internet', amount: 69.99, type: 'expense', account_id: 'acc_checking', category_id: 'cat_communication', payee: 'AT&T Fiber', frequency: 'monthly', next_date: `${year}-${month}-28`, auto_record: 0 },
    { id: 'plan_salary', name: 'Monthly Base Salary', amount: 4800, type: 'income', account_id: 'acc_checking', category_id: 'cat_salary', payee: 'Tech Corp Inc', frequency: 'monthly', next_date: `${year}-${month}-01`, auto_record: 1 },
  ];

  const insertPlanned = db.prepare(`
    INSERT INTO planned_payments (id, name, amount, type, account_id, category_id, payee, frequency, next_date, auto_record, is_active, created_at)
    VALUES (@id, @name, @amount, @type, @account_id, @category_id, @payee, @frequency, @next_date, @auto_record, 1, '${now}')
  `);
  for (const p of planned) {
    insertPlanned.run(p);
  }

  // Debts & Loans
  const debts = [
    { id: 'd_1', type: 'loan_owed_to_me', person_name: 'Alex Johnson', amount: 160.00, settled_amount: 60.00, due_date: `${year}-${month}-30`, notes: 'Concert tickets upfront cost', status: 'active' },
    { id: 'd_2', type: 'debt_i_owe', person_name: 'Sarah Miller', amount: 45.00, settled_amount: 0.00, due_date: `${year}-${month}-25`, notes: 'Group dinner bill split', status: 'active' },
  ];

  const insertDebt = db.prepare(`
    INSERT INTO debts (id, type, person_name, amount, settled_amount, due_date, notes, status, created_at)
    VALUES (@id, @type, @person_name, @amount, @settled_amount, @due_date, @notes, @status, '${now}')
  `);
  for (const d of debts) {
    insertDebt.run(d);
  }

  // Realistic Transactions for October
  const txs = [
    // Income
    { id: 'tx_inc_1', account_id: 'acc_checking', to_account_id: null, category_id: 'cat_salary', type: 'income', amount: 4800.00, currency: existingBaseCurrency, date: `${year}-${month}-01`, time: '09:00', payee: 'Tech Corp Inc', note: 'Monthly Salary direct deposit', status: 'cleared', payment_type: 'transfer' },
    { id: 'tx_inc_2', account_id: 'acc_checking', to_account_id: null, category_id: 'cat_freelance', type: 'income', amount: 650.00, currency: existingBaseCurrency, date: `${year}-${month}-12`, time: '14:20', payee: 'Client: FinTech App', note: 'UI design consulting milestone 1', status: 'cleared', payment_type: 'transfer' },
    { id: 'tx_inc_3', account_id: 'acc_savings', to_account_id: null, category_id: 'cat_investments', type: 'income', amount: 48.75, currency: existingBaseCurrency, date: `${year}-${month}-15`, time: '11:00', payee: 'HYSA Yield', note: 'Interest payment 4.5% APY', status: 'cleared', payment_type: 'transfer' },

    // Fixed & Housing Expenses
    { id: 'tx_exp_1', account_id: 'acc_checking', to_account_id: null, category_id: 'cat_housing', type: 'expense', amount: 1250.00, currency: existingBaseCurrency, date: `${year}-${month}-01`, time: '10:15', payee: 'Avalon Properties', note: 'October rent', status: 'cleared', payment_type: 'transfer' },

    // Groceries
    { id: 'tx_exp_2', account_id: 'acc_checking', to_account_id: null, category_id: 'cat_groceries', type: 'expense', amount: 132.40, currency: existingBaseCurrency, date: `${year}-${month}-03`, time: '17:30', payee: 'Whole Foods Market', note: 'Weekly grocery run', status: 'cleared', payment_type: 'debit_card' },
    { id: 'tx_exp_3', account_id: 'acc_credit', to_account_id: null, category_id: 'cat_groceries', type: 'expense', amount: 94.60, currency: existingBaseCurrency, date: `${year}-${month}-10`, time: '18:45', payee: "Trader Joe's", note: 'Snacks, fresh produce and dairy', status: 'cleared', payment_type: 'credit_card' },
    { id: 'tx_exp_4', account_id: 'acc_checking', to_account_id: null, category_id: 'cat_groceries', type: 'expense', amount: 115.20, currency: existingBaseCurrency, date: `${year}-${month}-17`, time: '16:10', payee: 'Costco Wholesale', note: 'Household supplies and bulk food', status: 'cleared', payment_type: 'debit_card' },

    // Food & Dining
    { id: 'tx_exp_5', account_id: 'acc_cash', to_account_id: null, category_id: 'cat_food_drinks', type: 'expense', amount: 18.50, currency: existingBaseCurrency, date: `${year}-${month}-04`, time: '12:45', payee: 'Blue Bottle Coffee', note: 'Espresso & Avocado toast', status: 'cleared', payment_type: 'cash' },
    { id: 'tx_exp_6', account_id: 'acc_credit', to_account_id: null, category_id: 'cat_food_drinks', type: 'expense', amount: 68.30, currency: existingBaseCurrency, date: `${year}-${month}-08`, time: '20:15', payee: 'Bella Italia Trattoria', note: 'Dinner with colleagues', status: 'cleared', payment_type: 'credit_card' },
    { id: 'tx_exp_7', account_id: 'acc_credit', to_account_id: null, category_id: 'cat_food_drinks', type: 'expense', amount: 34.00, currency: existingBaseCurrency, date: `${year}-${month}-14`, time: '19:00', payee: 'Chipotle Mexican Grill', note: 'Takeout dinner', status: 'cleared', payment_type: 'credit_card' },
    { id: 'tx_exp_8', account_id: 'acc_cash', to_account_id: null, category_id: 'cat_food_drinks', type: 'expense', amount: 22.50, currency: existingBaseCurrency, date: `${year}-${month}-21`, time: '13:10', payee: 'Street Taco Stand', note: 'Lunch with friend', status: 'cleared', payment_type: 'cash' },

    // Transport & Fuel
    { id: 'tx_exp_9', account_id: 'acc_credit', to_account_id: null, category_id: 'cat_vehicle', type: 'expense', amount: 52.00, currency: existingBaseCurrency, date: `${year}-${month}-05`, time: '08:30', payee: 'Shell Gas Station', note: 'Full tank fuel', status: 'cleared', payment_type: 'credit_card' },
    { id: 'tx_exp_10', account_id: 'acc_checking', to_account_id: null, category_id: 'cat_transport', type: 'expense', amount: 35.00, currency: existingBaseCurrency, date: `${year}-${month}-11`, time: '09:20', payee: 'Metro Transit Card', note: 'Monthly subway refill', status: 'cleared', payment_type: 'debit_card' },
    { id: 'tx_exp_11', account_id: 'acc_credit', to_account_id: null, category_id: 'cat_transport', type: 'expense', amount: 24.50, currency: existingBaseCurrency, date: `${year}-${month}-18`, time: '23:15', payee: 'Uber Technologies', note: 'Late night ride home', status: 'cleared', payment_type: 'credit_card' },

    // Shopping
    { id: 'tx_exp_12', account_id: 'acc_credit', to_account_id: null, category_id: 'cat_shopping', type: 'expense', amount: 79.99, currency: existingBaseCurrency, date: `${year}-${month}-09`, time: '15:20', payee: 'Uniqlo', note: 'Autumn jacket and fleece', status: 'cleared', payment_type: 'credit_card' },
    { id: 'tx_exp_13', account_id: 'acc_credit', to_account_id: null, category_id: 'cat_shopping', type: 'expense', amount: 45.00, currency: existingBaseCurrency, date: `${year}-${month}-16`, time: '11:45', payee: 'Amazon.com', note: 'Desk accessories & phone stand', status: 'cleared', payment_type: 'credit_card' },

    // Entertainment & Fitness
    { id: 'tx_exp_14', account_id: 'acc_credit', to_account_id: null, category_id: 'cat_entertainment', type: 'expense', amount: 27.98, currency: existingBaseCurrency, date: `${year}-${month}-15`, time: '06:00', payee: 'Netflix & Spotify', note: 'Monthly digital subscriptions', status: 'cleared', payment_type: 'credit_card' },
    { id: 'tx_exp_15', account_id: 'acc_checking', to_account_id: null, category_id: 'cat_fitness', type: 'expense', amount: 65.00, currency: existingBaseCurrency, date: `${year}-${month}-02`, time: '07:00', payee: 'Equinox Gym', note: 'Gym monthly pass', status: 'cleared', payment_type: 'debit_card' },

    // Transfer
    { id: 'tx_trf_1', account_id: 'acc_checking', to_account_id: 'acc_savings', category_id: null, type: 'transfer', amount: 500.00, currency: 'USD', date: `${year}-${month}-02`, time: '10:00', payee: null, note: 'Monthly savings auto-transfer', status: 'cleared', payment_type: 'transfer' },
    { id: 'tx_trf_2', account_id: 'acc_checking', to_account_id: 'acc_cash', category_id: null, type: 'transfer', amount: 150.00, currency: 'USD', date: `${year}-${month}-07`, time: '13:00', payee: 'ATM Withdrawal', note: 'Pocket cash replenishment', status: 'cleared', payment_type: 'cash' },
  ];

  const insertTx = db.prepare(`
    INSERT INTO transactions (id, account_id, to_account_id, category_id, type, amount, currency, date, time, payee, note, status, payment_type, created_at)
    VALUES (@id, @account_id, @to_account_id, @category_id, @type, @amount, @currency, @date, @time, @payee, @note, @status, @payment_type, '${now}')
  `);

  for (const tx of txs) {
    insertTx.run(tx);
  }
}
