import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';


export async function GET() {
  try {
    const db = getDb();
    const rows = db.prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[];
    const settings: Record<string, string> = {};
    rows.forEach((r) => {
      settings[r.key] = r.value;
    });
    return NextResponse.json(settings);
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const db = getDb();
    const body = await req.json();

    const stmt = db.prepare(`
      INSERT INTO settings (key, value) VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `);

    for (const [key, value] of Object.entries(body)) {
      stmt.run(key, String(value));
    }

    if (body.base_currency) {
      // Keep transactions synchronized with their account's selected currency
      db.prepare(`
        UPDATE transactions 
        SET currency = (SELECT currency FROM accounts WHERE accounts.id = transactions.account_id) 
        WHERE account_id IN (SELECT id FROM accounts)
      `).run();
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
