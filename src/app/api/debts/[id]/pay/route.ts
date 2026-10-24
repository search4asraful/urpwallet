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

    // Optional: If accountId is provided, also record the cashflow transaction
    if (body.account_id) {
      const now = new Date().toISOString();
      const today = now.split('T')[0];
      const currentTime = now.substring(11, 16);
      const isIncome = debt.type === 'loan_owed_to_me'; // Money returned to me is income/cash inflow
      const txType = isIncome ? 'income' : 'expense';
      const txId = 'tx_' + Math.random().toString(36).substring(2, 9);

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
          account_id: body.account_id,
          to_account_id: null,
          category_id: null,
          type: txType,
          amount: payAmount,
          currency: 'USD',
          date: today,
          time: currentTime,
          payee: debt.person_name,
          note: `Debt repayment (${debt.type === 'loan_owed_to_me' ? 'Collected from' : 'Paid to'} ${debt.person_name})`,
          status: 'cleared',
          payment_type: 'cash',
          created_at: now,
        });

        if (isIncome) {
          db.prepare('UPDATE accounts SET balance = balance + ?, updated_at = ? WHERE id = ?')
            .run(payAmount, now, body.account_id);
        } else {
          db.prepare('UPDATE accounts SET balance = balance - ?, updated_at = ? WHERE id = ?')
            .run(payAmount, now, body.account_id);
        }
      })();
    }

    const updated = db.prepare('SELECT * FROM debts WHERE id = ?').get(id);
    return NextResponse.json(updated);
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
