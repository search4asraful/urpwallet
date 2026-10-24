import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { DashboardData, Account, Transaction, Budget, PlannedPayment, CategoryBreakdown, CashFlowTrendItem } from '@/types';


export async function GET() {
  try {
    const db = getDb();
    const today = new Date().toISOString().split('T')[0];
    const [year, month] = today.split('-');
    const currentMonthPrefix = `${year}-${month}`;

    // 1. Accounts
    const accounts = db.prepare('SELECT * FROM accounts WHERE is_archived = 0 ORDER BY balance DESC').all() as Account[];
    const netWorth = accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);

    // 2. Base Currency
    const settingCurrency = db.prepare('SELECT value FROM settings WHERE key = ?').get('base_currency') as { value: string } | undefined;
    const baseCurrency = settingCurrency ? settingCurrency.value : 'USD';

    // 3. Monthly Income and Expense
    const incomeRow = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total 
      FROM transactions 
      WHERE type = 'income' AND date LIKE ?
    `).get(`${currentMonthPrefix}%`) as { total: number };

    const expenseRow = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total 
      FROM transactions 
      WHERE type = 'expense' AND date LIKE ?
    `).get(`${currentMonthPrefix}%`) as { total: number };

    const monthlyIncome = incomeRow.total;
    const monthlyExpense = expenseRow.total;
    const balanceChange = monthlyIncome - monthlyExpense;

    // 4. Recent Transactions with Joins
    const recentTransactions = db.prepare(`
      SELECT 
        t.*,
        c.name as category_name,
        c.icon as category_icon,
        c.color as category_color,
        a.name as account_name,
        a.color as account_color,
        a.icon as account_icon,
        a.currency as account_currency,
        a2.name as to_account_name,
        a2.currency as to_account_currency
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN accounts a ON t.account_id = a.id
      LEFT JOIN accounts a2 ON t.to_account_id = a2.id
      ORDER BY t.date DESC, t.time DESC, t.created_at DESC
      LIMIT 15
    `).all() as Transaction[];

    // 5. Active Budgets with spent amount
    const rawBudgets = db.prepare(`
      SELECT b.*, c.name as category_name, c.color as category_color, c.icon as category_icon
      FROM budgets b
      LEFT JOIN categories c ON b.category_id = c.id
    `).all() as (Budget & { category_name?: string; category_color?: string; category_icon?: string })[];

    const activeBudgets: Budget[] = rawBudgets.map((b) => {
      let spent = 0;
      if (b.category_id) {
        const spentRow = db.prepare(`
          SELECT COALESCE(SUM(amount), 0) as total
          FROM transactions
          WHERE type = 'expense' 
            AND category_id = ?
            AND date >= ? AND date <= ?
        `).get(b.category_id, b.start_date, b.end_date) as { total: number };
        spent = spentRow.total;
      } else {
        const spentRow = db.prepare(`
          SELECT COALESCE(SUM(amount), 0) as total
          FROM transactions
          WHERE type = 'expense'
            AND date >= ? AND date <= ?
        `).get(b.start_date, b.end_date) as { total: number };
        spent = spentRow.total;
      }

      return {
        ...b,
        spent
      };
    });

    // 6. Upcoming Planned Payments
    const upcomingPlanned = db.prepare(`
      SELECT 
        p.*,
        a.name as account_name,
        c.name as category_name,
        c.color as category_color,
        c.icon as category_icon
      FROM planned_payments p
      LEFT JOIN accounts a ON p.account_id = a.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.is_active = 1
      ORDER BY p.next_date ASC
      LIMIT 5
    `).all() as PlannedPayment[];

    // 7. Spending by Category Breakdown this month
    const categoryBreakdownRows = db.prepare(`
      SELECT 
        c.id as category_id,
        c.name,
        c.color,
        c.icon,
        COALESCE(SUM(t.amount), 0) as total
      FROM transactions t
      JOIN categories c ON t.category_id = c.id
      WHERE t.type = 'expense' AND t.date LIKE ?
      GROUP BY c.id
      ORDER BY total DESC
    `).all(`${currentMonthPrefix}%`) as { category_id: string; name: string; color: string; icon: string; total: number }[];

    const categoryBreakdown: CategoryBreakdown[] = categoryBreakdownRows.map((cat) => ({
      ...cat,
      percentage: monthlyExpense > 0 ? Math.round((cat.total / monthlyExpense) * 100) : 0
    }));

    // 8. Cashflow Trend (Past 4 Weeks / Periods of the month)
    const weeks = [
      { label: 'Week 1', start: `${currentMonthPrefix}-01`, end: `${currentMonthPrefix}-07` },
      { label: 'Week 2', start: `${currentMonthPrefix}-08`, end: `${currentMonthPrefix}-14` },
      { label: 'Week 3', start: `${currentMonthPrefix}-15`, end: `${currentMonthPrefix}-21` },
      { label: 'Week 4+', start: `${currentMonthPrefix}-22`, end: `${currentMonthPrefix}-31` },
    ];

    const cashFlowTrend: CashFlowTrendItem[] = weeks.map((w) => {
      const inc = db.prepare(`
        SELECT COALESCE(SUM(amount), 0) as total FROM transactions
        WHERE type = 'income' AND date >= ? AND date <= ?
      `).get(w.start, w.end) as { total: number };

      const exp = db.prepare(`
        SELECT COALESCE(SUM(amount), 0) as total FROM transactions
        WHERE type = 'expense' AND date >= ? AND date <= ?
      `).get(w.start, w.end) as { total: number };

      return {
        period: w.label,
        income: inc.total,
        expense: exp.total
      };
    });

    const data: DashboardData = {
      netWorth,
      monthlyIncome,
      monthlyExpense,
      balanceChange,
      baseCurrency,
      accounts,
      recentTransactions,
      activeBudgets,
      upcomingPlanned,
      categoryBreakdown,
      cashFlowTrend
    };

    return NextResponse.json(data);
  } catch (error: unknown) {
    console.error('Error fetching dashboard:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
