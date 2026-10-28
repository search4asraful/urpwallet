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

    const stmt = db.prepare(`
      UPDATE bills_subscriptions 
      SET name = COALESCE(?, name),
          amount = COALESCE(?, amount),
          type = COALESCE(?, type),
          account_id = COALESCE(?, account_id),
          category_id = COALESCE(?, category_id),
          payee = COALESCE(?, payee),
          frequency = COALESCE(?, frequency),
          next_date = COALESCE(?, next_date),
          auto_record = COALESCE(?, auto_record),
          is_active = COALESCE(?, is_active)
      WHERE id = ?
    `);

    stmt.run(
      body.name,
      body.amount !== undefined ? Number(body.amount) : null,
      body.type,
      body.account_id,
      body.category_id !== undefined ? body.category_id : null,
      body.payee !== undefined ? body.payee : null,
      body.frequency,
      body.next_date,
      body.auto_record !== undefined ? (body.auto_record ? 1 : 0) : null,
      body.is_active !== undefined ? (body.is_active ? 1 : 0) : null,
      id
    );

    const updated = db.prepare(`
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
    db.prepare('DELETE FROM bills_subscriptions WHERE id = ?').run(id);
    return NextResponse.json({ success: true, id });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
