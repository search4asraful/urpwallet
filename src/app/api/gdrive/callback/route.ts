import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getGDriveSettings, saveGDriveSettings, exchangeCodeForTokens } from '@/lib/gdrive';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');
  const state = url.searchParams.get('state');

  const origin = `${req.headers.get('x-forwarded-proto') || 'http'}://${req.headers.get('host')}`;

  if (error) {
    return NextResponse.redirect(`${origin}/?gdrive_error=${encodeURIComponent(error)}`);
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/?gdrive_error=missing_code`);
  }

  try {
    const db = getDb();
    const settings = getGDriveSettings(db);

    if (!settings.clientId || !settings.clientSecret) {
      return NextResponse.redirect(`${origin}/?gdrive_error=missing_credentials`);
    }

    let redirectUri = `${origin}/api/gdrive/callback`;
    if (state) {
      try {
        const decoded = JSON.parse(Buffer.from(state, 'base64').toString('utf-8'));
        if (decoded.redirectUri) {
          redirectUri = decoded.redirectUri;
        }
      } catch {
        // Fallback to origin callback
      }
    }

    const { accessToken, refreshToken, expiresAt, email, scope } = await exchangeCodeForTokens(
      code,
      settings.clientId,
      settings.clientSecret,
      redirectUri
    );

    const updates: Record<string, string | number | boolean> = {
      gdrive_access_token: accessToken,
      gdrive_token_expires_at: expiresAt,
      gdrive_scope: scope || '',
      gdrive_last_backup_error: '',
    };

    if (refreshToken) {
      updates.gdrive_refresh_token = refreshToken;
    }
    if (email) {
      updates.gdrive_user_email = email;
    }

    saveGDriveSettings(updates, db);

    return NextResponse.redirect(`${origin}/?gdrive=connected`);
  } catch (err: unknown) {
    const msg = (err as Error).message || 'Failed to connect Google Drive';
    return NextResponse.redirect(`${origin}/?gdrive_error=${encodeURIComponent(msg)}`);
  }
}
