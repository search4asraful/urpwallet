import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getGDriveSettings, getGoogleAuthUrl } from '@/lib/gdrive';

export async function GET(req: Request) {
  try {
    const db = getDb();
    const settings = getGDriveSettings(db);

    if (!settings.clientId) {
      return NextResponse.json(
        { error: 'Google Client ID is not configured. Please enter your Google OAuth Client ID in Settings first.' },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(req.url);
    const origin = req.headers.get('origin') || `${req.headers.get('x-forwarded-proto') || 'http'}://${req.headers.get('host')}`;
    const redirectUri = searchParams.get('redirectUri') || `${origin}/api/gdrive/callback`;
    const state = searchParams.get('state') || Buffer.from(JSON.stringify({ redirectUri })).toString('base64');

    const scopeType = (searchParams.get('scopeType') as 'file' | 'full') || settings.scopeType || 'file';
    const authUrl = getGoogleAuthUrl(settings.clientId, redirectUri, state, scopeType);
    return NextResponse.json({ authUrl, redirectUri });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
