import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getGDriveSettings } from '@/lib/gdrive';

export async function GET(req: Request) {
  try {
    req.headers.get('host'); // Force dynamic execution per request
    const db = getDb();
    const settings = getGDriveSettings(db);

    const hasDriveScope = settings.scope
      ? settings.scope.includes('drive')
      : !settings.lastBackupError?.toLowerCase().includes('insufficient authentication scopes');

    return NextResponse.json({
      connected: !!settings.refreshToken,
      email: settings.userEmail || undefined,
      autoBackup: settings.autoBackup,
      frequency: settings.frequency,
      retentionCount: settings.retentionCount,
      lastBackupTime: settings.lastBackupTime || undefined,
      lastBackupStatus: settings.lastBackupStatus,
      lastBackupError: settings.lastBackupError || undefined,
      clientIdConfigured: !!settings.clientId,
      hasClientSecret: !!settings.clientSecret,
      hasDriveScope,
      scope: settings.scope || undefined,
      scopeType: settings.scopeType || 'file',
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
