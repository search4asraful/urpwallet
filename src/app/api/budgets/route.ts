import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { Budget } from '@/types';


export async function GET() {
  try {
    const db = getDb();
    const rawBudgets = db.prepare(`
      SELECT b.*, c.name as category_name, c.color as category_color, c.icon as category_icon
      FROM budgets b
      LEFT JOIN categories c ON b.category_id = c.id
      ORDER BY b.amount DESC
    `).all() as (Budget & { category_name?: string; category_color?: string; category_icon?: string })[];

    const budgets: Budget[] = rawBudgets.map((b) => {
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
      return { ...b, spent };
    });

    return NextResponse.json(budgets);
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const db = getDb();
    const body = await req.json();
    const id = body.id || 'b_' + Math.random().toString(36).substring(2, 9);
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO budgets (id, name, amount, period, category_id, start_date, end_date, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      body.name || 'New Budget',
      Number(body.amount) || 0,
      body.period || 'monthly',
      body.category_id || null,
      body.start_date,
      body.end_date,
      now
    );

    const created = db.prepare(`
      SELECT b.*, c.name as category_name, c.color as category_color, c.icon as category_icon
      FROM budgets b
      LEFT JOIN categories c ON b.category_id = c.id
      WHERE b.id = ?
    `).get(id);

    return NextResponse.json(created, { status: 201 });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
