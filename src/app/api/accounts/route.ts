import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { Account } from '@/types';


export async function GET() {
  try {
    const db = getDb();
    const accounts = db.prepare('SELECT * FROM accounts ORDER BY is_archived ASC, balance DESC').all() as Account[];
    return NextResponse.json(accounts);
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const db = getDb();
    const body = await req.json();
    const id = body.id || 'acc_' + Math.random().toString(36).substring(2, 9);
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO accounts (id, name, type, currency, balance, color, icon, is_archived, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
    `);

    stmt.run(
      id,
      body.name || 'New Account',
      body.type || 'bank',
      body.currency || 'USD',
      Number(body.balance) || 0,
      body.color || '#10B981',
      body.icon || 'Wallet',
      now,
      now
    );

    const created = db.prepare('SELECT * FROM accounts WHERE id = ?').get(id);
    return NextResponse.json(created, { status: 201 });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
