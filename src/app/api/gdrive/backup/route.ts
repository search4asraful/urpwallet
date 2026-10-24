import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { uploadBackupToGDrive } from '@/lib/gdrive';

export async function POST() {
  try {
    const db = getDb();
    const result = await uploadBackupToGDrive(db);
    return NextResponse.json({
      success: true,
      message: 'Backup uploaded to Google Drive successfully.',
      backup: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
