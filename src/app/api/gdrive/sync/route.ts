import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { isBackupDue, uploadBackupToGDrive, getGDriveSettings } from '@/lib/gdrive';

export async function POST(req: Request) {
  try {
    const db = getDb();
    let body: { force?: boolean } = {};
    try {
      body = await req.json();
    } catch {
      // Body may be empty in cron calls
    }

    const settings = getGDriveSettings(db);

    if (!settings.refreshToken) {
      return NextResponse.json({
        performed: false,
        message: 'Google Drive is not connected.',
      });
    }

    const force = Boolean(body.force);
    const due = isBackupDue(db);

    if (!force && !due) {
      return NextResponse.json({
        performed: false,
        message: 'Backup is not due yet according to your schedule.',
        lastBackupTime: settings.lastBackupTime,
        frequency: settings.frequency,
      });
    }

    const result = await uploadBackupToGDrive(db);

    return NextResponse.json({
      performed: true,
      message: 'Scheduled backup synced to Google Drive successfully.',
      backup: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
