import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { verifyPassword, createSession, sanitizeUser } from '@/lib/auth';
import { User } from '@/types';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { identifier, password } = body;

    if (!identifier || !password) {
      return NextResponse.json(
        { error: 'Username/email and password are required.' },
        { status: 400 }
      );
    }

    const cleanIdentifier = String(identifier).trim().toLowerCase();
    const db = getDb();

    // Query user by username or email
    const user = db.prepare(`
      SELECT * FROM users
      WHERE LOWER(username) = ? OR LOWER(email) = ?
    `).get(cleanIdentifier, cleanIdentifier) as User | undefined;

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid username or password.' },
        { status: 401 }
      );
    }

    // Verify password using the user's unique cryptographic salt
    const isValid = verifyPassword(String(password), user.password_salt, user.password_hash);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid username or password.' },
        { status: 401 }
      );
    }

    // Create session and set HttpOnly cookie
    await createSession(user.id);

    return NextResponse.json({
      success: true,
      message: 'Logged in successfully.',
      user: sanitizeUser(user),
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
