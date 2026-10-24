import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { saveGDriveSettings } from '@/lib/gdrive';

export async function POST() {
  try {
    const db = getDb();
    saveGDriveSettings(
      {
        gdrive_access_token: '',
        gdrive_refresh_token: '',
        gdrive_token_expires_at: 0,
        gdrive_user_email: '',
        gdrive_auto_backup: false,
        gdrive_last_backup_status: '',
        gdrive_last_backup_error: '',
      },
      db
    );

    return NextResponse.json({ success: true, message: 'Google Drive disconnected successfully.' });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
