'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { UserSafe } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import {
  Users,
  UserPlus,
  Trash2,
  ShieldCheck,
  ShieldAlert,
  AlertCircle,
  CheckCircle2,
  User as UserIcon,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
} from 'lucide-react';

interface UserManagementSectionProps {
  currentUserId: string;
}

export function UserManagementSection({ currentUserId }: UserManagementSectionProps) {
  const { refreshAuth } = useAuth();
  const [users, setUsers] = useState<UserSafe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Add User Modal State
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [newRole, setNewRole] = useState<'admin' | 'member'>('member');
  const [addLoading, setAddLoading] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/auth/users');
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to load users');
      }
      setUsers(data.users || []);
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchUsers]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!newName.trim() || !newUsername.trim() || !newEmail.trim() || !newPassword) {
      setError('All fields are required.');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setAddLoading(true);
    try {
      const res = await fetch('/api/auth/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName,
          username: newUsername,
          email: newEmail,
          password: newPassword,
          role: newRole,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create user');
      }

      setSuccess(`User @${data.user.username} created successfully.`);
      setAddModalOpen(false);
      setNewName('');
      setNewUsername('');
      setNewEmail('');
      setNewPassword('');
      setShowNewPassword(false);
      setNewRole('member');
      fetchUsers();
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setAddLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRoleValue: 'admin' | 'member') => {
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/auth/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRoleValue }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update user role');
      }

      setSuccess(data.message);
      await fetchUsers();
      if (userId === currentUserId) {
        await refreshAuth();
      }
    } catch (err: unknown) {
      setError((err as Error).message);
    }
  };

  const handleDeleteUser = async (userId: string, username: string) => {
    if (!confirm(`Are you sure you want to delete user "${username}"? This cannot be undone.`)) {
      return;
    }

    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/auth/users/${userId}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete user');
      }

      setSuccess(`User "${username}" deleted successfully.`);
      fetchUsers();
    } catch (err: unknown) {
      setError((err as Error).message);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header and Add Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-theme-muted flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-emerald-500" />
              User Access & Roles
            </h3>
            <Badge variant="neutral" size="xs">
              {users.length} {users.length === 1 ? 'account' : 'accounts'}
            </Badge>
          </div>
          <p className="text-[11px] text-theme-faint mt-0.5">
            Administrators have full system & demo control. Members have day-to-day finance logging access.
          </p>
        </div>

        <Button
          variant="primary"
          size="xs"
          onClick={() => setAddModalOpen(true)}
          leftIcon={<UserPlus className="w-3.5 h-3.5" />}
          className="self-start sm:self-auto"
        >
          Add User
        </Button>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-500 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-500 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Users Table */}
      {loading ? (
        <div className="py-8 text-center text-xs text-theme-muted flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
          <span>Loading accounts...</span>
        </div>
      ) : (
        <div className="overflow-x-auto border border-theme rounded-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-theme-subtle text-theme-muted font-semibold border-b border-theme text-[11px]">
              <tr>
                <th className="py-2.5 px-3">User</th>
                <th className="py-2.5 px-3">Username & Email</th>
                <th className="py-2.5 px-3">Role & Permissions</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-theme">
              {users.map((u, index) => {
                const isSelf = u.id === currentUserId;
                const isAdmin = u.role === 'admin';
                const isMaster = index === 0;

                return (
                  <tr key={u.id} className="hover:bg-theme-subtle transition-colors">
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-theme-subtle border border-theme flex items-center justify-center text-theme-title font-bold text-xs shadow-xs">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-theme-title flex items-center gap-1.5 text-xs">
                            {u.name}
                            {isMaster && (
                              <span
                                className="text-[9px] font-semibold text-amber-500 bg-amber-500/10 border border-amber-500/25 px-1.5 py-0.2 rounded-full"
                                title="Initial Master Administrator"
                              >
                                Master
                              </span>
                            )}
                            {isSelf && (
                              <span className="text-[9px] font-semibold text-emerald-500 bg-emerald-500/10 border border-emerald-500/25 px-1.5 py-0.2 rounded-full">
                                You
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-theme-faint">
                            Joined {new Date(u.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="text-theme-title font-mono text-[11px]">@{u.username}</div>
                      <div className="text-theme-muted text-[11px]">{u.email}</div>
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                          isAdmin
                            ? 'bg-purple-500/10 text-purple-400 border-purple-500/25'
                            : 'bg-blue-500/10 text-blue-400 border-blue-500/25'
                        }`}
                      >
                        {isAdmin ? <ShieldCheck className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3" />}
                        {isAdmin ? 'Administrator' : 'Member'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <select
                          value={u.role}
                          disabled={isSelf}
                          onChange={(e) => handleRoleChange(u.id, e.target.value as 'admin' | 'member')}
                          className="bg-theme-input border border-theme-input text-theme-title text-xs rounded-lg px-2 py-1 focus:outline-none focus:border-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                          title={isSelf ? 'You cannot change your own role' : 'Change user role'}
                        >
                          <option value="admin" className="bg-theme-card text-theme-title">Admin</option>
                          <option value="member" className="bg-theme-card text-theme-title">Member</option>
                        </select>

                        {!isSelf && (
                          <button
                            type="button"
                            onClick={() => handleDeleteUser(u.id, u.username)}
                            className="p-1.5 text-theme-muted hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                            title="Delete user"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add User Modal */}
      <Modal isOpen={addModalOpen} onClose={() => setAddModalOpen(false)} title="Add User Account">
        <form onSubmit={handleCreateUser} className="space-y-4 p-4">
          <p className="text-xs text-theme-muted">
            Create credentials for a new member or administrator. Passwords are encrypted with a unique cryptographic salt.
          </p>

          <div>
            <label className="block text-xs font-semibold text-theme-muted mb-1.5">Full Name</label>
            <div className="relative">
              <UserIcon className="w-4 h-4 absolute left-3 top-2.5 text-theme-muted pointer-events-none" />
              <input
                type="text"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Jane Smith"
                className="w-full bg-theme-input border border-theme-input rounded-xl pl-9 pr-3.5 py-2 text-xs sm:text-sm text-theme-title placeholder:text-theme-faint transition-colors focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-theme-muted mb-1.5">Username</label>
              <input
                type="text"
                required
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="janesmith"
                className="w-full bg-theme-input border border-theme-input rounded-xl px-3 py-2 text-xs sm:text-sm text-theme-title placeholder:text-theme-faint transition-colors focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-theme-muted mb-1.5">Role</label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as 'admin' | 'member')}
                className="w-full bg-theme-input border border-theme-input rounded-xl px-3 py-2 text-xs sm:text-sm text-theme-title transition-colors focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 cursor-pointer"
              >
                <option value="member" className="bg-theme-card text-theme-title">Member (Standard)</option>
                <option value="admin" className="bg-theme-card text-theme-title">Administrator (Full Access)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-theme-muted mb-1.5">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-2.5 text-theme-muted pointer-events-none" />
              <input
                type="email"
                required
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="jane@example.com"
                className="w-full bg-theme-input border border-theme-input rounded-xl pl-9 pr-3.5 py-2 text-xs sm:text-sm text-theme-title placeholder:text-theme-faint transition-colors focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-theme-muted mb-1.5">
              Initial Password (min. 8 characters)
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-2.5 text-theme-muted pointer-events-none" />
              <input
                type={showNewPassword ? 'text' : 'password'}
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-theme-input border border-theme-input rounded-xl pl-9 pr-9 py-2 text-xs sm:text-sm text-theme-title placeholder:text-theme-faint transition-colors focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-2.5 text-theme-muted hover:text-theme-title transition-colors cursor-pointer"
                tabIndex={-1}
              >
                {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setAddModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={addLoading}>
              {addLoading ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Creating User...
                </span>
              ) : (
                'Create User'
              )}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

