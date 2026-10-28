import { getDb } from '@/lib/db';
import Database from 'better-sqlite3';

export interface GDriveTokens {
  access_token: string;
  refresh_token?: string;
  expires_at: number;
}

export interface GDriveConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface GDriveFileInfo {
  id: string;
  name: string;
  size?: string;
  createdTime?: string;
  modifiedTime?: string;
}

export interface GDriveStatus {
  connected: boolean;
  email?: string;
  autoBackup: boolean;
  frequency: string; // 'hourly' | 'every_6h' | 'daily' | 'weekly' | 'manual'
  retentionCount: number;
  lastBackupTime?: string;
  lastBackupStatus?: 'success' | 'error';
  lastBackupError?: string;
  clientIdConfigured: boolean;
  hasClientSecret: boolean;
  hasDriveScope?: boolean;
  scope?: string;
  backupCount?: number;
}

const GDRIVE_FOLDER_NAME = 'urpwallet_backups';

/**
 * Retrieve Google Drive settings from SQLite database
 */
export function getGDriveSettings(db: Database.Database = getDb()) {
  const rows = db.prepare(`
    SELECT key, value FROM settings WHERE key LIKE 'gdrive_%'
  `).all() as { key: string; value: string }[];

  const map: Record<string, string> = {};
  rows.forEach((r) => {
    map[r.key] = r.value;
  });

  return {
    clientId: map['gdrive_client_id'] || process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: map['gdrive_client_secret'] || process.env.GOOGLE_CLIENT_SECRET || '',
    accessToken: map['gdrive_access_token'] || '',
    refreshToken: map['gdrive_refresh_token'] || '',
    tokenExpiresAt: map['gdrive_token_expires_at'] ? Number(map['gdrive_token_expires_at']) : 0,
    userEmail: map['gdrive_user_email'] || '',
    folderId: map['gdrive_folder_id'] || '',
    scope: map['gdrive_scope'] || '',
    scopeType: (map['gdrive_scope_type'] as 'file' | 'full') || 'file',
    autoBackup: map['gdrive_auto_backup'] === 'true',
    frequency: map['gdrive_backup_frequency'] || 'daily',
    retentionCount: map['gdrive_retention_count'] ? Number(map['gdrive_retention_count']) : 10,
    lastBackupTime: map['gdrive_last_backup_time'] || '',
    lastBackupStatus: (map['gdrive_last_backup_status'] as 'success' | 'error') || undefined,
    lastBackupError: map['gdrive_last_backup_error'] || '',
  };
}

/**
 * Save Google Drive settings into SQLite database
 */
export function saveGDriveSettings(settings: Record<string, string | number | boolean>, db: Database.Database = getDb()) {
  const stmt = db.prepare(`
    INSERT INTO settings (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `);

  const tx = db.transaction(() => {
    for (const [key, value] of Object.entries(settings)) {
      stmt.run(key, String(value));
    }
  });

  tx();
}

/**
 * Generate Google OAuth 2.0 authorization URL
 */
export function getGoogleAuthUrl(
  clientId: string,
  redirectUri: string,
  state?: string,
  scopeType: 'file' | 'full' = 'file'
): string {
  const driveScope = scopeType === 'full'
    ? 'https://www.googleapis.com/auth/drive'
    : 'https://www.googleapis.com/auth/drive.file';

  const scopes = [
    driveScope,
    'https://www.googleapis.com/auth/userinfo.email',
  ].join(' ');

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: scopes,
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
  });

  if (state) {
    params.set('state', state);
  }

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * Exchange OAuth 2.0 authorization code for tokens
 */
export async function exchangeCodeForTokens(
  code: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string
): Promise<{ accessToken: string; refreshToken?: string; expiresAt: number; email?: string; scope?: string }> {
  const params = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  });

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error_description || data.error || 'Failed to exchange Google OAuth code');
  }

  const accessToken = data.access_token as string;
  const refreshToken = data.refresh_token as string | undefined;
  const scope = (data.scope as string) || '';
  const expiresIn = (data.expires_in as number) || 3600;
  const expiresAt = Date.now() + (expiresIn - 120) * 1000; // 2 min safety margin

  // Verify that Google Drive permission was actually checked/granted by the user
  if (!scope.includes('drive')) {
    throw new Error(
      'Google Drive permission was NOT granted. On Google\'s authorization screen, you must check the checkbox next to Google Drive ("See, edit, create, and delete files") before clicking Continue.'
    );
  }

  // Fetch user profile email
  let email = '';
  try {
    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (userRes.ok) {
      const userData = await userRes.json();
      email = userData.email || '';
    }
  } catch {
    // Non-fatal if userinfo fails
  }

  return { accessToken, refreshToken, expiresAt, email, scope };
}

/**
 * Ensure valid access token, refreshing if necessary
 */
export async function getValidAccessToken(db: Database.Database = getDb()): Promise<string> {
  const settings = getGDriveSettings(db);

  if (!settings.refreshToken) {
    throw new Error('Google Drive is not connected (no refresh token found).');
  }

  // If token is still valid for at least 1 minute, use it
  if (settings.accessToken && settings.tokenExpiresAt > Date.now() + 60000) {
    return settings.accessToken;
  }

  if (!settings.clientId || !settings.clientSecret) {
    throw new Error('Google OAuth Client ID or Client Secret is missing.');
  }

  // Refresh token
  const params = new URLSearchParams({
    client_id: settings.clientId,
    client_secret: settings.clientSecret,
    refresh_token: settings.refreshToken,
    grant_type: 'refresh_token',
  });

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error_description || data.error || 'Failed to refresh Google access token');
  }

  const newAccessToken = data.access_token as string;
  const expiresIn = (data.expires_in as number) || 3600;
  const newExpiresAt = Date.now() + (expiresIn - 120) * 1000;

  saveGDriveSettings(
    {
      gdrive_access_token: newAccessToken,
      gdrive_token_expires_at: newExpiresAt,
    },
    db
  );

  return newAccessToken;
}

/**
 * Locate or create the urpwallet backup folder in Google Drive
 */
export async function getOrCreateBackupFolder(accessToken: string, db: Database.Database = getDb()): Promise<string> {
  const settings = getGDriveSettings(db);
  if (settings.folderId) {
    // Verify folder still exists and is accessible
    try {
      const checkRes = await fetch(
        `https://www.googleapis.com/drive/v3/files/${settings.folderId}?fields=id,trashed`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (checkRes.ok) {
        const folder = await checkRes.json();
        if (!folder.trashed) {
          return settings.folderId;
        }
      }
    } catch {
      // Re-create folder if deleted or unreachable
    }
  }

  // Search for folder by name
  const query = encodeURIComponent(`name = '${GDRIVE_FOLDER_NAME}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`);
  const searchRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (searchRes.ok) {
    const data = await searchRes.json();
    if (data.files && data.files.length > 0) {
      const folderId = data.files[0].id;
      saveGDriveSettings({ gdrive_folder_id: folderId }, db);
      return folderId;
    }
  }

  // Create folder
  const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: GDRIVE_FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder',
      description: 'Automated backups for urpwallet',
    }),
  });

  const newFolder = await createRes.json();
  if (!createRes.ok) {
    throw new Error(newFolder.error?.message || 'Failed to create backup folder on Google Drive');
  }

  const folderId = newFolder.id;
  saveGDriveSettings({ gdrive_folder_id: folderId }, db);
  return folderId;
}

/**
 * Generate full snapshot payload from database
 */
export function generateFullBackupPayload(db: Database.Database = getDb()) {
  const accounts = (db.prepare('SELECT id, name, type, currency, balance, color, icon, is_archived, created_at, updated_at FROM accounts').all() as Record<string, unknown>[]).map((a) => ({
    id: String(a.id),
    name: String(a.name),
    account_type: String(a.type),
    currency: String(a.currency),
    balance: Number(a.balance),
    color: String(a.color),
    icon: String(a.icon),
    is_archived: Boolean(a.is_archived),
    created_at: String(a.created_at),
    updated_at: String(a.updated_at),
  }));

  const categories = (db.prepare('SELECT id, name, type, icon, color, parent_id, created_at FROM categories').all() as Record<string, unknown>[]).map((c) => ({
    id: String(c.id),
    name: String(c.name),
    category_type: String(c.type),
    icon: String(c.icon),
    color: String(c.color),
    parent_id: c.parent_id ? String(c.parent_id) : null,
    created_at: String(c.created_at),
  }));

  const rawTransactions = db.prepare(`
    SELECT id, account_id, to_account_id, category_id, type, amount, currency,
           date, time, payee, note, status, payment_type, created_at
    FROM transactions
    ORDER BY date DESC, time DESC, created_at DESC
  `).all() as Record<string, unknown>[];

  const formattedTransactions = rawTransactions.map((t) => ({
    id: String(t.id),
    account_id: String(t.account_id),
    to_account_id: t.to_account_id ? String(t.to_account_id) : null,
    category_id: t.category_id ? String(t.category_id) : null,
    tx_type: String(t.type),
    amount: Number(t.amount),
    currency: String(t.currency),
    date: String(t.date),
    time: t.time ? String(t.time) : null,
    payee: t.payee ? String(t.payee) : null,
    note: t.note ? String(t.note) : null,
    status: String(t.status),
    payment_type: String(t.payment_type),
    created_at: String(t.created_at),
  }));

  const budgets = (db.prepare('SELECT id, name, amount, period, category_id, start_date, end_date, created_at FROM budgets').all() as Record<string, unknown>[]).map((b) => ({
    id: String(b.id),
    name: String(b.name),
    amount: Number(b.amount),
    period: String(b.period),
    category_id: b.category_id ? String(b.category_id) : null,
    start_date: String(b.start_date),
    end_date: String(b.end_date),
    created_at: String(b.created_at),
  }));

  const bills_subscriptions = (db.prepare('SELECT id, name, amount, type, account_id, category_id, payee, frequency, next_date, auto_record, is_active, created_at FROM bills_subscriptions').all() as Record<string, unknown>[]).map((b) => ({
    id: String(b.id),
    name: String(b.name),
    amount: Number(b.amount),
    bill_type: String(b.type),
    account_id: String(b.account_id),
    category_id: b.category_id ? String(b.category_id) : null,
    payee: b.payee ? String(b.payee) : null,
    frequency: String(b.frequency),
    next_date: String(b.next_date),
    auto_record: Boolean(b.auto_record),
    is_active: Boolean(b.is_active),
    created_at: String(b.created_at),
  }));

  const debts = (db.prepare('SELECT id, type, person_name, amount, settled_amount, due_date, notes, status, created_at FROM debts').all() as Record<string, unknown>[]).map((d) => ({
    id: String(d.id),
    debt_type: String(d.type),
    person_name: String(d.person_name),
    amount: Number(d.amount),
    settled_amount: Number(d.settled_amount),
    due_date: d.due_date ? String(d.due_date) : null,
    notes: d.notes ? String(d.notes) : null,
    status: String(d.status),
    created_at: String(d.created_at),
  }));

  const rawSettings = db.prepare('SELECT key, value FROM settings ORDER BY key ASC').all() as { key: string; value: string }[];
  const settings: [string, string][] = rawSettings.map((s) => [s.key, s.value]);

  return {
    exported_at: new Date().toISOString(),
    accounts,
    categories,
    transactions: formattedTransactions,
    budgets,
    bills_subscriptions,
    debts,
    settings,
  };
}

/**
 * Upload a JSON backup file to Google Drive
 */
export async function uploadBackupToGDrive(db: Database.Database = getDb()): Promise<{ fileId: string; name: string; size: number }> {
  try {
    const accessToken = await getValidAccessToken(db);
    const folderId = await getOrCreateBackupFolder(accessToken, db);

    const payload = generateFullBackupPayload(db);
    const content = JSON.stringify(payload, null, 2);
    const dateStamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `urpwallet_backup_${dateStamp}.json`;

    // Construct multipart/related upload body
    const boundary = '-------314159265358979323846';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const metadata = {
      name: filename,
      parents: [folderId],
      mimeType: 'application/json',
      description: `urpwallet automated backup created at ${new Date().toLocaleString()}`,
    };

    const multipartRequestBody =
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      'Content-Type: application/json\r\n\r\n' +
      content +
      closeDelimiter;

    const uploadRes = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,size,createdTime',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body: multipartRequestBody,
      }
    );

    const uploadedFile = await uploadRes.json();
    if (!uploadRes.ok) {
      throw new Error(uploadedFile.error?.message || 'Failed to upload backup to Google Drive');
    }

    const now = new Date().toISOString();
    saveGDriveSettings(
      {
        gdrive_last_backup_time: now,
        gdrive_last_backup_status: 'success',
        gdrive_last_backup_error: '',
      },
      db
    );

    // Prune older backups according to retention limit
    pruneOldBackups(accessToken, folderId, db).catch((err) => {
      console.warn('Backup retention pruning warning:', err);
    });

    return {
      fileId: uploadedFile.id,
      name: uploadedFile.name,
      size: Number(uploadedFile.size || content.length),
    };
  } catch (err: unknown) {
    let errorMsg = (err as Error).message || 'Failed to backup to Google Drive';
    if (errorMsg.toLowerCase().includes('insufficient authentication scopes') || errorMsg.includes('ACCESS_TOKEN_SCOPE_INSUFFICIENT')) {
      errorMsg = 'Google Drive permission missing: The Google Drive access checkbox was not checked during authorization. Please reconnect Google Drive, and make sure to check the Google Drive permissions box on Google\'s consent screen.';
    }
    saveGDriveSettings(
      {
        gdrive_last_backup_status: 'error',
        gdrive_last_backup_error: errorMsg,
      },
      db
    );
    throw new Error(errorMsg);
  }
}

/**
 * List backups currently saved in Google Drive folder
 */
export async function listGDriveBackups(db: Database.Database = getDb()): Promise<GDriveFileInfo[]> {
  const accessToken = await getValidAccessToken(db);
  const folderId = await getOrCreateBackupFolder(accessToken, db);

  const query = encodeURIComponent(`'${folderId}' in parents and trashed = false`);
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${query}&orderBy=createdTime desc&fields=files(id,name,size,createdTime,modifiedTime)&pageSize=100`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error?.message || 'Failed to list backups from Google Drive');
  }

  return (data.files || []) as GDriveFileInfo[];
}

/**
 * Download a backup file from Google Drive
 */
export async function downloadGDriveBackup(fileId: string, db: Database.Database = getDb()): Promise<Record<string, unknown>> {
  const accessToken = await getValidAccessToken(db);
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to download backup from Google Drive: ${errText}`);
  }

  return await res.json();
}

/**
 * Delete a specific backup file from Google Drive
 */
export async function deleteGDriveBackup(fileId: string, db: Database.Database = getDb()): Promise<void> {
  const accessToken = await getValidAccessToken(db);
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok && res.status !== 404) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error?.message || 'Failed to delete backup from Google Drive');
  }
}

/**
 * Prune old backups if backup count exceeds retention limit
 */
async function pruneOldBackups(accessToken: string, folderId: string, db: Database.Database): Promise<void> {
  try {
    const settings = getGDriveSettings(db);
    const retentionLimit = settings.retentionCount || 10;
    if (retentionLimit <= 0) return;

    const query = encodeURIComponent(`'${folderId}' in parents and trashed = false`);
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${query}&orderBy=createdTime desc&fields=files(id,name,createdTime)&pageSize=100`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!res.ok) return;
    const data = await res.json();
    const files = data.files || [];

    if (files.length > retentionLimit) {
      const filesToDelete = files.slice(retentionLimit);
      for (const f of filesToDelete) {
        await fetch(`https://www.googleapis.com/drive/v3/files/${f.id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${accessToken}` },
        }).catch(() => {});
      }
    }
  } catch (err) {
    console.error('Error during backup pruning:', err);
  }
}

/**
 * Check if a scheduled backup is due
 */
export function isBackupDue(db: Database.Database = getDb()): boolean {
  const settings = getGDriveSettings(db);
  if (!settings.autoBackup || !settings.refreshToken) {
    return false;
  }

  if (!settings.lastBackupTime) {
    return true;
  }

  const lastTime = new Date(settings.lastBackupTime).getTime();
  if (isNaN(lastTime)) return true;

  const now = Date.now();
  const diffMs = now - lastTime;

  switch (settings.frequency) {
    case 'hourly':
      return diffMs >= 60 * 60 * 1000;
    case 'every_6h':
      return diffMs >= 6 * 60 * 60 * 1000;
    case 'daily':
      return diffMs >= 24 * 60 * 60 * 1000;
    case 'weekly':
      return diffMs >= 7 * 24 * 60 * 60 * 1000;
    default:
      return false;
  }
}
