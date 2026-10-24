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
      UPDATE budgets 
      SET name = COALESCE(?, name),
          amount = COALESCE(?, amount),
          period = COALESCE(?, period),
          category_id = COALESCE(?, category_id),
          start_date = COALESCE(?, start_date),
          end_date = COALESCE(?, end_date)
      WHERE id = ?
    `);

    stmt.run(
      body.name,
      body.amount !== undefined ? Number(body.amount) : null,
      body.period,
      body.category_id !== undefined ? body.category_id : null,
      body.start_date,
      body.end_date,
      id
    );

    const updated = db.prepare(`
      SELECT b.*, c.name as category_name, c.color as category_color, c.icon as category_icon
      FROM budgets b
      LEFT JOIN categories c ON b.category_id = c.id
      WHERE b.id = ?
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
    db.prepare('DELETE FROM budgets WHERE id = ?').run(id);
    return NextResponse.json({ success: true, id });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
