'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Cloud, CloudUpload, CloudDownload, CloudOff, RefreshCw,
  CheckCircle2, AlertCircle, Trash2, ExternalLink,
  ShieldCheck, Database, HardDrive, Settings, HelpCircle,
  RotateCcw
} from 'lucide-react';
import { Modal, Button, Badge, Input, Select } from '@/components/ui';

interface GDriveStatus {
  connected: boolean;
  email?: string;
  autoBackup: boolean;
  frequency: string;
  retentionCount: number;
  lastBackupTime?: string;
  lastBackupStatus?: 'success' | 'error';
  lastBackupError?: string;
  clientIdConfigured: boolean;
  hasClientSecret: boolean;
  hasDriveScope?: boolean;
  scope?: string;
  scopeType?: string;
}

interface BackupFile {
  id: string;
  name: string;
  size?: string;
  createdTime?: string;
  modifiedTime?: string;
}

interface GoogleDriveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataRestored?: () => void;
}

export const GoogleDriveModal: React.FC<GoogleDriveModalProps> = ({
  isOpen,
  onClose,
  onDataRestored,
}) => {
  const [activeTab, setActiveTab] = useState<'backups' | 'settings'>('backups');
  const [status, setStatus] = useState<GDriveStatus | null>(null);
  const [backups, setBackups] = useState<BackupFile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Configuration Form State
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [autoBackup, setAutoBackup] = useState(true);
  const [frequency, setFrequency] = useState('daily');
  const [retentionCount, setRetentionCount] = useState('10');
  const [scopeType, setScopeType] = useState<'file' | 'full'>('file');
  const [showSetupGuide, setShowSetupGuide] = useState(false);

  // Restore Confirmation State
  const [selectedBackupForRestore, setSelectedBackupForRestore] = useState<BackupFile | null>(null);
  const [restoreMode, setRestoreMode] = useState<'merge' | 'replace'>('merge');

  // Load Status and Backups
  const fetchStatusAndBackups = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/gdrive/status');
      const data: GDriveStatus = await res.json();
      setStatus(data);

      setAutoBackup(data.autoBackup);
      setFrequency(data.frequency || 'daily');
      setRetentionCount(String(data.retentionCount || 10));
      if (data.scopeType) {
        setScopeType(data.scopeType as 'file' | 'full');
      }

      if (data.connected) {
        const backupsRes = await fetch('/api/gdrive/backups');
        if (backupsRes.ok) {
          const backupsData = await backupsRes.json();
          setBackups(backupsData.backups || []);
        }
      }
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to fetch Google Drive status');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchStatusAndBackups();
    }
  }, [isOpen, fetchStatusAndBackups]);

  // Connect Google Drive (OAuth Flow)
  const handleConnect = async () => {
    setActionLoading(true);
    setError(null);
    try {
      if (clientId.trim() || clientSecret.trim()) {
        const configRes = await fetch('/api/gdrive/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientId: clientId.trim(),
            clientSecret: clientSecret.trim(),
            scopeType,
          }),
        });
        if (!configRes.ok) {
          const cfgData = await configRes.json();
          throw new Error(cfgData.error || 'Failed to save Google credentials');
        }
      }

      const origin = window.location.origin;
      const redirectUri = `${origin}/api/gdrive/callback`;
      const authRes = await fetch(
        `/api/gdrive/auth-url?redirectUri=${encodeURIComponent(redirectUri)}&scopeType=${scopeType}`
      );
      const authData = await authRes.json();

      if (!authRes.ok) {
        throw new Error(authData.error || 'Failed to initiate Google authorization');
      }

      window.location.href = authData.authUrl;
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to start Google Drive authorization');
      setActionLoading(false);
    }
  };

  // Disconnect Google Drive
  const handleDisconnect = async () => {
    if (!confirm('Disconnect Google Drive? Your local data will not be affected.')) {
      return;
    }
    setActionLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/gdrive/disconnect', { method: 'POST' });
      if (!res.ok) throw new Error('Failed to disconnect');
      setSuccessMsg('Google Drive disconnected.');
      await fetchStatusAndBackups();
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to disconnect');
    } finally {
      setActionLoading(false);
    }
  };

  // Save Schedule Settings
  const handleSaveSchedule = async (newAuto = autoBackup, newFreq = frequency, newRetention = retentionCount) => {
    setActionLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await fetch('/api/gdrive/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          autoBackup: newAuto,
          frequency: newFreq,
          retentionCount: Number(newRetention),
        }),
      });
      if (!res.ok) throw new Error('Failed to save settings');
      setSuccessMsg('Schedule updated.');
      await fetchStatusAndBackups();
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to update schedule');
    } finally {
      setActionLoading(false);
    }
  };

  // Trigger Immediate Backup Now
  const handleBackupNow = async () => {
    setActionLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await fetch('/api/gdrive/backup', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Backup failed');
      setSuccessMsg('Backup snapshot created successfully.');
      await fetchStatusAndBackups();
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to perform backup');
    } finally {
      setActionLoading(false);
    }
  };

  // Restore Backup
  const handleExecuteRestore = async () => {
    if (!selectedBackupForRestore) return;
    setActionLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await fetch('/api/gdrive/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId: selectedBackupForRestore.id,
          mode: restoreMode,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Restore failed');
      setSuccessMsg('Backup restored into your ledger successfully.');
      setSelectedBackupForRestore(null);
      if (onDataRestored) {
        onDataRestored();
      }
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to restore backup');
    } finally {
      setActionLoading(false);
    }
  };

  // Delete Backup File
  const handleDeleteBackup = async (fileId: string, fileName: string) => {
    if (!confirm(`Delete snapshot "${fileName}" from Google Drive?`)) return;
    setActionLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/gdrive/backups/${fileId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete backup file');
      setBackups((prev) => prev.filter((b) => b.id !== fileId));
      setSuccessMsg('Snapshot removed.');
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to delete backup file');
    } finally {
      setActionLoading(false);
    }
  };

  const formatFileSize = (bytesStr?: string) => {
    if (!bytesStr) return '—';
    const bytes = parseInt(bytesStr, 10);
    if (isNaN(bytes)) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const formatDateTime = (isoStr?: string) => {
    if (!isoStr) return 'Never';
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoStr;
    }
  };

  const redirectUriPreview = typeof window !== 'undefined'
    ? `${window.location.origin}/api/gdrive/callback`
    : 'http://localhost:9008/api/gdrive/callback';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Google Drive Cloud Sync"
      maxWidth="lg"
    >
      <div className="p-4 sm:p-5 space-y-4">
        {/* Banner Alerts */}
        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/25 rounded-xl text-rose-500 text-xs flex items-center justify-between gap-2 animate-in fade-in">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError(null)} className="text-xs hover:underline shrink-0">Dismiss</button>
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/25 rounded-xl text-emerald-500 text-xs flex items-center justify-between gap-2 animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg(null)} className="text-xs hover:underline shrink-0">Dismiss</button>
          </div>
        )}

        {/* Scope Missing Warning Banner */}
        {status?.connected && status?.hasDriveScope === false && (
          <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs space-y-2 text-amber-500 animate-in fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Google Drive Permission Missing</span>
              </div>
              <Button
                size="xs"
                variant="primary"
                onClick={handleConnect}
                disabled={actionLoading}
              >
                <RefreshCw className={`w-3 h-3 ${actionLoading ? 'animate-spin' : ''}`} />
                <span>Reconnect</span>
              </Button>
            </div>
            <p className="text-[11px] text-theme-muted leading-relaxed">
              Google connected your account without file permissions. Click <strong>Reconnect</strong> and make sure to check the box:
              <span className="block mt-1 font-semibold text-amber-400">
                ☑️ &quot;See, edit, create, and delete only the specific Google Drive files you use with this app&quot;
              </span>
            </p>
          </div>
        )}

        {/* CONNECTED STATE */}
        {status?.connected ? (
          <div className="space-y-4">
            {/* Compact Header Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-500 shrink-0">
                  <Cloud className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-theme-main truncate max-w-55">
                      {status.email || 'Google Drive'}
                    </span>
                    <Badge variant={status.hasDriveScope !== false ? 'success' : 'amber'} size="sm">
                      {status.hasDriveScope !== false ? 'Connected' : 'Missing Scope'}
                    </Badge>
                  </div>
                  <div className="text-[11px] text-theme-muted flex items-center gap-2 mt-0.5">
                    <span>Last synced: {formatDateTime(status.lastBackupTime)}</span>
                    {status.autoBackup && (
                      <>
                        <span>•</span>
                        <span className="text-emerald-500 font-medium capitalize">Auto ({status.frequency})</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                <Button
                  size="sm"
                  variant="primary"
                  onClick={handleBackupNow}
                  disabled={actionLoading || status.hasDriveScope === false}
                  className="h-8 text-xs px-3 shadow-xs"
                >
                  <CloudUpload className={`w-3.5 h-3.5 ${actionLoading ? 'animate-spin' : ''}`} />
                  <span>Backup Now</span>
                </Button>
              </div>
            </div>

            {/* Segmented View Switcher */}
            <div className="flex items-center justify-between">
              <div className="flex p-0.5 rounded-lg border border-theme bg-theme-base/60 text-xs space-x-1.5">
                <button
                  type="button"
                  onClick={() => setActiveTab('backups')}
                  className={`px-3 py-1.5 rounded-md font-medium transition-all flex items-center gap-1.5 ${
                    activeTab === 'backups'
                      ? 'bg-emerald-500 text-emerald-500 font-bold text-theme-main shadow-xs'
                      : 'bg-theme-base text-theme-muted hover:text-theme-main'
                  }`}
                >
                  <HardDrive className="w-3.5 h-3.5" />
                  <span>Snapshots</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-theme-base text-theme-muted">
                    {backups.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('settings')}
                  className={`px-3 py-1 rounded-md font-medium transition-all flex items-center gap-1.5 ${
                    activeTab === 'settings'
                      ? 'bg-emerald-500 text-emerald-500 font-bold text-theme-main shadow-xs'
                      : 'bg-theme-base text-theme-muted hover:text-theme-main'
                  }`}
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>Auto-Sync &amp; Settings</span>
                </button>
              </div>

              {activeTab === 'backups' && (
                <button
                  onClick={fetchStatusAndBackups}
                  disabled={loading}
                  title="Refresh Drive snapshots"
                  className="p-1.5 text-theme-muted hover:text-theme-main rounded-lg hover:bg-theme-base/50 transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                </button>
              )}
            </div>

            {/* TAB 1: SNAPSHOTS LIST */}
            {activeTab === 'backups' && (
              <div className="space-y-3">
                {/* Restore Confirmation Strip */}
                {selectedBackupForRestore && (
                  <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-2.5 animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-bold text-theme-main flex items-center gap-1.5">
                        <RotateCcw className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Restore Snapshot: {selectedBackupForRestore.name}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => setRestoreMode('merge')}
                        className={`p-2 rounded-lg border text-left transition-all ${
                          restoreMode === 'merge'
                            ? 'border-emerald-500 bg-emerald-500/10 text-theme-main font-semibold'
                            : 'border-theme-base bg-theme-surface text-theme-muted hover:bg-theme-base/40'
                        }`}
                      >
                        <div>Merge (Safe)</div>
                        <div className="text-[10px] text-theme-muted font-normal mt-0.5">
                          Preserves current data; appends/updates.
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setRestoreMode('replace')}
                        className={`p-2 rounded-lg border text-left transition-all ${
                          restoreMode === 'replace'
                            ? 'border-amber-500 bg-amber-500/10 text-amber-500 font-semibold'
                            : 'border-theme-base bg-theme-surface text-theme-muted hover:bg-theme-base/40'
                        }`}
                      >
                        <div>Full Replace</div>
                        <div className="text-[10px] text-theme-muted font-normal mt-0.5">
                          Wipes local ledger &amp; loads snapshot.
                        </div>
                      </button>
                    </div>

                    <div className="flex justify-end gap-2 pt-0.5">
                      <Button
                        size="xs"
                        variant="ghost"
                        onClick={() => setSelectedBackupForRestore(null)}
                        disabled={actionLoading}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="xs"
                        variant="primary"
                        onClick={handleExecuteRestore}
                        disabled={actionLoading}
                      >
                        {actionLoading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <ShieldCheck className="w-3 h-3" />}
                        <span>Confirm Restore</span>
                      </Button>
                    </div>
                  </div>
                )}

                {/* Backups List */}
                {loading ? (
                  <div className="py-10 flex flex-col items-center justify-center text-theme-muted">
                    <RefreshCw className="w-5 h-5 animate-spin mb-2 text-emerald-500" />
                    <span className="text-xs">Fetching Google Drive snapshots...</span>
                  </div>
                ) : backups.length === 0 ? (
                  <div className="py-8 px-4 text-center rounded-xl border border-dashed border-theme-base bg-theme-surface/50">
                    <Database className="w-8 h-8 mx-auto text-theme-muted/50 mb-2" />
                    <h5 className="text-xs font-semibold text-theme-main mb-1">No Snapshots on Google Drive</h5>
                    <p className="text-[11px] text-theme-muted max-w-xs mx-auto mb-3">
                      Your backup folder is currently empty. Click &quot;Backup Now&quot; above to create your first cloud snapshot.
                    </p>
                    <Button size="xs" variant="primary" onClick={handleBackupNow} disabled={actionLoading}>
                      <CloudUpload className="w-3 h-3" />
                      <span>Create First Snapshot</span>
                    </Button>
                  </div>
                ) : (
                  <div className="max-h-75 overflow-y-auto space-y-1.5 pr-1">
                    {backups.map((b) => (
                      <div
                        key={b.id}
                        className="px-3 py-2.5 rounded-xl bg-theme-subtle hover:border-theme-muted/40 transition-colors flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-theme-main truncate text-xs">
                            {formatDateTime(b.createdTime || b.modifiedTime)}
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-theme-muted font-mono mt-0.5 truncate">
                            <span className="truncate">{b.name}</span>
                            <span>•</span>
                            <span className="shrink-0">{formatFileSize(b.size)}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            size="xs"
                            variant="secondary"
                            onClick={() => {
                              setSelectedBackupForRestore(b);
                              setRestoreMode('merge');
                            }}
                            disabled={actionLoading}
                            className="h-7 px-2 text-[11px]"
                          >
                            <CloudDownload className="w-3 h-3 text-emerald-500" />
                          </Button>
                          <Button
                            size="xs"
                            variant="rose-subtle"
                            onClick={() => handleDeleteBackup(b.id, b.name)}
                            disabled={actionLoading}
                            title="Delete snapshot"
                            className="h-7 px-2 text-[11px]"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: SETTINGS & SCHEDULE */}
            {activeTab === 'settings' && (
              <div className="space-y-2 animate-in fade-in">
                {/* Auto Backup Box */}
                <div className="p-3.5 rounded-xl bg-theme-subtle space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-theme-main">Scheduled Auto-Backup</div>
                      <div className="text-[11px] text-theme-muted">Automatically sync database in background</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={autoBackup}
                        onChange={(e) => {
                          const val = e.target.checked;
                          setAutoBackup(val);
                          handleSaveSchedule(val, frequency, retentionCount);
                        }}
                      />
                      <div className="w-9 h-5 bg-zinc-700/50 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                    </label>
                  </div>

                  {autoBackup && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-theme text-xs">
                      <div>
                        <label className="block text-[11px] font-medium text-theme-muted mb-1">
                          Frequency
                        </label>
                        <Select
                          value={frequency}
                          onChange={(e) => {
                            const val = e.target.value;
                            setFrequency(val);
                            handleSaveSchedule(autoBackup, val, retentionCount);
                          }}
                        >
                          <option value="hourly">Hourly</option>
                          <option value="every_6h">Every 6 Hours</option>
                          <option value="daily">Daily (24h) - Recommended</option>
                          <option value="weekly">Weekly</option>
                        </Select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-theme-muted mb-1">
                          Retention Limit
                        </label>
                        <Select
                          value={retentionCount}
                          onChange={(e) => {
                            const val = e.target.value;
                            setRetentionCount(val);
                            handleSaveSchedule(autoBackup, frequency, val);
                          }}
                        >
                          <option value="5">Keep last 5 snapshots</option>
                          <option value="10">Keep last 10 snapshots</option>
                          <option value="20">Keep last 20 snapshots</option>
                          <option value="30">Keep last 30 snapshots</option>
                        </Select>
                      </div>
                    </div>
                  )}
                </div>

                {/* Account & Connection Settings */}
                <div className="p-3.5 rounded-xl bg-theme-subtle flex items-center justify-between gap-3 text-xs">
                  <div>
                    <div className="font-medium text-theme-main">{status.email || 'Google Drive'}</div>
                    <div className="text-[10px] text-theme-muted font-mono truncate max-w-60">
                      Scope: {status.scopeType === 'full' ? 'drive (Full)' : 'drive.file (App Folder)'}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="xs"
                      variant="secondary"
                      onClick={handleConnect}
                      disabled={actionLoading}
                      title="Re-authorize with Google"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Re-auth</span>
                    </Button>

                    <Button
                      size="xs"
                      variant="danger"
                      onClick={handleDisconnect}
                      disabled={actionLoading}
                    >
                      <CloudOff className="w-3 h-3" />
                      <span>Disconnect</span>
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* DISCONNECTED / INITIAL SETUP STATE */
          <div className="space-y-4">
            <div className="bg-theme-surface space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-theme-subtle border border-zinc-700/40 text-theme-muted flex items-center justify-center shrink-0">
                  <Cloud className="w-5 h-5 text-emerald-500" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-theme-main">Connect Your Google Drive</h4>
                  <p className="text-[11px] text-theme-muted">
                    Automate cloud snapshots to your Google Drive with full control.
                  </p>
                </div>
              </div>

              {/* Accordion Setup Guide */}
              <div className="rounded-lg bg-theme-subtle overflow-hidden text-xs">
                <button
                  type="button"
                  onClick={() => setShowSetupGuide(!showSetupGuide)}
                  className="w-full p-2.5 flex items-center justify-between text-left font-medium text-theme-main hover:bg-theme-base/20 transition-colors"
                >
                  <div className="flex items-center gap-1.5 text-emerald-500 text-[11px] font-semibold">
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>How to create Google OAuth credentials (1 min guide)</span>
                  </div>
                  <span className="text-theme-muted text-[10px]">
                    {showSetupGuide ? 'Hide' : 'Show'}
                  </span>
                </button>

                {showSetupGuide && (
                  <div className="p-3 border-t border-theme text-[11px] text-theme-muted space-y-1.5 bg-theme-app/40">
                    <ol className="list-decimal pl-4 space-y-1">
                      <li>
                        Open <a href="https://console.cloud.google.com/" target="_blank" rel="noreferrer" className="text-emerald-500 hover:underline inline-flex items-center gap-0.5">Google Cloud Console <ExternalLink className="w-2.5 h-2.5" /></a> and create a project.
                      </li>
                      <li>In <strong>APIs &amp; Services &gt; Library</strong>, search for <strong>Google Drive API</strong> and click <strong>Enable</strong>.</li>
                      <li>In <strong>Credentials &gt; Create Credentials</strong>, select <strong>OAuth client ID (Web application)</strong>.</li>
                      <li>
                        Set <strong>Authorized redirect URIs</strong> to:
                        <div className="p-1 mt-1 rounded bg-theme font-mono text-[10px] text-emerald-400 select-all">
                          {redirectUriPreview}
                        </div>
                      </li>
                      <li>Copy the <strong>Client ID</strong> and <strong>Client Secret</strong> into the fields below.</li>
                      <li>Click <strong>Connect Google Drive</strong> below to authorize.</li>
                    </ol>
                  </div>
                )}
              </div>

              {/* Credentials Inputs */}
              <div className="space-y-2.5 text-xs">
                <div>
                  <label htmlFor='google-client-id' className="block text-[11px] font-medium text-theme-main mb-1">
                    Google Client ID <span className="text-[10px] text-rose-500">*</span>
                  </label>
                  <Input
                    type="text"
                    id='google-client-id'
                    placeholder="e.g. 123456789-abc.apps.googleusercontent.com"
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                  />
                </div>

                <div>
                  <label htmlFor='google-client-secret' className="block text-[11px] font-medium text-theme-main mb-1">
                    Google Client Secret <span className="text-[10px] text-rose-500">*</span>
                  </label>
                  <Input
                    type="password"
                    id='google-client-secret'
                    placeholder="e.g. GOCSPX-xxxxxxxxxxxxxxxx"
                    value={clientSecret}
                    onChange={(e) => setClientSecret(e.target.value)}
                  />
                </div>

                {/* Scope selector */}
                <div className="pt-1">
                  <label className="block text-[11px] font-medium text-theme-main mb-1">
                    Permission Scope
                  </label>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <label className={`p-2 rounded-lg cursor-pointer flex items-center gap-2 transition-colors ${
                      scopeType === 'file'
                        ? 'border border-emerald-500 bg-emerald-500/10 text-theme-main'
                        : 'bg-theme text-theme-muted'
                    }`}>
                      <input
                        type="radio"
                        name="scopeType"
                        checked={scopeType === 'file'}
                        onChange={() => setScopeType('file')}
                        className="text-emerald-500 focus:ring-emerald-500"
                      />
                      <span className="font-medium text-[11px]">App Folder Only (Recommended)</span>
                    </label>

                    <label className={`p-2 rounded-lg cursor-pointer flex items-center gap-2 transition-colors ${
                      scopeType === 'full'
                        ? 'border border-emerald-500 bg-emerald-500/10 text-theme-main'
                        : 'bg-theme text-theme-muted'
                    }`}>
                      <input
                        type="radio"
                        name="scopeType"
                        checked={scopeType === 'full'}
                        onChange={() => setScopeType('full')}
                        className="text-emerald-500 focus:ring-emerald-500"
                      />
                      <span className="font-medium text-[11px]">Full Drive Access</span>
                    </label>
                  </div>
                </div>

                {/* Important Checkbox Tip */}
                <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-theme-muted">
                  <span className="font-semibold text-emerald-500">Notice:</span> On Google&apos;s sign-in screen, remember to check:
                  <div className="font-medium text-theme-main mt-0.5">
                    ☑️ &quot;See, edit, create, and delete only the specific Google Drive files you use with this app&quot;
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleConnect}
                    disabled={actionLoading || (!clientId.trim() && !status?.clientIdConfigured)}
                    className="w-full sm:w-auto"
                  >
                    {actionLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Cloud className="w-3.5 h-3.5" />}
                    <span>Connect Google Drive</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
