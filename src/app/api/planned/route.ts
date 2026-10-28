import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { PlannedPayment } from '@/types';


export async function GET() {
  try {
    const db = getDb();
    const planned = db.prepare(`
      SELECT 
        p.*,
        a.name as account_name,
        c.name as category_name,
        c.color as category_color,
        c.icon as category_icon
      FROM bills_subscriptions p
      LEFT JOIN accounts a ON p.account_id = a.id
      LEFT JOIN categories c ON p.category_id = c.id
      ORDER BY p.next_date ASC
    `).all() as PlannedPayment[];

    return NextResponse.json(planned);
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const db = getDb();
    const body = await req.json();
    const id = body.id || 'plan_' + Math.random().toString(36).substring(2, 9);
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO bills_subscriptions (
        id, name, amount, type, account_id, category_id, payee,
        frequency, next_date, auto_record, is_active, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      body.name || 'New Planned Payment',
      Number(body.amount) || 0,
      body.type || 'expense',
      body.account_id,
      body.category_id || null,
      body.payee || null,
      body.frequency || 'monthly',
      body.next_date,
      body.auto_record ? 1 : 0,
      body.is_active !== undefined ? (body.is_active ? 1 : 0) : 1,
      now
    );

    const created = db.prepare(`
      SELECT 
        p.*,
        a.name as account_name,
        c.name as category_name,
        c.color as category_color,
        c.icon as category_icon
      FROM bills_subscriptions p
      LEFT JOIN accounts a ON p.account_id = a.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = ?
    `).get(id);

    return NextResponse.json(created, { status: 201 });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
