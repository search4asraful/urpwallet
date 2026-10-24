import { NextResponse } from 'next/server';
import { getDb, seedDatabase } from '@/lib/db';


export async function POST() {
  try {
    const db = getDb();
    seedDatabase(db);
    return NextResponse.json({ success: true, message: 'Database seeded successfully with sample demo data' });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
