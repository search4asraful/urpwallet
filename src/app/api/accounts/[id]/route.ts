import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';


export async function PUT(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const db = getDb();
    const body = await req.json();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      UPDATE accounts 
      SET name = COALESCE(?, name),
          type = COALESCE(?, type),
          currency = COALESCE(?, currency),
          balance = COALESCE(?, balance),
          color = COALESCE(?, color),
          icon = COALESCE(?, icon),
          is_archived = COALESCE(?, is_archived),
          updated_at = ?
      WHERE id = ?
    `);

    stmt.run(
      body.name,
      body.type,
      body.currency,
      body.balance !== undefined ? Number(body.balance) : null,
      body.color,
      body.icon,
      body.is_archived !== undefined ? Number(body.is_archived) : null,
      now,
      id
    );

    const updated = db.prepare('SELECT * FROM accounts WHERE id = ?').get(id);
    return NextResponse.json(updated);
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const db = getDb();
    db.prepare('DELETE FROM accounts WHERE id = ?').run(id);
    return NextResponse.json({ success: true, id });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
