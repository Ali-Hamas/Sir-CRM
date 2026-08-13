'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import {
  Users, Plus, MoreHorizontal, X, RefreshCw, AlertCircle,
  Loader2, Trash2, Edit3, UserPlus, UserMinus, Crown
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { AdminGuard } from '@/components/auth/AdminGuard';

// ── Types ─────────────────────────────────────────────────────────────────────

interface TeamMemberUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
}

interface TeamMember {
  id: string;
  role: string;
  user: TeamMemberUser;
}

interface Team {
  id: string;
  name: string;
  description?: string;
  color?: string;
  departmentId?: string;
  department?: { id: string; name: string } | null;
  leaderId?: string;
  leader?: { id: string; firstName?: string; lastName?: string; email: string } | null;
  _count?: { members: number };
  members?: TeamMember[];
}

interface Department {
  id: string;
  name: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const PALETTE = [
  { label: 'Blue', hex: '#3b82f6' },
  { label: 'Purple', hex: '#8b5cf6' },
  { label: 'Green', hex: '#10b981' },
  { label: 'Amber', hex: '#f59e0b' },
  { label: 'Rose', hex: '#f43f5e' },
  { label: 'Cyan', hex: '#06b6d4' },
  { label: 'Orange', hex: '#f97316' },
  { label: 'Indigo', hex: '#6366f1' },
];

function getUserFullName(user?: { firstName?: string; lastName?: string; email: string } | null) {
  if (!user) return '—';
  const name = [user.firstName, user.lastName].filter(Boolean).join(' ');
  return name || user.email;
}

function getInitial(user?: { firstName?: string; lastName?: string; email: string } | null) {
  if (!user) return '?';
  return (user.firstName?.[0] ?? user.email[0]).toUpperCase();
}

function getMemberCount(team: Team) {
  return team._count?.members ?? team.members?.length ?? 0;
}

// ── Team Card ─────────────────────────────────────────────────────────────────

function TeamCard({
  team,
  onView,
  onEdit,
  onDelete,
}: {
  team: Team;
  onView: (team: Team) => void;
  onEdit: (team: Team) => void;
  onDelete: (team: Team) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const color = team.color || '#3b82f6';
  const count = getMemberCount(team);

  return (
    <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl overflow-hidden hover:shadow-md transition-all duration-200 group">
      {/* Color band */}
      <div className="h-16 relative" style={{ backgroundColor: color + '22' }}>
        <div className="absolute inset-0" style={{ backgroundColor: color, opacity: 0.15 }} />
        <div className="absolute right-2 top-2">
          <div className="relative">
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="p-1.5 bg-white/70 dark:bg-black/50 rounded-md backdrop-blur-sm hover:bg-white dark:hover:bg-zinc-800 transition-colors"
            >
              <MoreHorizontal size={15} className="text-gray-700 dark:text-gray-300" />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-8 z-20 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-lg shadow-xl w-40 py-1 overflow-hidden">
                  <button
                    onClick={() => { onView(team); setMenuOpen(false); }}
                    className="w-full text-left px-3 py-2 text-xs text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800 flex items-center gap-2 transition-colors"
                  >
                    <Users size={12} /> View Members
                  </button>
                  <button
                    onClick={() => { onEdit(team); setMenuOpen(false); }}
                    className="w-full text-left px-3 py-2 text-xs text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800 flex items-center gap-2 transition-colors"
                  >
                    <Edit3 size={12} /> Edit Team
                  </button>
                  <div className="border-t border-gray-100 dark:border-zinc-800 mt-1 pt-1">
                    <button
                      onClick={() => { onDelete(team); setMenuOpen(false); }}
                      className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 transition-colors"
                    >
                      <Trash2 size={12} /> Delete Team
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="px-5 pb-5 pt-2 relative -mt-6">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-lg border-2 border-white dark:border-zinc-900"
          style={{ backgroundColor: color }}
        >
          <Users size={20} />
        </div>

        <h3 className="mt-3 text-base font-semibold text-gray-900 dark:text-white line-clamp-1">{team.name}</h3>

        {team.description && (
          <p className="text-xs text-gray-500 dark:text-zinc-500 mt-1 line-clamp-2">{team.description}</p>
        )}

        {team.department && (
          <span className="inline-block mt-2 px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400">
            {team.department.name}
          </span>
        )}

        {team.leader && (
          <div className="flex items-center gap-1.5 mt-2">
            <Crown size={11} className="text-amber-500" />
            <span className="text-xs text-gray-500 dark:text-zinc-400">{getUserFullName(team.leader)}</span>
          </div>
        )}

        <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-100 dark:border-zinc-800">
          <div className="flex items-center gap-1.5">
            <div className="flex -space-x-1.5">
              {[...Array(Math.min(count, 3))].map((_, i) => (
                <div
                  key={i}
                  className="w-6 h-6 rounded-full ring-2 ring-white dark:ring-zinc-900 flex items-center justify-center text-[9px] font-bold text-white"
                  style={{ backgroundColor: color, opacity: 0.7 + i * 0.1 }}
                >
                  {String.fromCharCode(65 + i)}
                </div>
              ))}
              {count > 3 && (
                <div className="w-6 h-6 rounded-full ring-2 ring-white dark:ring-zinc-900 bg-gray-200 dark:bg-zinc-700 flex items-center justify-center text-[9px] font-medium text-gray-600 dark:text-zinc-400">
                  +{count - 3}
                </div>
              )}
            </div>
            <span className="text-xs text-gray-500 dark:text-zinc-500 ml-1">{count} member{count !== 1 ? 's' : ''}</span>
          </div>
          <button
            onClick={() => onView(team)}
            className="text-xs font-medium text-primary hover:underline transition-colors"
          >
            View Team →
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function TeamCardSkeleton() {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl overflow-hidden">
      <div className="h-16 bg-gray-100 dark:bg-zinc-800 animate-pulse" />
      <div className="px-5 pb-5 pt-2 -mt-6 space-y-3">
        <div className="w-12 h-12 rounded-xl bg-gray-200 dark:bg-zinc-700 animate-pulse" />
        <div className="h-4 w-2/3 bg-gray-200 dark:bg-zinc-700 rounded animate-pulse" />
        <div className="h-3 w-1/2 bg-gray-100 dark:bg-zinc-800 rounded animate-pulse" />
        <div className="h-px bg-gray-100 dark:bg-zinc-800" />
        <div className="flex justify-between">
          <div className="h-3 w-24 bg-gray-100 dark:bg-zinc-800 rounded animate-pulse" />
          <div className="h-3 w-16 bg-gray-100 dark:bg-zinc-800 rounded animate-pulse" />
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function TeamsPage() {
  const params = useParams();
  const orgSlug = (params?.orgSlug as string) || '';

  // ── State ─────────────────────────────────────────────────────────────────
  const [teams, setTeams] = useState<Team[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create / Edit modal
  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [editTarget, setEditTarget] = useState<Team | null>(null);
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formColor, setFormColor] = useState('#3b82f6');
  const [formDeptId, setFormDeptId] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // View team modal
  const [viewTeam, setViewTeam] = useState<Team | null>(null);
  const [viewLoading, setViewLoading] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchTeams = useCallback(async () => {
    if (!orgSlug) return;
    setLoading(true);
    setError(null);
    try {
      const [teamsData, deptsData] = await Promise.all([
        apiFetch(`/organizations/${orgSlug}/team/teams`),
        apiFetch(`/organizations/${orgSlug}/departments`).catch(() => []),
      ]);
      setTeams(Array.isArray(teamsData) ? teamsData : []);
      setDepartments(Array.isArray(deptsData) ? deptsData : []);
    } catch (err: any) {
      setError(err.message || 'Failed to load teams');
    } finally {
      setLoading(false);
    }
  }, [orgSlug]);

  useEffect(() => { fetchTeams(); }, [fetchTeams]);

  // ── View team details ─────────────────────────────────────────────────────
  const handleViewTeam = async (team: Team) => {
    setViewTeam(team);
    setViewLoading(true);
    try {
      const detail = await apiFetch(`/organizations/${orgSlug}/team/teams/${team.id}`);
      setViewTeam(detail);
    } catch {
      // Keep the card-level data we already have
    } finally {
      setViewLoading(false);
    }
  };

  // ── Open create modal ──────────────────────────────────────────────────────
  const openCreate = () => {
    setModalMode('create');
    setEditTarget(null);
    setFormName('');
    setFormDescription('');
    setFormColor('#3b82f6');
    setFormDeptId('');
    setFormError(null);
  };

  // ── Open edit modal ────────────────────────────────────────────────────────
  const openEdit = (team: Team) => {
    setModalMode('edit');
    setEditTarget(team);
    setFormName(team.name);
    setFormDescription(team.description ?? '');
    setFormColor(team.color ?? '#3b82f6');
    setFormDeptId(team.departmentId ?? '');
    setFormError(null);
  };

  // ── Submit form ────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;
    setFormLoading(true);
    setFormError(null);

    const body: any = {
      name: formName.trim(),
      description: formDescription.trim() || undefined,
      color: formColor,
      departmentId: formDeptId || undefined,
    };

    try {
      if (modalMode === 'create') {
        const created = await apiFetch(`/organizations/${orgSlug}/team/teams`, {
          method: 'POST',
          body: JSON.stringify(body),
        });
        setTeams((prev) => [created, ...prev]);
        showToast('success', `Team "${created.name}" created`);
      } else if (modalMode === 'edit' && editTarget) {
        const updated = await apiFetch(`/organizations/${orgSlug}/team/teams/${editTarget.id}`, {
          method: 'PATCH',
          body: JSON.stringify(body),
        });
        setTeams((prev) => prev.map((t) => (t.id === editTarget.id ? { ...t, ...updated } : t)));
        showToast('success', `Team "${updated.name}" updated`);
      }
      setModalMode(null);
    } catch (err: any) {
      setFormError(err.message || 'An error occurred');
    } finally {
      setFormLoading(false);
    }
  };

  // ── Delete team ────────────────────────────────────────────────────────────
  const handleDelete = async (team: Team) => {
    if (!confirm(`Delete team "${team.name}"? This action cannot be undone.`)) return;
    try {
      await apiFetch(`/organizations/${orgSlug}/team/teams/${team.id}`, { method: 'DELETE' });
      setTeams((prev) => prev.filter((t) => t.id !== team.id));
      showToast('success', `Team "${team.name}" deleted`);
    } catch (err: any) {
      showToast('error', err.message || 'Failed to delete team');
    }
  };

  const showToast = (type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3000);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <AdminGuard>
      <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Teams</h2>
          <p className="text-muted-foreground text-sm">
            Organize members into functional, high-performing teams.
            {!loading && <span className="ml-1 text-gray-400">({teams.length} total)</span>}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchTeams}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 border border-gray-200 dark:border-zinc-800 rounded-md text-sm font-medium hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Plus size={16} /> Create Team
          </button>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium ${
          toast.type === 'success'
            ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800'
            : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
        }`}>
          {toast.type === 'success' ? <Users size={16} /> : <AlertCircle size={16} />}
          {toast.text}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
          <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium">Failed to load teams</p>
            <p className="text-xs mt-0.5 opacity-80">{error}</p>
            <button onClick={fetchTeams} className="mt-2 text-xs underline font-medium">Try again</button>
          </div>
        </div>
      )}

      {/* Team grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => <TeamCardSkeleton key={i} />)}
        </div>
      ) : teams.length === 0 && !error ? (
        <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-gray-200 dark:border-zinc-800 rounded-xl">
          <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center mb-4">
            <Users size={28} className="text-gray-300 dark:text-zinc-600" />
          </div>
          <p className="font-semibold text-gray-600 dark:text-zinc-400">No teams yet</p>
          <p className="text-sm text-gray-400 dark:text-zinc-600 mt-1">Create your first team to group members together</p>
          <button
            onClick={openCreate}
            className="mt-4 flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus size={15} /> Create First Team
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teams.map((team) => (
            <TeamCard
              key={team.id}
              team={team}
              onView={handleViewTeam}
              onEdit={openEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      {modalMode && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-gray-100 dark:border-zinc-800 pb-3">
              <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
                {modalMode === 'create' ? 'Create New Team' : 'Edit Team'}
              </h3>
              <button onClick={() => setModalMode(null)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {formError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-600 dark:text-red-400">
                  <AlertCircle size={13} className="flex-shrink-0" /> {formError}
                </div>
              )}

              <div>
                <label className="block text-xs font-medium mb-1 text-gray-700 dark:text-zinc-300">
                  Team Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Mobile Engineering"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1 text-gray-700 dark:text-zinc-300">Description</label>
                <textarea
                  placeholder="What does this team do?"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                />
              </div>

              {departments.length > 0 && (
                <div>
                  <label className="block text-xs font-medium mb-1 text-gray-700 dark:text-zinc-300">Department</label>
                  <select
                    value={formDeptId}
                    onChange={(e) => setFormDeptId(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    <option value="">— No Department —</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium mb-2 text-gray-700 dark:text-zinc-300">Team Color</label>
                <div className="flex gap-2 flex-wrap">
                  {PALETTE.map((p) => (
                    <button
                      key={p.hex}
                      type="button"
                      title={p.label}
                      onClick={() => setFormColor(p.hex)}
                      className="w-8 h-8 rounded-full transition-transform hover:scale-110"
                      style={{
                        backgroundColor: p.hex,
                        boxShadow: formColor === p.hex ? `0 0 0 3px white, 0 0 0 5px ${p.hex}` : 'none',
                      }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalMode(null)}
                  className="px-4 py-2 border border-gray-200 dark:border-zinc-800 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60 flex items-center gap-2"
                >
                  {formLoading && <Loader2 size={14} className="animate-spin" />}
                  {modalMode === 'create' ? 'Create Team' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Team Modal */}
      {viewTeam && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-6 w-full max-w-lg space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-gray-100 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-white shadow"
                  style={{ backgroundColor: viewTeam.color || '#3b82f6' }}
                >
                  <Users size={16} />
                </div>
                <div>
                  <h3 className="font-semibold text-base text-gray-900 dark:text-white">{viewTeam.name}</h3>
                  <p className="text-xs text-gray-500">
                    {viewTeam.department?.name ?? 'No department'} · {getMemberCount(viewTeam)} member{getMemberCount(viewTeam) !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <button onClick={() => setViewTeam(null)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X size={18} />
              </button>
            </div>

            {viewTeam.description && (
              <p className="text-sm text-gray-600 dark:text-zinc-400">{viewTeam.description}</p>
            )}

            {viewTeam.leader && (
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-zinc-400">
                <Crown size={13} className="text-amber-500" />
                <span>Led by <strong className="text-gray-800 dark:text-zinc-200">{getUserFullName(viewTeam.leader)}</strong></span>
              </div>
            )}

            <div>
              <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-2">
                Members {viewLoading && <Loader2 size={11} className="animate-spin inline ml-1" />}
              </p>
              {viewLoading ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-10 bg-gray-100 dark:bg-zinc-800 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : viewTeam.members && viewTeam.members.length > 0 ? (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {viewTeam.members.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800"
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                          style={{ backgroundColor: viewTeam.color || '#3b82f6' }}
                        >
                          {getInitial(m.user)}
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-800 dark:text-zinc-200">
                            {getUserFullName(m.user)}
                          </p>
                          <p className="text-[10px] text-gray-400">{m.user.email}</p>
                        </div>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-primary/10 text-primary font-semibold">
                        {m.role}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-sm text-gray-400 dark:text-zinc-600">
                  No members in this team yet
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-between items-center">
              <button
                onClick={() => { setViewTeam(null); openEdit(viewTeam); }}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 dark:text-zinc-300 border border-gray-200 dark:border-zinc-700 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
              >
                <Edit3 size={13} /> Edit Team
              </button>
              <button
                onClick={() => setViewTeam(null)}
                className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </AdminGuard>
  );
}
