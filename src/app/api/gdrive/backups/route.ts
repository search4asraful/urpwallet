import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { listGDriveBackups } from '@/lib/gdrive';

export async function GET(req: Request) {
  try {
    req.headers.get('host'); // Force dynamic execution per request
    const db = getDb();
    const backups = await listGDriveBackups(db);
    return NextResponse.json({ backups });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
