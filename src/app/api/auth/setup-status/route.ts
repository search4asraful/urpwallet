import { NextResponse } from 'next/server';
import { connection } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  await connection();
  try {
    const db = getDb();
    const row = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
    const userCount = row?.count ?? 0;
    return NextResponse.json(
      {
        isSetup: userCount > 0,
        userCount,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        },
      }
    );
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

