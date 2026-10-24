import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { Transaction } from '@/types';


export async function PUT(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  const db = getDb();
  try {
    const { id } = await props.params;
    const body = await req.json();

    const oldTx = db.prepare('SELECT * FROM transactions WHERE id = ?').get(id) as Transaction | undefined;
    if (!oldTx) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    const now = new Date().toISOString();
    const type = body.type || oldTx.type;
    const amount = body.amount !== undefined ? Number(body.amount) : oldTx.amount;
    const accountId = body.account_id || oldTx.account_id;
    const toAccountId = body.to_account_id !== undefined ? body.to_account_id : oldTx.to_account_id;
    const categoryId = body.category_id !== undefined ? body.category_id : oldTx.category_id;
    const accountRow = db.prepare('SELECT currency FROM accounts WHERE id = ?').get(accountId) as { currency: string } | undefined;
    const currency = accountRow?.currency || body.currency || oldTx.currency || 'USD';
    const date = body.date || oldTx.date;
    const time = body.time !== undefined ? body.time : oldTx.time;
    const payee = body.payee !== undefined ? body.payee : oldTx.payee;
    const note = body.note !== undefined ? body.note : oldTx.note;
    const status = body.status || oldTx.status;
    const paymentType = body.payment_type || oldTx.payment_type;

    const executeUpdate = db.transaction(() => {
      // 1. Revert old transaction effect on balances
      if (oldTx.type === 'expense') {
        db.prepare('UPDATE accounts SET balance = balance + ?, updated_at = ? WHERE id = ?').run(oldTx.amount, now, oldTx.account_id);
      } else if (oldTx.type === 'income') {
        db.prepare('UPDATE accounts SET balance = balance - ?, updated_at = ? WHERE id = ?').run(oldTx.amount, now, oldTx.account_id);
      } else if (oldTx.type === 'transfer' && oldTx.to_account_id) {
        db.prepare('UPDATE accounts SET balance = balance + ?, updated_at = ? WHERE id = ?').run(oldTx.amount, now, oldTx.account_id);
        db.prepare('UPDATE accounts SET balance = balance - ?, updated_at = ? WHERE id = ?').run(oldTx.amount, now, oldTx.to_account_id);
      }

      // 2. Update transaction
      db.prepare(`
        UPDATE transactions SET
          account_id = ?, to_account_id = ?, category_id = ?, type = ?,
          amount = ?, currency = ?, date = ?, time = ?, payee = ?,
          note = ?, status = ?, payment_type = ?
        WHERE id = ?
      `).run(
        accountId, toAccountId, categoryId, type,
        amount, currency, date, time, payee,
        note, status, paymentType, id
      );

      // 3. Apply new transaction effect on balances
      if (type === 'expense') {
        db.prepare('UPDATE accounts SET balance = balance - ?, updated_at = ? WHERE id = ?').run(amount, now, accountId);
      } else if (type === 'income') {
        db.prepare('UPDATE accounts SET balance = balance + ?, updated_at = ? WHERE id = ?').run(amount, now, accountId);
      } else if (type === 'transfer' && toAccountId) {
        db.prepare('UPDATE accounts SET balance = balance - ?, updated_at = ? WHERE id = ?').run(amount, now, accountId);
        db.prepare('UPDATE accounts SET balance = balance + ?, updated_at = ? WHERE id = ?').run(amount, now, toAccountId);
      }
    });

    executeUpdate();

    const updated = db.prepare(`
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

    return NextResponse.json(updated);
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  const db = getDb();
  try {
    const { id } = await props.params;
    const oldTx = db.prepare('SELECT * FROM transactions WHERE id = ?').get(id) as Transaction | undefined;
    if (!oldTx) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    const now = new Date().toISOString();
    const executeDelete = db.transaction(() => {
      // Revert old transaction effect on balances
      if (oldTx.type === 'expense') {
        db.prepare('UPDATE accounts SET balance = balance + ?, updated_at = ? WHERE id = ?').run(oldTx.amount, now, oldTx.account_id);
      } else if (oldTx.type === 'income') {
        db.prepare('UPDATE accounts SET balance = balance - ?, updated_at = ? WHERE id = ?').run(oldTx.amount, now, oldTx.account_id);
      } else if (oldTx.type === 'transfer' && oldTx.to_account_id) {
        db.prepare('UPDATE accounts SET balance = balance + ?, updated_at = ? WHERE id = ?').run(oldTx.amount, now, oldTx.account_id);
        db.prepare('UPDATE accounts SET balance = balance - ?, updated_at = ? WHERE id = ?').run(oldTx.amount, now, oldTx.to_account_id);
      }

      db.prepare('DELETE FROM transactions WHERE id = ?').run(id);
    });

    executeDelete();

    return NextResponse.json({ success: true, id });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
