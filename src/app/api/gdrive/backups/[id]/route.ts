import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { deleteGDriveBackup } from '@/lib/gdrive';

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();
    await deleteGDriveBackup(id, db);
    return NextResponse.json({ success: true, message: 'Backup deleted successfully from Google Drive.' });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
