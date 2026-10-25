import { NextResponse } from 'next/server';
import { createUser, createSession, hasAnyUsers } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    // Only allow if no users exist
    if (hasAnyUsers()) {
      return NextResponse.json(
        { error: 'Setup has already been completed. Please log in.' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { name, username, email, password } = body;

    if (!name || !username || !email || !password) {
      return NextResponse.json(
        { error: 'All fields (name, username, email, password) are required.' },
        { status: 400 }
      );
    }

    // First user is automatically granted 'admin' role
    const user = createUser({
      name,
      username,
      email,
      password,
      role: 'admin',
    });

    // Automatically create session and log the admin in
    await createSession(user.id);

    return NextResponse.json({
      success: true,
      message: 'Master administrator account created successfully.',
      user,
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
