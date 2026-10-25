import crypto from 'crypto';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { User, UserSafe, UserRole } from '@/types';

export const SESSION_COOKIE_NAME = 'urpwallet_session';
export const SESSION_DURATION_DAYS = 7;

/**
 * Generates a cryptographically secure random salt.
 * Uses 16 bytes (128 bits) of cryptographic randomness.
 */
export function generateSalt(bytes = 16): string {
  return crypto.randomBytes(bytes).toString('hex');
}

/**
 * Hashes a password using scrypt with a unique per-user cryptographic salt.
 * scrypt is a memory-hard key derivation function recommended by OWASP.
 */
export function hashPassword(password: string, salt: string): string {
  if (!password || !salt) {
    throw new Error('Password and salt are required for hashing');
  }
  // 64-byte key length derived with scrypt
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

/**
 * Constant-time password verification to prevent timing attacks.
 */
export function verifyPassword(password: string, salt: string, storedHash: string): boolean {
  if (!password || !salt || !storedHash) {
    return false;
  }
  try {
    const candidateHash = hashPassword(password, salt);
    const candidateBuf = Buffer.from(candidateHash, 'hex');
    const storedBuf = Buffer.from(storedHash, 'hex');

    if (candidateBuf.length !== storedBuf.length) {
      return false;
    }
    return crypto.timingSafeEqual(candidateBuf, storedBuf);
  } catch {
    return false;
  }
}

/**
 * Strips sensitive security fields (password_hash, password_salt) before returning user data.
 */
export function sanitizeUser(user: User): UserSafe {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password_hash, password_salt, ...safeUser } = user;
  return safeUser;
}

/**
 * Checks whether any users exist in the database (used for setup onboarding).
 */
export function hasAnyUsers(): boolean {
  try {
    const db = getDb();
    const result = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
    return (result?.count ?? 0) > 0;
  } catch {
    return false;
  }
}

/**
 * Creates a new user with a unique cryptographic salt and hashed password.
 */
export function createUser(data: {
  name: string;
  username: string;
  email: string;
  password: string;
  role?: UserRole;
}): UserSafe {
  const db = getDb();
  const now = new Date().toISOString();
  const userId = `usr_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  
  // Clean inputs
  const cleanUsername = data.username.trim().toLowerCase();
  const cleanEmail = data.email.trim().toLowerCase();
  const cleanName = data.name.trim();

  // Validate format
  if (cleanUsername.length < 3) {
    throw new Error('Username must be at least 3 characters long');
  }
  if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
    throw new Error('Invalid email address format');
  }
  if (data.password.length < 8) {
    throw new Error('Password must be at least 8 characters long');
  }

  // Check for uniqueness
  const existing = db.prepare('SELECT id FROM users WHERE username = ? OR email = ?').get(cleanUsername, cleanEmail);
  if (existing) {
    throw new Error('Username or email is already registered');
  }

  // Generate 128-bit cryptographic salt & hash
  const salt = generateSalt(16);
  const passwordHash = hashPassword(data.password, salt);
  const role: UserRole = data.role || 'member';

  const stmt = db.prepare(`
    INSERT INTO users (id, username, email, name, password_hash, password_salt, role, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(userId, cleanUsername, cleanEmail, cleanName, passwordHash, salt, role, now, now);

  return {
    id: userId,
    username: cleanUsername,
    email: cleanEmail,
    name: cleanName,
    role,
    created_at: now,
    updated_at: now,
  };
}

/**
 * Creates a database-backed session and sets a secure HttpOnly cookie.
 */
export async function createSession(userId: string): Promise<string> {
  const db = getDb();
  const sessionId = `sess_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
  const token = crypto.randomBytes(32).toString('hex');
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000);

  const stmt = db.prepare(`
    INSERT INTO sessions (id, user_id, token, expires_at, created_at)
    VALUES (?, ?, ?, ?, ?)
  `);
  stmt.run(sessionId, userId, token, expiresAt.toISOString(), now.toISOString());

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires: expiresAt,
    path: '/',
  });

  return token;
}

/**
 * Retrieves the currently authenticated user by validating the session cookie against the database.
 */
export async function getCurrentUser(): Promise<UserSafe | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return null;

    const db = getDb();
    const now = new Date().toISOString();

    const session = db.prepare(`
      SELECT s.*, u.*
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.token = ? AND s.expires_at > ?
    `).get(token, now) as (User & { token: string; expires_at: string }) | undefined;

    if (!session) {
      return null;
    }

    return sanitizeUser(session);
  } catch {
    return null;
  }
}

/**
 * Destroys the current user session in the database and clears the cookie.
 */
export async function destroySession(): Promise<void> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (token) {
      const db = getDb();
      db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
    }
    cookieStore.delete(SESSION_COOKIE_NAME);
  } catch {
    // Ignore error
  }
}

/**
 * Helper to enforce authentication and authorization (role check) in Next.js Route Handlers.
 */
export async function requireAuth(minRole: UserRole = 'member'): Promise<
  { user: UserSafe; errorResponse: null } | { user: null; errorResponse: NextResponse }
> {
  const user = await getCurrentUser();

  if (!user) {
    return {
      user: null,
      errorResponse: NextResponse.json(
        { error: 'Unauthorized: Authentication required' },
        { status: 401 }
      ),
    };
  }

  if (minRole === 'admin' && user.role !== 'admin') {
    return {
      user: null,
      errorResponse: NextResponse.json(
        { error: 'Forbidden: Administrator privileges required' },
        { status: 403 }
      ),
    };
  }

  return { user, errorResponse: null };
}
