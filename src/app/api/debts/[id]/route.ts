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
      UPDATE debts 
      SET type = COALESCE(?, type),
          person_name = COALESCE(?, person_name),
          amount = COALESCE(?, amount),
          settled_amount = COALESCE(?, settled_amount),
          due_date = COALESCE(?, due_date),
          notes = COALESCE(?, notes),
          status = COALESCE(?, status)
      WHERE id = ?
    `);

    stmt.run(
      body.type,
      body.person_name,
      body.amount !== undefined ? Number(body.amount) : null,
      body.settled_amount !== undefined ? Number(body.settled_amount) : null,
      body.due_date,
      body.notes,
      body.status,
      id
    );

    const updated = db.prepare('SELECT * FROM debts WHERE id = ?').get(id);
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
    db.prepare('DELETE FROM debts WHERE id = ?').run(id);
    return NextResponse.json({ success: true, id });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
