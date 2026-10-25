import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { User } from '@/types';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// PATCH /api/auth/users/[id] (Change user role)
export async function PATCH(req: Request, { params }: RouteParams) {
  try {
    const authResult = await requireAuth('admin');
    if (authResult.errorResponse) {
      return authResult.errorResponse;
    }

    const { id } = await params;
    const currentAdmin = authResult.user;

    // Prevent changing own role
    if (id === currentAdmin.id) {
      return NextResponse.json(
        { error: 'You cannot change your own role.' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { role } = body;

    if (role !== 'admin' && role !== 'member') {
      return NextResponse.json({ error: 'Role must be either "admin" or "member".' }, { status: 400 });
    }

    const db = getDb();
    const targetUser = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as User | undefined;
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    // If demoting an admin to member, ensure at least one other admin remains
    if (targetUser.role === 'admin' && role === 'member') {
      const adminCountRow = db.prepare('SELECT COUNT(*) as count FROM users WHERE role = ?').get('admin') as { count: number };
      if ((adminCountRow?.count ?? 0) <= 1) {
        return NextResponse.json(
          { error: 'Cannot demote the last remaining administrator.' },
          { status: 400 }
        );
      }
    }

    const now = new Date().toISOString();
    db.prepare('UPDATE users SET role = ?, updated_at = ? WHERE id = ?').run(role, now, id);

    return NextResponse.json({
      success: true,
      message: `User role updated to ${role}.`,
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

// DELETE /api/auth/users/[id] (Delete user)
export async function DELETE(req: Request, { params }: RouteParams) {
  try {
    const authResult = await requireAuth('admin');
    if (authResult.errorResponse) {
      return authResult.errorResponse;
    }

    const { id } = await params;
    const currentAdmin = authResult.user;

    // Prevent deleting oneself
    if (id === currentAdmin.id) {
      return NextResponse.json(
        { error: 'You cannot delete your own active administrator account.' },
        { status: 400 }
      );
    }

    const db = getDb();
    const targetUser = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as User | undefined;
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    // Prevent deleting the last admin
    if (targetUser.role === 'admin') {
      const adminCountRow = db.prepare('SELECT COUNT(*) as count FROM users WHERE role = ?').get('admin') as { count: number };
      if ((adminCountRow?.count ?? 0) <= 1) {
        return NextResponse.json(
          { error: 'Cannot delete the last remaining administrator.' },
          { status: 400 }
        );
      }
    }

    // Delete user (sessions will cascade delete via foreign key)
    db.prepare('DELETE FROM users WHERE id = ?').run(id);

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully.',
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
