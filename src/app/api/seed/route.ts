import { NextResponse } from 'next/server';
import { getDb, seedDatabase } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function POST() {
  try {
    const authResult = await requireAuth('admin');
    if (authResult.errorResponse) {
      return authResult.errorResponse;
    }

    const db = getDb();
    seedDatabase(db);
    return NextResponse.json({ success: true, message: 'Database seeded successfully with sample demo data' });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

