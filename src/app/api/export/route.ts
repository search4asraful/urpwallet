import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAuth } from '@/lib/auth';


export async function GET(req: Request) {
  try {
    const auth = await requireAuth();
    if (auth.errorResponse) return auth.errorResponse;

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

    const accounts = (db.prepare('SELECT id, name, type, currency, balance, color, icon, is_archived, created_at, updated_at FROM accounts').all() as Record<string, unknown>[]).map((a) => ({
      id: String(a.id),
      name: String(a.name),
      account_type: String(a.type),
      currency: String(a.currency),
      balance: Number(a.balance),
      color: String(a.color),
      icon: String(a.icon),
      is_archived: Boolean(a.is_archived),
      created_at: String(a.created_at),
      updated_at: String(a.updated_at),
    }));

    const categories = (db.prepare('SELECT id, name, type, icon, color, parent_id, created_at FROM categories').all() as Record<string, unknown>[]).map((c) => ({
      id: String(c.id),
      name: String(c.name),
      category_type: String(c.type),
      icon: String(c.icon),
      color: String(c.color),
      parent_id: c.parent_id ? String(c.parent_id) : null,
      created_at: String(c.created_at),
    }));

    const rawTransactions = db.prepare(`
      SELECT id, account_id, to_account_id, category_id, type, amount, currency,
             date, time, payee, note, status, payment_type, created_at
      FROM transactions
      ORDER BY date DESC, time DESC, created_at DESC
    `).all() as Record<string, unknown>[];

    const formattedTransactions = rawTransactions.map((t) => ({
      id: String(t.id),
      account_id: String(t.account_id),
      to_account_id: t.to_account_id ? String(t.to_account_id) : null,
      category_id: t.category_id ? String(t.category_id) : null,
      tx_type: String(t.type),
      amount: Number(t.amount),
      currency: String(t.currency),
      date: String(t.date),
      time: t.time ? String(t.time) : null,
      payee: t.payee ? String(t.payee) : null,
      note: t.note ? String(t.note) : null,
      status: String(t.status),
      payment_type: String(t.payment_type),
      created_at: String(t.created_at),
    }));

    const budgets = (db.prepare('SELECT id, name, amount, period, category_id, start_date, end_date, created_at FROM budgets').all() as Record<string, unknown>[]).map((b) => ({
      id: String(b.id),
      name: String(b.name),
      amount: Number(b.amount),
      period: String(b.period),
      category_id: b.category_id ? String(b.category_id) : null,
      start_date: String(b.start_date),
      end_date: String(b.end_date),
      created_at: String(b.created_at),
    }));

    const bills_subscriptions = (db.prepare('SELECT id, name, amount, type, account_id, category_id, payee, frequency, next_date, auto_record, is_active, created_at FROM bills_subscriptions').all() as Record<string, unknown>[]).map((b) => ({
      id: String(b.id),
      name: String(b.name),
      amount: Number(b.amount),
      bill_type: String(b.type),
      account_id: String(b.account_id),
      category_id: b.category_id ? String(b.category_id) : null,
      payee: b.payee ? String(b.payee) : null,
      frequency: String(b.frequency),
      next_date: String(b.next_date),
      auto_record: Boolean(b.auto_record),
      is_active: Boolean(b.is_active),
      created_at: String(b.created_at),
    }));

    const debts = (db.prepare('SELECT id, type, person_name, amount, settled_amount, due_date, notes, status, created_at FROM debts').all() as Record<string, unknown>[]).map((d) => ({
      id: String(d.id),
      debt_type: String(d.type),
      person_name: String(d.person_name),
      amount: Number(d.amount),
      settled_amount: Number(d.settled_amount),
      due_date: d.due_date ? String(d.due_date) : null,
      notes: d.notes ? String(d.notes) : null,
      status: String(d.status),
      created_at: String(d.created_at),
    }));

    const rawSettings = db.prepare('SELECT key, value FROM settings ORDER BY key ASC').all() as { key: string; value: string }[];
    const settings: [string, string][] = rawSettings.map((s) => [s.key, s.value]);

    const fullBackup = {
      exported_at: new Date().toISOString(),
      accounts,
      categories,
      transactions: formattedTransactions,
      budgets,
      bills_subscriptions,
      debts,
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
