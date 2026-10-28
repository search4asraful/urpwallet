import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { Debt } from '@/types';

export async function POST(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  const db = getDb();
  try {
    const { id } = await props.params;
    const body = await req.json();
    const payAmount = Number(body.amount);

    if (isNaN(payAmount) || payAmount <= 0) {
      return NextResponse.json({ error: 'Valid payment amount is required' }, { status: 400 });
    }

    const debt = db.prepare('SELECT * FROM debts WHERE id = ?').get(id) as Debt | undefined;
    if (!debt) {
      return NextResponse.json({ error: 'Debt record not found' }, { status: 404 });
    }

    const newSettled = debt.settled_amount + payAmount;
    const newStatus = newSettled >= debt.amount ? 'settled' : 'active';

    db.prepare('UPDATE debts SET settled_amount = ?, status = ? WHERE id = ?')
      .run(newSettled, newStatus, id);

    // Always record the transaction when a debt/loan is settled (Income for loan, Expense for debt)
    const now = new Date().toISOString();
    const today = now.split('T')[0];
    const currentTime = now.substring(11, 16);
    const isIncome = debt.type === 'loan_owed_to_me'; // Loan collected = income; debt paid = expense
    const txType = isIncome ? 'income' : 'expense';
    const txId = 'tx_' + Math.random().toString(36).substring(2, 9);

    // Resolve account automatically if not provided
    let targetAccId = body.account_id;
    if (!targetAccId) {
      const defaultAcc = db.prepare('SELECT id, currency FROM accounts WHERE is_archived = 0 ORDER BY balance DESC LIMIT 1').get() as { id: string; currency: string } | undefined;
      targetAccId = defaultAcc?.id;
    }
    if (!targetAccId) {
      const anyAcc = db.prepare('SELECT id, currency FROM accounts LIMIT 1').get() as { id: string; currency: string } | undefined;
      targetAccId = anyAcc?.id;
    }
    if (!targetAccId) {
      targetAccId = 'acc_cash';
      db.prepare(`
        INSERT INTO accounts (id, name, type, currency, balance, color, icon, created_at, updated_at)
        VALUES ('acc_cash', 'Cash Wallet', 'cash', 'USD', 0, '#10B981', 'Wallet', ?, ?)
      `).run(now, now);
    }

    const accRow = db.prepare('SELECT currency FROM accounts WHERE id = ?').get(targetAccId) as { currency: string } | undefined;
    const currency = accRow?.currency || 'USD';

    db.transaction(() => {
      db.prepare(`
        INSERT INTO transactions (
          id, account_id, to_account_id, category_id, type, amount, currency,
          date, time, payee, note, status, payment_type, created_at
        ) VALUES (
          @id, @account_id, @to_account_id, @category_id, @type, @amount, @currency,
          @date, @time, @payee, @note, @status, @payment_type, @created_at
        )
      `).run({
        id: txId,
        account_id: targetAccId,
        to_account_id: null,
        category_id: null,
        type: txType,
        amount: payAmount,
        currency,
        date: today,
        time: currentTime,
        payee: debt.person_name,
        note: `Debt settlement: ${isIncome ? 'Collected from' : 'Paid to'} ${debt.person_name}`,
        status: 'cleared',
        payment_type: 'cash',
        created_at: now,
      });

      if (isIncome) {
        db.prepare('UPDATE accounts SET balance = balance + ?, updated_at = ? WHERE id = ?')
          .run(payAmount, now, targetAccId);
      } else {
        db.prepare('UPDATE accounts SET balance = balance - ?, updated_at = ? WHERE id = ?')
          .run(payAmount, now, targetAccId);
      }
    })();

    const updated = db.prepare('SELECT * FROM debts WHERE id = ?').get(id);
    return NextResponse.json(updated);
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
