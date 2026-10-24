import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { Transaction } from '@/types';


export async function GET(req: Request) {
  try {
    const db = getDb();
    const { searchParams } = new URL(req.url);

    const type = searchParams.get('type');
    const accountId = searchParams.get('accountId');
    const categoryId = searchParams.get('categoryId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const search = searchParams.get('search');
    const limit = Number(searchParams.get('limit')) || 100;
    const offset = Number(searchParams.get('offset')) || 0;

    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (type && type !== 'all') {
      conditions.push('t.type = ?');
      params.push(type);
    }
    if (accountId) {
      conditions.push('(t.account_id = ? OR t.to_account_id = ?)');
      params.push(accountId, accountId);
    }
    if (categoryId) {
      conditions.push('t.category_id = ?');
      params.push(categoryId);
    }
    if (startDate) {
      conditions.push('t.date >= ?');
      params.push(startDate);
    }
    if (endDate) {
      conditions.push('t.date <= ?');
      params.push(endDate);
    }
    if (search) {
      conditions.push('(t.payee LIKE ? OR t.note LIKE ? OR c.name LIKE ?)');
      const q = `%${search}%`;
      params.push(q, q, q);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const sql = `
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
      ${whereClause}
      ORDER BY t.date DESC, t.time DESC, t.created_at DESC
      LIMIT ? OFFSET ?
    `;

    params.push(limit, offset);

    const transactions = db.prepare(sql).all(...params) as Transaction[];
    return NextResponse.json(transactions);
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const db = getDb();
  try {
    const body = await req.json();
    const id = body.id || 'tx_' + Math.random().toString(36).substring(2, 9);
    const now = new Date().toISOString();
    const today = now.split('T')[0];
    const currentTime = now.substring(11, 16);

    const type = body.type || 'expense';
    const amount = Number(body.amount) || 0;
    const accountId = body.account_id;
    const toAccountId = body.to_account_id || null;
    const categoryId = body.category_id || null;
    const accountRow = db.prepare('SELECT currency FROM accounts WHERE id = ?').get(accountId) as { currency: string } | undefined;
    const currency = accountRow?.currency || body.currency || 'USD';
    const date = body.date || today;
    const time = body.time || currentTime;
    const payee = body.payee || null;
    const note = body.note || null;
    const status = body.status || 'cleared';
    const paymentType = body.payment_type || 'cash';

    if (!accountId) {
      return NextResponse.json({ error: 'Account is required' }, { status: 400 });
    }

    if (amount <= 0) {
      return NextResponse.json({ error: 'Amount must be greater than 0' }, { status: 400 });
    }

    // Execute in transaction
    const executeInsert = db.transaction(() => {
      // 1. Insert transaction
      db.prepare(`
        INSERT INTO transactions (
          id, account_id, to_account_id, category_id, type, amount, currency,
          date, time, payee, note, status, payment_type, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id, accountId, toAccountId, categoryId, type, amount, currency,
        date, time, payee, note, status, paymentType, now
      );

      // 2. Adjust account balances
      if (type === 'expense') {
        db.prepare('UPDATE accounts SET balance = balance - ?, updated_at = ? WHERE id = ?').run(amount, now, accountId);
      } else if (type === 'income') {
        db.prepare('UPDATE accounts SET balance = balance + ?, updated_at = ? WHERE id = ?').run(amount, now, accountId);
      } else if (type === 'transfer' && toAccountId) {
        db.prepare('UPDATE accounts SET balance = balance - ?, updated_at = ? WHERE id = ?').run(amount, now, accountId);
        db.prepare('UPDATE accounts SET balance = balance + ?, updated_at = ? WHERE id = ?').run(amount, now, toAccountId);
      }
    });

    executeInsert();

    const created = db.prepare(`
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
      WHERE t.id = ?
    `).get(id);

    return NextResponse.json(created, { status: 201 });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
