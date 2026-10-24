import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';


export async function GET(req: Request) {
  try {
    const db = getDb();
    const { searchParams } = new URL(req.url);
    const format = searchParams.get('format') || 'json';

    const transactions = db.prepare(`
      SELECT 
        t.*,
        a.name as account,
        a2.name as to_account,
        c.name as category
      FROM transactions t
      LEFT JOIN accounts a ON t.account_id = a.id
      LEFT JOIN accounts a2 ON t.to_account_id = a2.id
      LEFT JOIN categories c ON t.category_id = c.id
      ORDER BY t.date DESC, t.time DESC, t.created_at DESC
    `).all();

    if (format === 'csv') {
      const headers = ['id', 'date', 'time', 'type', 'amount', 'currency', 'account', 'to_account', 'category', 'payee', 'note', 'payment_type', 'status'];
      const rows = (transactions as Record<string, unknown>[]).map((tx) =>
        headers.map((h) => {
          const val = tx[h] !== null && tx[h] !== undefined ? String(tx[h]) : '';
          return `"${val.replace(/"/g, '""')}"`;
        }).join(',')
      );
      const csv = [headers.join(','), ...rows].join('\n');

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="urpwallet_transactions.csv"',
        },
      });
    }

    const accounts = db.prepare('SELECT * FROM accounts').all();
    const categories = db.prepare('SELECT * FROM categories').all();
    const budgets = db.prepare('SELECT * FROM budgets').all();
    const debts = db.prepare('SELECT * FROM debts').all();
    const planned = db.prepare('SELECT * FROM planned_payments').all();
    const settings = db.prepare('SELECT * FROM settings').all();

    const fullBackup = {
      exported_at: new Date().toISOString(),
      accounts,
      categories,
      transactions,
      budgets,
      debts,
      planned_payments: planned,
      settings,
    };

    return new NextResponse(JSON.stringify(fullBackup, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': 'attachment; filename="urpwallet_backup.json"',
      },
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
