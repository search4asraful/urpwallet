import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { PlannedPayment } from '@/types';

export async function POST(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  const db = getDb();
  try {
    const { id } = await props.params;
    const plan = db.prepare('SELECT * FROM planned_payments WHERE id = ?').get(id) as PlannedPayment | undefined;
    if (!plan) {
      return NextResponse.json({ error: 'Planned payment not found' }, { status: 404 });
    }

    const now = new Date().toISOString();
    const today = now.split('T')[0];
    const currentTime = now.substring(11, 16);
    const txId = 'tx_' + Math.random().toString(36).substring(2, 9);

    // Calculate next date
    const currentDate = new Date(plan.next_date || today);
    const nextDate = new Date(currentDate);

    if (plan.frequency === 'daily') {
      nextDate.setDate(nextDate.getDate() + 1);
    } else if (plan.frequency === 'weekly') {
      nextDate.setDate(nextDate.getDate() + 7);
    } else if (plan.frequency === 'monthly') {
      nextDate.setMonth(nextDate.getMonth() + 1);
    } else if (plan.frequency === 'yearly') {
      nextDate.setFullYear(nextDate.getFullYear() + 1);
    }

    const nextDateStr = nextDate.toISOString().split('T')[0];

    const executePayment = db.transaction(() => {
      // 1. Create transaction
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
        account_id: plan.account_id,
        to_account_id: null,
        category_id: plan.category_id || null,
        type: plan.type,
        amount: plan.amount,
        currency: 'USD',
        date: today,
        time: currentTime,
        payee: plan.payee || plan.name,
        note: `Planned Payment: ${plan.name}`,
        status: 'cleared',
        payment_type: 'transfer',
        created_at: now,
      });

      // 2. Adjust account balance
      if (plan.type === 'expense') {
        db.prepare('UPDATE accounts SET balance = balance - ?, updated_at = ? WHERE id = ?')
          .run(plan.amount, now, plan.account_id);
      } else {
        db.prepare('UPDATE accounts SET balance = balance + ?, updated_at = ? WHERE id = ?')
          .run(plan.amount, now, plan.account_id);
      }

      // 3. Update next date for the planned payment
      db.prepare('UPDATE planned_payments SET next_date = ? WHERE id = ?')
        .run(nextDateStr, id);
    });

    executePayment();

    return NextResponse.json({
      success: true,
      transaction_id: txId,
      next_date: nextDateStr,
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
