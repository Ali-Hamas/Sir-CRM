'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import {
  Building2, Plus, MoreHorizontal, X, RefreshCw, AlertCircle,
  Loader2, Trash2, Edit3, Users, ChevronRight, Crown
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { AdminGuard } from '@/components/auth/AdminGuard';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Department {
  id: string;
  name: string;
  description?: string;
  headId?: string;
  head?: { id: string; firstName?: string; lastName?: string; email: string } | null;
  _count?: { members: number; teams: number };
  isDeleted?: boolean;
}

interface OrgMemberUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
}

interface OrgMember {
  id: string;
  role: string;
  user: OrgMemberUser;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getUserFullName(user?: { firstName?: string; lastName?: string; email: string } | null) {
  if (!user) return 'Unassigned';
  return [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email;
}

// ── Skeleton row ──────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr className="border-b border-gray-100 dark:border-zinc-800">
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-gray-200 dark:bg-zinc-700 animate-pulse" />
          <div className="space-y-1.5">
            <div className="h-3 w-32 bg-gray-200 dark:bg-zinc-700 rounded animate-pulse" />
            <div className="h-2 w-48 bg-gray-100 dark:bg-zinc-800 rounded animate-pulse" />
          </div>
        </div>
      </td>
      {[...Array(4)].map((_, i) => (
        <td key={i} className="px-6 py-4">
          <div className="h-3 w-20 bg-gray-200 dark:bg-zinc-700 rounded animate-pulse" />
        </td>
      ))}
    </tr>
  );
}

// ── Actions menu ──────────────────────────────────────────────────────────────

function ActionsMenu({
  dept,
  onEdit,
  onDelete,
}: {
  dept: Department;
  onEdit: (dept: Department) => void;
  onDelete: (dept: Department) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative flex justify-end">
      <button
        onClick={() => setOpen((o) => !o)}
        className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300 rounded-md hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
      >
        <MoreHorizontal size={16} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-9 z-20 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-lg shadow-xl w-44 py-1 overflow-hidden">
            <button
              onClick={() => { onEdit(dept); setOpen(false); }}
              className="w-full text-left px-3 py-2 text-xs text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800 flex items-center gap-2 transition-colors"
            >
              <Edit3 size={12} /> Edit Department
            </button>
            <div className="border-t border-gray-100 dark:border-zinc-800 mt-1 pt-1">
              <button
                onClick={() => { onDelete(dept); setOpen(false); }}
                className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 transition-colors"
              >
                <Trash2 size={12} /> Delete Department
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function DepartmentsPage() {
  const params = useParams();
  const orgSlug = (params?.orgSlug as string) || '';

  // ── State ─────────────────────────────────────────────────────────────────
  const [departments, setDepartments] = useState<Department[]>([]);
  const [members, setMembers] = useState<OrgMember[]>([]); // for head dropdown
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [editTarget, setEditTarget] = useState<Department | null>(null);
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formHeadId, setFormHeadId] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Toast
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    if (!orgSlug) return;
    setLoading(true);
    setError(null);
    try {
      const [deptsData, membersData] = await Promise.all([
        apiFetch(`/organizations/${orgSlug}/departments`),
        apiFetch(`/organizations/${orgSlug}/team/members?limit=200`).catch(() => ({ items: [] })),
      ]);
      setDepartments(Array.isArray(deptsData) ? deptsData : []);
      setMembers(Array.isArray(membersData?.items) ? membersData.items : []);
    } catch (err: any) {
      setError(err.message || 'Failed to load departments');
    } finally {
      setLoading(false);
    }
  }, [orgSlug]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Open create modal ─────────────────────────────────────────────────────
  const openCreate = () => {
    setModalMode('create');
    setEditTarget(null);
    setFormName('');
    setFormDescription('');
    setFormHeadId('');
    setFormError(null);
  };

  // ── Open edit modal ────────────────────────────────────────────────────────
  const openEdit = (dept: Department) => {
    setModalMode('edit');
    setEditTarget(dept);
    setFormName(dept.name);
    setFormDescription(dept.description ?? '');
    setFormHeadId(dept.headId ?? '');
    setFormError(null);
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;
    setFormLoading(true);
    setFormError(null);

    const body: any = {
      name: formName.trim(),
      description: formDescription.trim() || undefined,
      headId: formHeadId || undefined,
    };

    try {
      if (modalMode === 'create') {
        const created = await apiFetch(`/organizations/${orgSlug}/departments`, {
          method: 'POST',
          body: JSON.stringify(body),
        });
        setDepartments((prev) => [created, ...prev]);
        showToast('success', `Department "${created.name}" created`);
      } else if (modalMode === 'edit' && editTarget) {
        const updated = await apiFetch(`/organizations/${orgSlug}/departments/${editTarget.id}`, {
          method: 'PATCH',
          body: JSON.stringify(body),
        });
        setDepartments((prev) =>
          prev.map((d) => (d.id === editTarget.id ? { ...d, ...updated } : d))
        );
        showToast('success', `Department "${updated.name}" updated`);
      }
      setModalMode(null);
    } catch (err: any) {
      setFormError(err.message || 'An error occurred');
    } finally {
      setFormLoading(false);
    }
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = async (dept: Department) => {
    if (!confirm(`Delete department "${dept.name}"? Members will be unassigned.`)) return;
    try {
      await apiFetch(`/organizations/${orgSlug}/departments/${dept.id}`, { method: 'DELETE' });
      setDepartments((prev) => prev.filter((d) => d.id !== dept.id));
      showToast('success', `Department "${dept.name}" deleted`);
    } catch (err: any) {
      showToast('error', err.message || 'Failed to delete department');
    }
  };

  const showToast = (type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3000);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <AdminGuard>
      <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Departments</h2>
          <p className="text-muted-foreground text-sm">
            High-level organizational units and leadership structures.
            {!loading && <span className="ml-1 text-gray-400">({departments.length} total)</span>}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchData}
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
            <Plus size={16} /> New Department
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
          {toast.type === 'success' ? <Building2 size={16} /> : <AlertCircle size={16} />}
          {toast.text}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
          <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium">Failed to load departments</p>
            <p className="text-xs mt-0.5 opacity-80">{error}</p>
            <button onClick={fetchData} className="mt-2 text-xs underline font-medium">Try again</button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 dark:bg-zinc-950 border-b border-gray-200 dark:border-zinc-800 text-gray-500 dark:text-zinc-400 uppercase text-xs">
              <tr>
                <th className="px-6 py-4 font-medium">Department</th>
                <th className="px-6 py-4 font-medium">Department Head</th>
                <th className="px-6 py-4 font-medium">Teams</th>
                <th className="px-6 py-4 font-medium">Members</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-zinc-800">
              {loading ? (
                [...Array(4)].map((_, i) => <SkeletonRow key={i} />)
              ) : departments.length === 0 && !error ? (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center">
                        <Building2 size={24} className="text-gray-300 dark:text-zinc-600" />
                      </div>
                      <p className="font-medium text-gray-500 dark:text-zinc-400">No departments yet</p>
                      <p className="text-xs text-gray-400 dark:text-zinc-500">
                        Create your first department to structure the organization
                      </p>
                      <button
                        onClick={openCreate}
                        className="mt-1 flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-md text-xs font-medium hover:bg-primary/20 transition-colors"
                      >
                        <Plus size={13} /> New Department
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                departments.map((dept) => (
                  <tr
                    key={dept.id}
                    className="hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors group"
                  >
                    {/* Department name */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-md bg-primary/10 text-primary flex-shrink-0">
                          <Building2 size={16} />
                        </div>
                        <div>
                          <span className="font-medium text-gray-900 dark:text-white">{dept.name}</span>
                          {dept.description && (
                            <p className="text-xs text-gray-400 dark:text-zinc-500 mt-0.5 line-clamp-1">
                              {dept.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Head */}
                    <td className="px-6 py-4">
                      {dept.head ? (
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                            <Crown size={11} className="text-amber-600 dark:text-amber-400" />
                          </div>
                          <span className="text-sm text-gray-700 dark:text-zinc-300 font-medium">
                            {getUserFullName(dept.head)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 dark:text-zinc-600 italic">Unassigned</span>
                      )}
                    </td>

                    {/* Teams count */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-gray-600 dark:text-zinc-300">
                        <ChevronRight size={13} className="text-gray-400" />
                        <span className="text-sm font-medium">{dept._count?.teams ?? 0}</span>
                        <span className="text-xs text-gray-400">team{(dept._count?.teams ?? 0) !== 1 ? 's' : ''}</span>
                      </div>
                    </td>

                    {/* Members count */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-gray-600 dark:text-zinc-300">
                        <Users size={13} className="text-gray-400" />
                        <span className="text-sm font-medium">{dept._count?.members ?? 0}</span>
                        <span className="text-xs text-gray-400">member{(dept._count?.members ?? 0) !== 1 ? 's' : ''}</span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4">
                      <ActionsMenu dept={dept} onEdit={openEdit} onDelete={handleDelete} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Modal */}
      {modalMode && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-gray-100 dark:border-zinc-800 pb-3">
              <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
                {modalMode === 'create' ? 'Create New Department' : 'Edit Department'}
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
                  Department Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Research & Development"
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
                  placeholder="What does this department do?"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1 text-gray-700 dark:text-zinc-300">
                  Department Head
                </label>
                <select
                  value={formHeadId}
                  onChange={(e) => setFormHeadId(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="">— No Head Assigned —</option>
                  {members.map((m) => (
                    <option key={m.user.id} value={m.user.id}>
                      {getUserFullName(m.user)} ({m.role})
                    </option>
                  ))}
                </select>
                {members.length === 0 && (
                  <p className="mt-1 text-xs text-gray-400 dark:text-zinc-600">
                    Invite members first to assign a department head.
                  </p>
                )}
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
                  {modalMode === 'create' ? 'Create Department' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
    </AdminGuard>
  );
}
