import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { downloadGDriveBackup } from '@/lib/gdrive';
import { POST as importPost } from '@/app/api/import/route';

export async function POST(req: Request) {
  try {
    const db = getDb();
    const body = await req.json();
    const { fileId, mode } = body;

    if (!fileId) {
      return NextResponse.json({ error: 'fileId is required to restore backup' }, { status: 400 });
    }

    // 1. Download backup from Google Drive
    const backupData = await downloadGDriveBackup(fileId, db);

    // 2. Delegate to the import engine for atomic database restoration
    const importReq = new Request('http://localhost:3000/api/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: backupData,
        mode: mode || 'merge',
        format: 'json',
      }),
    });

    const importRes = await importPost(importReq);
    const result = await importRes.json();

    if (!importRes.ok) {
      throw new Error(result.error || 'Failed to restore backup data');
    }

    return NextResponse.json({
      success: true,
      message: 'Backup successfully restored from Google Drive.',
      imported: result.imported,
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
