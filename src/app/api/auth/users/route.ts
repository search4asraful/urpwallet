import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAuth, createUser } from '@/lib/auth';
import { UserSafe } from '@/types';

// GET /api/auth/users (Admin only)
export async function GET() {
  try {
    const authResult = await requireAuth('admin');
    if (authResult.errorResponse) {
      return authResult.errorResponse;
    }

    const db = getDb();
    const users = db.prepare(`
      SELECT id, username, email, name, role, created_at, updated_at
      FROM users
      ORDER BY created_at ASC
    `).all() as UserSafe[];

    return NextResponse.json({ users });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

// POST /api/auth/users (Admin creates a new user)
export async function POST(req: Request) {
  try {
    const authResult = await requireAuth('admin');
    if (authResult.errorResponse) {
      return authResult.errorResponse;
    }

    const body = await req.json();
    const { name, username, email, password, role } = body;

    if (!name || !username || !email || !password) {
      return NextResponse.json(
        { error: 'All fields (name, username, email, password) are required.' },
        { status: 400 }
      );
    }

    const user = createUser({
      name,
      username,
      email,
      password,
      role: role === 'admin' ? 'admin' : 'member',
    });

    return NextResponse.json({
      success: true,
      message: 'User account created successfully.',
      user,
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
