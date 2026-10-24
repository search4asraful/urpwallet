import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { Debt } from '@/types';


export async function GET() {
  try {
    const db = getDb();
    const debts = db.prepare('SELECT * FROM debts ORDER BY status ASC, created_at DESC').all() as Debt[];
    return NextResponse.json(debts);
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const db = getDb();
    const body = await req.json();
    const id = body.id || 'd_' + Math.random().toString(36).substring(2, 9);
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO debts (id, type, person_name, amount, settled_amount, due_date, notes, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      body.type || 'debt_i_owe',
      body.person_name || 'Person',
      Number(body.amount) || 0,
      Number(body.settled_amount) || 0,
      body.due_date || null,
      body.notes || null,
      body.status || 'active',
      now
    );

    const created = db.prepare('SELECT * FROM debts WHERE id = ?').get(id);
    return NextResponse.json(created, { status: 201 });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
