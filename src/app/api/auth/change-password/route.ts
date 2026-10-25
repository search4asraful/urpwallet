import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAuth, verifyPassword, generateSalt, hashPassword } from '@/lib/auth';
import { User } from '@/types';

export async function POST(req: Request) {
  try {
    const authResult = await requireAuth();
    if (authResult.errorResponse) {
      return authResult.errorResponse;
    }

    const { user } = authResult;
    const body = await req.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Current password and new password are required.' },
        { status: 400 }
      );
    }

    if (String(newPassword).length < 8) {
      return NextResponse.json(
        { error: 'New password must be at least 8 characters long.' },
        { status: 400 }
      );
    }

    const db = getDb();
    const fullUser = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id) as User | undefined;
    if (!fullUser) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    // Verify current password with current cryptographic salt
    const isCurrentValid = verifyPassword(String(currentPassword), fullUser.password_salt, fullUser.password_hash);
    if (!isCurrentValid) {
      return NextResponse.json(
        { error: 'Incorrect current password.' },
        { status: 400 }
      );
    }

    // Generate a fresh new cryptographic salt for the new password
    const newSalt = generateSalt(16);
    const newHash = hashPassword(String(newPassword), newSalt);
    const now = new Date().toISOString();

    db.prepare(`
      UPDATE users
      SET password_hash = ?, password_salt = ?, updated_at = ?
      WHERE id = ?
    `).run(newHash, newSalt, now, user.id);

    return NextResponse.json({
      success: true,
      message: 'Password updated successfully with new cryptographic salt.',
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
