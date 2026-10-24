import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { saveGDriveSettings } from '@/lib/gdrive';

export async function POST(req: Request) {
  try {
    const db = getDb();
    const body = await req.json();

    const updates: Record<string, string | number | boolean> = {};

    if (body.clientId !== undefined) updates.gdrive_client_id = body.clientId.trim();
    if (body.clientSecret !== undefined) updates.gdrive_client_secret = body.clientSecret.trim();
    if (body.autoBackup !== undefined) updates.gdrive_auto_backup = Boolean(body.autoBackup);
    if (body.frequency !== undefined) updates.gdrive_backup_frequency = String(body.frequency);
    if (body.retentionCount !== undefined) updates.gdrive_retention_count = Number(body.retentionCount);
    if (body.scopeType !== undefined) updates.gdrive_scope_type = String(body.scopeType);

    saveGDriveSettings(updates, db);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
