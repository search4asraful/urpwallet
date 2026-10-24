import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { Category } from '@/types';


export async function GET() {
  try {
    const db = getDb();
    const categories = db.prepare('SELECT * FROM categories ORDER BY type ASC, name ASC').all() as Category[];
    return NextResponse.json(categories);
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const db = getDb();
    const body = await req.json();
    const id = body.id || 'cat_' + Math.random().toString(36).substring(2, 9);
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO categories (id, name, type, icon, color, parent_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      body.name || 'New Category',
      body.type || 'expense',
      body.icon || 'CircleDollarSign',
      body.color || '#10B981',
      body.parent_id || null,
      now
    );

    const created = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
    return NextResponse.json(created, { status: 201 });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
