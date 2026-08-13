'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import {
  Search, MoreHorizontal, Download, Plus, X, UserCheck,
  Shield, RefreshCw, AlertCircle, Loader2, UserX, ChevronDown
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { AdminGuard } from '@/components/auth/AdminGuard';

// ── Types ────────────────────────────────────────────────────────────────────

interface OrgMember {
  id: string;
  role: string;
  status: string;
  jobTitle?: string;
  department?: { id: string; name: string } | null;
  customRole?: { id: string; name: string } | null;
  user: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    lastLogin?: string;
    dateJoined?: string;
    profilePictureUrl?: string;
    teamMembers?: { team: { id: string; name: string; color?: string } }[];
  };
}

const ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'CLIENT'] as const;

function getInitials(member: OrgMember) {
  const f = member.user.firstName?.[0] ?? '';
  const l = member.user.lastName?.[0] ?? '';
  return (f + l).toUpperCase() || member.user.email[0].toUpperCase();
}

function getFullName(member: OrgMember) {
  const name = [member.user.firstName, member.user.lastName].filter(Boolean).join(' ');
  return name || member.user.email;
}

function formatDate(dateStr?: string) {
  if (!dateStr) return 'Never';
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    const diffDays = Math.floor(diffHrs / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString();
  } catch {
    return 'Unknown';
  }
}

// ── Skeleton ─────────────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <tbody>
      {[...Array(5)].map((_, i) => (
        <tr key={i} className="border-b border-gray-100 dark:border-zinc-800">
          <td className="px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-zinc-700 animate-pulse" />
              <div className="space-y-2">
                <div className="h-3 w-32 bg-gray-200 dark:bg-zinc-700 rounded animate-pulse" />
                <div className="h-2 w-48 bg-gray-100 dark:bg-zinc-800 rounded animate-pulse" />
              </div>
            </div>
          </td>
          {[...Array(5)].map((_, j) => (
            <td key={j} className="px-6 py-4">
              <div className="h-3 w-20 bg-gray-200 dark:bg-zinc-700 rounded animate-pulse" />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  );
}

// ── Actions Dropdown ──────────────────────────────────────────────────────────

function ActionsMenu({
  member,
  onRoleChange,
  onDeactivate,
}: {
  member: OrgMember;
  onRoleChange: (id: string, role: string) => void;
  onDeactivate: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300 rounded-md hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
      >
        <MoreHorizontal size={16} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-9 z-20 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-lg shadow-xl w-52 py-1 overflow-hidden">
            <p className="px-3 pt-2 pb-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
              Change Role
            </p>
            {ROLES.map((r) => (
              <button
                key={r}
                onClick={() => { onRoleChange(member.id, r); setOpen(false); }}
                className={`w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors flex items-center gap-2 ${member.role === r ? 'text-primary font-semibold' : 'text-gray-700 dark:text-zinc-300'}`}
              >
                {member.role === r && <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block" />}
                {r}
              </button>
            ))}
            <div className="border-t border-gray-100 dark:border-zinc-800 mt-1 pt-1">
              <button
                onClick={() => { onDeactivate(member.id); setOpen(false); }}
                className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 transition-colors"
              >
                <UserX size={12} />
                Deactivate Member
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function UserDirectoryPage() {
  const params = useParams();
  const orgSlug = (params?.orgSlug as string) || '';

  // ── State ────────────────────────────────────────────────────────────────
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Invite modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('EMPLOYEE');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState(false);

  // Action feedback
  const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // ── Debounce search ──────────────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 400);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // ── Fetch members ────────────────────────────────────────────────────────
  const fetchMembers = useCallback(async () => {
    if (!orgSlug) return;
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ limit: '100' });
      if (debouncedSearch) qs.set('search', debouncedSearch);
      const data = await apiFetch(`/organizations/${orgSlug}/team/members?${qs.toString()}`);
      setMembers(data.items || []);
      setTotal(data.total || 0);
    } catch (err: any) {
      setError(err.message || 'Failed to load members');
    } finally {
      setLoading(false);
    }
  }, [orgSlug, debouncedSearch]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  // ── Invite member ────────────────────────────────────────────────────────
  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviteLoading(true);
    setInviteError(null);
    try {
      await apiFetch(`/organizations/${orgSlug}/team/invite`, {
        method: 'POST',
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      });
      setInviteSuccess(true);
      setInviteEmail('');
      setTimeout(() => {
        setInviteSuccess(false);
        setIsModalOpen(false);
        fetchMembers();
      }, 1500);
    } catch (err: any) {
      setInviteError(err.message || 'Failed to send invitation');
    } finally {
      setInviteLoading(false);
    }
  };

  // ── Change role ──────────────────────────────────────────────────────────
  const handleRoleChange = async (memberId: string, newRole: string) => {
    try {
      await apiFetch(`/organizations/${orgSlug}/team/members/${memberId}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role: newRole }),
      });
      setMembers((prev) =>
        prev.map((m) => (m.id === memberId ? { ...m, role: newRole } : m))
      );
      showAction('success', `Role updated to ${newRole}`);
    } catch (err: any) {
      showAction('error', err.message || 'Failed to update role');
    }
  };

  // ── Deactivate member ─────────────────────────────────────────────────────
  const handleDeactivate = async (memberId: string) => {
    if (!confirm('Deactivate this member? They will lose access to the organization.')) return;
    try {
      await apiFetch(`/organizations/${orgSlug}/team/members/${memberId}`, { method: 'DELETE' });
      setMembers((prev) => prev.map((m) => m.id === memberId ? { ...m, status: 'INACTIVE' } : m));
      showAction('success', 'Member deactivated');
    } catch (err: any) {
      showAction('error', err.message || 'Failed to deactivate member');
    }
  };

  const showAction = (type: 'success' | 'error', text: string) => {
    setActionMsg({ type, text });
    setTimeout(() => setActionMsg(null), 3000);
  };

  // ── Export ───────────────────────────────────────────────────────────────
  const handleExport = () => {
    const rows = members.map((m) => ({
      name: getFullName(m),
      email: m.user.email,
      role: m.role,
      status: m.status,
      department: m.department?.name ?? '',
      jobTitle: m.jobTitle ?? '',
    }));
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(rows, null, 2));
    const a = document.createElement('a');
    a.setAttribute('href', dataStr);
    a.setAttribute('download', 'users_directory.json');
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <AdminGuard>
      <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">User Directory</h2>
          <p className="text-muted-foreground text-sm">
            Manage employees, managers, and clients across the organization.
            {!loading && <span className="ml-1 text-gray-400">({total} total)</span>}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchMembers}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 border border-gray-200 dark:border-zinc-800 rounded-md text-sm font-medium hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={handleExport}
            disabled={members.length === 0}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-zinc-800 rounded-md text-sm font-medium hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
          >
            <Download size={16} /> Export
          </button>
          <button
            onClick={() => { setIsModalOpen(true); setInviteError(null); setInviteSuccess(false); }}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Plus size={16} /> Invite Member
          </button>
        </div>
      </div>

      {/* Action feedback toast */}
      {actionMsg && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium ${
          actionMsg.type === 'success'
            ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800'
            : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
        }`}>
          {actionMsg.type === 'success' ? <UserCheck size={16} /> : <AlertCircle size={16} />}
          {actionMsg.text}
        </div>
      )}

      {/* Search toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between p-4 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, email, or role..."
            className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        {loading && (
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Loader2 size={14} className="animate-spin" /> Loading...
          </div>
        )}
      </div>

      {/* Error state */}
      {error && (
        <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
          <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium">Failed to load members</p>
            <p className="text-xs mt-0.5 opacity-80">{error}</p>
            <button onClick={fetchMembers} className="mt-2 text-xs underline font-medium">Try again</button>
          </div>
        </div>
      )}

      {/* Data Table */}
      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 dark:bg-zinc-950 border-b border-gray-200 dark:border-zinc-800 text-gray-500 dark:text-zinc-400 uppercase text-xs">
              <tr>
                <th className="px-6 py-4 font-medium">User</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Role</th>
                <th className="px-6 py-4 font-medium">Department</th>
                <th className="px-6 py-4 font-medium">Teams</th>
                <th className="px-6 py-4 font-medium">Last Login</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            {loading ? (
              <TableSkeleton />
            ) : (
              <tbody className="divide-y divide-gray-200 dark:divide-zinc-800">
                {members.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center">
                          <UserCheck size={24} className="text-gray-300 dark:text-zinc-600" />
                        </div>
                        <p className="font-medium text-gray-500 dark:text-zinc-400">
                          {debouncedSearch ? 'No members match your search' : 'No members yet'}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-zinc-500">
                          {debouncedSearch ? 'Try a different search term' : 'Invite your first team member to get started'}
                        </p>
                        {!debouncedSearch && (
                          <button
                            onClick={() => setIsModalOpen(true)}
                            className="mt-1 flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-md text-xs font-medium hover:bg-primary/20 transition-colors"
                          >
                            <Plus size={13} /> Invite Member
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  members.map((member) => (
                    <tr
                      key={member.id}
                      className="hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors"
                    >
                      {/* User */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {member.user.profilePictureUrl ? (
                            <img
                              src={member.user.profilePictureUrl}
                              alt={getFullName(member)}
                              className="w-10 h-10 rounded-full object-cover border border-gray-200 dark:border-zinc-700"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                              {getInitials(member)}
                            </div>
                          )}
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">{getFullName(member)}</div>
                            <div className="text-xs text-gray-500 dark:text-zinc-400">{member.user.email}</div>
                            {member.jobTitle && (
                              <div className="text-xs text-gray-400 dark:text-zinc-500 italic">{member.jobTitle}</div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          member.status === 'ACTIVE'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-zinc-400'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${member.status === 'ACTIVE' ? 'bg-green-500' : 'bg-gray-400'}`} />
                          {member.status}
                        </span>
                      </td>

                      {/* Role */}
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 text-xs">
                          <Shield size={11} className="text-primary/70" />
                          <span className="text-gray-700 dark:text-zinc-300 font-medium">
                            {member.customRole?.name ?? member.role}
                          </span>
                        </span>
                      </td>

                      {/* Department */}
                      <td className="px-6 py-4 text-gray-600 dark:text-zinc-300 text-sm">
                        {member.department?.name ?? <span className="text-gray-400 dark:text-zinc-600 italic text-xs">—</span>}
                      </td>

                      {/* Teams */}
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {member.user.teamMembers && member.user.teamMembers.length > 0 ? (
                            member.user.teamMembers.slice(0, 2).map((tm) => (
                              <span
                                key={tm.team.id}
                                className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
                              >
                                {tm.team.name}
                              </span>
                            ))
                          ) : (
                            <span className="text-gray-400 dark:text-zinc-600 italic text-xs">—</span>
                          )}
                          {member.user.teamMembers && member.user.teamMembers.length > 2 && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-500 dark:bg-zinc-800 dark:text-zinc-400">
                              +{member.user.teamMembers.length - 2}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Last Login */}
                      <td className="px-6 py-4 text-gray-500 dark:text-zinc-400 text-sm">
                        {formatDate(member.user.lastLogin ?? undefined)}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        <ActionsMenu
                          member={member}
                          onRoleChange={handleRoleChange}
                          onDeactivate={handleDeactivate}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            )}
          </table>
        </div>
      </div>

      {/* Invite Member Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-gray-100 dark:border-zinc-800 pb-3">
              <h3 className="font-semibold text-lg text-gray-900 dark:text-white">Invite New Member</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X size={18} />
              </button>
            </div>

            {inviteSuccess ? (
              <div className="flex flex-col items-center py-6 gap-3">
                <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <UserCheck size={22} className="text-green-600 dark:text-green-400" />
                </div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Invitation sent!</p>
                <p className="text-xs text-gray-500 text-center">They'll receive an invitation link to join the organization.</p>
              </div>
            ) : (
              <form onSubmit={handleInvite} className="space-y-4">
                {inviteError && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-600 dark:text-red-400">
                    <AlertCircle size={14} className="flex-shrink-0" />
                    {inviteError}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium mb-1 text-gray-700 dark:text-zinc-300">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    placeholder="colleague@company.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    required
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1 text-gray-700 dark:text-zinc-300">Role</label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    <option value="EMPLOYEE">Employee</option>
                    <option value="MANAGER">Manager</option>
                    <option value="ADMIN">Admin</option>
                    <option value="SUPER_ADMIN">Super Admin</option>
                    <option value="CLIENT">Client</option>
                  </select>
                </div>

                <p className="text-xs text-gray-400 dark:text-zinc-500">
                  An invitation link will be sent to this email address.
                </p>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 border border-gray-200 dark:border-zinc-800 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={inviteLoading}
                    className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60 flex items-center gap-2"
                  >
                    {inviteLoading && <Loader2 size={14} className="animate-spin" />}
                    Send Invitation
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
    </AdminGuard>
  );
}
