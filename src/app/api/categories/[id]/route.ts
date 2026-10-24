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
      UPDATE categories 
      SET name = COALESCE(?, name),
          type = COALESCE(?, type),
          icon = COALESCE(?, icon),
          color = COALESCE(?, color),
          parent_id = COALESCE(?, parent_id)
      WHERE id = ?
    `);

    stmt.run(
      body.name,
      body.type,
      body.icon,
      body.color,
      body.parent_id !== undefined ? body.parent_id : null,
      id
    );

    const updated = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
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

    // Check if category exists
    const category = db.prepare('SELECT id, name FROM categories WHERE id = ?').get(id) as { id: string; name: string } | undefined;
    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    // Check if any transaction is currently using this category
    const txCountRow = db
      .prepare('SELECT COUNT(*) as count FROM transactions WHERE category_id = ?')
      .get(id) as { count: number } | undefined;

    const count = txCountRow?.count ?? 0;
    if (count > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete category "${category.name}": it is currently used by ${count} transaction${count === 1 ? '' : 's'}. Please reassign or delete the transactions first.`,
          count,
        },
        { status: 400 }
      );
    }

    db.prepare('DELETE FROM categories WHERE id = ?').run(id);
    return NextResponse.json({ success: true, id });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
