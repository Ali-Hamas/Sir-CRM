'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import {
  Shield, Plus, X, Check, AlertCircle, Loader2,
  Trash2, Edit3, RefreshCw, Lock, ChevronDown, ChevronUp, Users
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { AdminGuard } from '@/components/auth/AdminGuard';

// ── Types ─────────────────────────────────────────────────────────────────────

interface RolePermission {
  id: string;
  customRoleId: string;
  resource: string;
  action: string;
}

interface CustomRole {
  id: string;
  name: string;
  description?: string;
  organizationId: string;
  permissions: RolePermission[];
  _count?: { members: number };
}

// ── Permission Matrix Definition ──────────────────────────────────────────────
// Resources map to actual backend modules. Actions are standard CRUD.

const RESOURCES = [
  { key: 'users',       label: 'Users & Members' },
  { key: 'teams',       label: 'Teams' },
  { key: 'departments', label: 'Departments' },
  { key: 'roles',       label: 'Roles & Permissions' },
  { key: 'crm',         label: 'CRM' },
  { key: 'projects',    label: 'Projects' },
  { key: 'tasks',       label: 'Tasks' },
  { key: 'documents',   label: 'Documents' },
  { key: 'knowledge',   label: 'Knowledge Base' },
  { key: 'workflows',   label: 'Workflows' },
  { key: 'reports',     label: 'Reports & Analytics' },
  { key: 'ai',          label: 'AI Features' },
] as const;

const ACTIONS = ['read', 'create', 'update', 'delete'] as const;

type ResourceKey = typeof RESOURCES[number]['key'];
type ActionKey = typeof ACTIONS[number];

// System role definitions (read-only — enforced at backend via RolesGuard)
const SYSTEM_ROLES = [
  {
    name: 'SUPER_ADMIN',
    label: 'Super Admin',
    description: 'Full unrestricted access to the entire platform including billing and org management.',
    color: '#ef4444',
    badge: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  },
  {
    name: 'ADMIN',
    label: 'Admin',
    description: 'Administrative access. Can manage users, teams, departments, and custom roles.',
    color: '#f97316',
    badge: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  },
  {
    name: 'MANAGER',
    label: 'Manager',
    description: 'Can manage teams, view reports, and oversee projects and tasks.',
    color: '#8b5cf6',
    badge: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  },
  {
    name: 'EMPLOYEE',
    label: 'Employee',
    description: 'Standard access to CRM, projects, tasks, documents, and knowledge base.',
    color: '#3b82f6',
    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  },
  {
    name: 'CLIENT',
    label: 'Client',
    description: 'Limited read-only access to shared documents and project status.',
    color: '#10b981',
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  },
] as const;

// ── Permission Builder ────────────────────────────────────────────────────────

type PermissionSet = Record<ResourceKey, Record<ActionKey, boolean>>;

function buildEmptyPermissions(): PermissionSet {
  const set: any = {};
  RESOURCES.forEach((r) => {
    set[r.key] = {} as any;
    ACTIONS.forEach((a) => { set[r.key][a] = false; });
  });
  return set;
}

function permissionsToSet(permissions: RolePermission[]): PermissionSet {
  const set = buildEmptyPermissions();
  permissions.forEach((p) => {
    const r = p.resource as ResourceKey;
    const a = p.action as ActionKey;
    if (set[r] && a in set[r]) set[r][a] = true;
  });
  return set;
}

function setToPermissionsPayload(set: PermissionSet) {
  const out: { resource: string; action: string }[] = [];
  RESOURCES.forEach((r) => {
    ACTIONS.forEach((a) => {
      if (set[r.key]?.[a]) out.push({ resource: r.key, action: a });
    });
  });
  return out;
}

// ── Permission Builder Component ──────────────────────────────────────────────

function PermissionBuilder({
  value,
  onChange,
}: {
  value: PermissionSet;
  onChange: (v: PermissionSet) => void;
}) {
  const toggle = (resource: ResourceKey, action: ActionKey) => {
    onChange({
      ...value,
      [resource]: { ...value[resource], [action]: !value[resource]?.[action] },
    });
  };

  const toggleAll = (resource: ResourceKey) => {
    const allOn = ACTIONS.every((a) => value[resource]?.[a]);
    const updated = { ...ACTIONS.reduce((acc, a) => ({ ...acc, [a]: !allOn }), {}) };
    onChange({ ...value, [resource]: updated as Record<ActionKey, boolean> });
  };

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-zinc-700">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-gray-50 dark:bg-zinc-900">
            <th className="px-3 py-2 text-left font-medium text-gray-500 dark:text-zinc-400 w-40">Resource</th>
            {ACTIONS.map((a) => (
              <th key={a} className="px-3 py-2 text-center font-medium text-gray-500 dark:text-zinc-400 capitalize w-16">{a}</th>
            ))}
            <th className="px-3 py-2 text-center font-medium text-gray-500 dark:text-zinc-400 w-16">All</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
          {RESOURCES.map((r) => {
            const allOn = ACTIONS.every((a) => value[r.key]?.[a]);
            return (
              <tr key={r.key} className="hover:bg-gray-50/50 dark:hover:bg-zinc-800/30">
                <td className="px-3 py-2 font-medium text-gray-800 dark:text-zinc-200">{r.label}</td>
                {ACTIONS.map((a) => (
                  <td key={a} className="px-3 py-2 text-center">
                    <button
                      type="button"
                      onClick={() => toggle(r.key, a)}
                      className={`w-6 h-6 rounded-md border transition-all inline-flex items-center justify-center ${
                        value[r.key]?.[a]
                          ? 'bg-primary border-primary text-white'
                          : 'border-gray-300 dark:border-zinc-600 hover:border-primary/50'
                      }`}
                    >
                      {value[r.key]?.[a] && <Check size={11} />}
                    </button>
                  </td>
                ))}
                <td className="px-3 py-2 text-center">
                  <button
                    type="button"
                    onClick={() => toggleAll(r.key)}
                    className={`w-6 h-6 rounded-md border transition-all inline-flex items-center justify-center ${
                      allOn
                        ? 'bg-primary border-primary text-white'
                        : 'border-gray-300 dark:border-zinc-600 hover:border-primary/50'
                    }`}
                  >
                    {allOn && <Check size={11} />}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Custom Role Card ──────────────────────────────────────────────────────────

function CustomRoleCard({
  role,
  onEdit,
  onDelete,
}: {
  role: CustomRole;
  onEdit: (role: CustomRole) => void;
  onDelete: (role: CustomRole) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const memberCount = role._count?.members ?? 0;
  const permCount = role.permissions.length;

  return (
    <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
            <Shield size={16} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-900 dark:text-white text-sm">{role.name}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">Custom</span>
            </div>
            {role.description && (
              <p className="text-xs text-gray-500 dark:text-zinc-500 mt-0.5 truncate">{role.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="hidden sm:flex items-center gap-3 text-xs text-gray-400">
            <span className="flex items-center gap-1"><Users size={11} /> {memberCount} member{memberCount !== 1 ? 's' : ''}</span>
            <span className="flex items-center gap-1"><Shield size={11} /> {permCount} perm{permCount !== 1 ? 's' : ''}</span>
          </div>
          <button
            onClick={() => setExpanded((e) => !e)}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300 rounded-md hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
          >
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          <button
            onClick={() => onEdit(role)}
            className="p-1.5 text-gray-400 hover:text-primary rounded-md hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
            title="Edit role"
          >
            <Edit3 size={14} />
          </button>
          <button
            onClick={() => onDelete(role)}
            className="p-1.5 text-gray-400 hover:text-red-500 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            title="Delete role"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="px-5 pb-4 border-t border-gray-100 dark:border-zinc-800 pt-4">
          {role.permissions.length === 0 ? (
            <p className="text-xs text-gray-400 italic">No permissions assigned to this role.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {role.permissions.map((p) => (
                <span
                  key={p.id}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400"
                >
                  <span className="text-primary">{p.resource}</span>
                  <span>·</span>
                  <span>{p.action}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function RolesPage() {
  const params = useParams();
  const orgSlug = (params?.orgSlug as string) || '';

  // ── State ─────────────────────────────────────────────────────────────────
  const [customRoles, setCustomRoles] = useState<CustomRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);

  // Modal state
  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [editTarget, setEditTarget] = useState<CustomRole | null>(null);
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formPermissions, setFormPermissions] = useState<PermissionSet>(buildEmptyPermissions());
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Toast
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // ── Fetch custom roles ────────────────────────────────────────────────────
  const fetchRoles = useCallback(async () => {
    if (!orgSlug) return;
    setLoading(true);
    setError(null);
    setAccessDenied(false);
    try {
      const data = await apiFetch(`/organizations/${orgSlug}/roles`);
      setCustomRoles(Array.isArray(data) ? data : []);
    } catch (err: any) {
      if (err.message?.includes('403') || err.message?.toLowerCase().includes('forbidden')) {
        setAccessDenied(true);
      } else {
        setError(err.message || 'Failed to load roles');
      }
    } finally {
      setLoading(false);
    }
  }, [orgSlug]);

  useEffect(() => { fetchRoles(); }, [fetchRoles]);

  // ── Open create modal ─────────────────────────────────────────────────────
  const openCreate = () => {
    setModalMode('create');
    setEditTarget(null);
    setFormName('');
    setFormDescription('');
    setFormPermissions(buildEmptyPermissions());
    setFormError(null);
  };

  // ── Open edit modal ───────────────────────────────────────────────────────
  const openEdit = (role: CustomRole) => {
    setModalMode('edit');
    setEditTarget(role);
    setFormName(role.name);
    setFormDescription(role.description ?? '');
    setFormPermissions(permissionsToSet(role.permissions));
    setFormError(null);
  };

  // ── Submit form ───────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;
    setFormLoading(true);
    setFormError(null);

    const body = {
      name: formName.trim(),
      description: formDescription.trim() || undefined,
      permissions: setToPermissionsPayload(formPermissions),
    };

    try {
      if (modalMode === 'create') {
        const created = await apiFetch(`/organizations/${orgSlug}/roles`, {
          method: 'POST',
          body: JSON.stringify(body),
        });
        // Refetch to get full data including _count
        await fetchRoles();
        showToast('success', `Custom role "${created.name}" created`);
      } else if (modalMode === 'edit' && editTarget) {
        await apiFetch(`/organizations/${orgSlug}/roles/${editTarget.id}`, {
          method: 'PATCH',
          body: JSON.stringify(body),
        });
        await fetchRoles();
        showToast('success', `Role "${formName}" updated`);
      }
      setModalMode(null);
    } catch (err: any) {
      setFormError(err.message || 'An error occurred');
    } finally {
      setFormLoading(false);
    }
  };

  // ── Delete role ───────────────────────────────────────────────────────────
  const handleDelete = async (role: CustomRole) => {
    const memberCount = role._count?.members ?? 0;
    const msg = memberCount > 0
      ? `Delete role "${role.name}"? ${memberCount} member(s) using this role will revert to their system role.`
      : `Delete role "${role.name}"? This cannot be undone.`;
    if (!confirm(msg)) return;
    try {
      await apiFetch(`/organizations/${orgSlug}/roles/${role.id}`, { method: 'DELETE' });
      setCustomRoles((prev) => prev.filter((r) => r.id !== role.id));
      showToast('success', `Role "${role.name}" deleted`);
    } catch (err: any) {
      showToast('error', err.message || 'Failed to delete role');
    }
  };

  const showToast = (type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <AdminGuard>
      <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            Roles &amp; Permissions
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Configure organization RBAC security. System roles are built-in and protected.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchRoles}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 border border-gray-200 dark:border-zinc-800 rounded-md text-sm font-medium hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          {!accessDenied && (
            <button
              onClick={openCreate}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm"
            >
              <Plus size={16} /> Custom Role
            </button>
          )}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium ${
          toast.type === 'success'
            ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800'
            : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
        }`}>
          {toast.type === 'success' ? <Check size={15} /> : <AlertCircle size={15} />}
          {toast.text}
        </div>
      )}

      {/* Access Denied */}
      {accessDenied && (
        <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-amber-200 dark:border-amber-800/50 rounded-xl bg-amber-50/50 dark:bg-amber-900/10">
          <div className="w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-4">
            <Lock size={24} className="text-amber-600 dark:text-amber-400" />
          </div>
          <p className="font-semibold text-amber-800 dark:text-amber-300">Administrator Access Required</p>
          <p className="text-sm text-amber-600/80 dark:text-amber-400/70 mt-1 text-center max-w-sm">
            Managing roles and permissions requires Admin or Super Admin privileges.
          </p>
        </div>
      )}

      {/* Error */}
      {error && !accessDenied && (
        <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
          <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium">Failed to load roles</p>
            <p className="text-xs mt-0.5 opacity-80">{error}</p>
            <button onClick={fetchRoles} className="mt-2 text-xs underline font-medium">Try again</button>
          </div>
        </div>
      )}

      {/* ── SYSTEM ROLES ───────────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">System Roles</h3>
          <span className="flex items-center gap-1 text-xs text-gray-400 bg-gray-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full">
            <Lock size={10} /> Built-in · Read-only
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {SYSTEM_ROLES.map((role) => (
            <div
              key={role.name}
              className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-4 relative overflow-hidden"
            >
              <div
                className="absolute top-0 left-0 w-1 h-full rounded-l-xl"
                style={{ backgroundColor: role.color }}
              />
              <div className="pl-2">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${role.badge}`}>
                    {role.label}
                  </span>
                  <Lock size={12} className="text-gray-300 dark:text-zinc-600" />
                </div>
                <p className="text-xs text-gray-500 dark:text-zinc-400 leading-relaxed">{role.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CUSTOM ROLES ───────────────────────────────────────────────────── */}
      {!accessDenied && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Custom Roles</h3>
            {!loading && (
              <span className="text-xs text-gray-400 bg-gray-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full">
                {customRoles.length} role{customRoles.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : customRoles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-gray-200 dark:border-zinc-800 rounded-xl">
              <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center mb-3">
                <Shield size={20} className="text-gray-300 dark:text-zinc-600" />
              </div>
              <p className="font-medium text-gray-500 dark:text-zinc-400 text-sm">No custom roles yet</p>
              <p className="text-xs text-gray-400 dark:text-zinc-600 mt-1">Create a custom role to grant fine-grained access</p>
              <button
                onClick={openCreate}
                className="mt-3 flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-md text-xs font-medium hover:bg-primary/20 transition-colors"
              >
                <Plus size={13} /> Create Custom Role
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {customRoles.map((role) => (
                <CustomRoleCard
                  key={role.id}
                  role={role}
                  onEdit={openEdit}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* ── PERMISSION REFERENCE ───────────────────────────────────────────── */}
      {!accessDenied && !loading && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Permission Reference</h3>
            <span className="text-xs text-gray-400 bg-gray-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full">
              Available resources &amp; actions
            </span>
          </div>
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 dark:bg-zinc-950 border-b border-gray-200 dark:border-zinc-800">
                <tr>
                  <th className="px-5 py-3 text-xs font-medium text-gray-500 dark:text-zinc-400 uppercase">Resource Module</th>
                  <th className="px-5 py-3 text-xs font-medium text-gray-500 dark:text-zinc-400 uppercase">Available Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                {RESOURCES.map((r) => (
                  <tr key={r.key} className="hover:bg-gray-50/50 dark:hover:bg-zinc-800/30">
                    <td className="px-5 py-3 font-medium text-gray-800 dark:text-zinc-200">{r.label}</td>
                    <td className="px-5 py-3">
                      <div className="flex gap-1.5">
                        {ACTIONS.map((a) => (
                          <span key={a} className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 capitalize">
                            {a}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ── CREATE / EDIT MODAL ─────────────────────────────────────────────── */}
      {modalMode && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
            {/* Modal header */}
            <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-zinc-800 flex-shrink-0">
              <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
                {modalMode === 'create' ? 'Create Custom Role' : `Edit Role: ${editTarget?.name}`}
              </h3>
              <button onClick={() => setModalMode(null)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
              <div className="flex-1 overflow-y-auto p-6 space-y-5">
                {formError && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-600 dark:text-red-400">
                    <AlertCircle size={13} className="flex-shrink-0" /> {formError}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium mb-1 text-gray-700 dark:text-zinc-300">
                      Role Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Sales Lead, Security Auditor"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      className="w-full rounded-lg border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                      required
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1 text-gray-700 dark:text-zinc-300">Description</label>
                    <input
                      type="text"
                      placeholder="Optional role description"
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                      className="w-full rounded-lg border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium mb-2 text-gray-700 dark:text-zinc-300">
                    Permissions
                    <span className="ml-2 text-gray-400 font-normal">
                      ({setToPermissionsPayload(formPermissions).length} granted)
                    </span>
                  </label>
                  <PermissionBuilder value={formPermissions} onChange={setFormPermissions} />
                </div>
              </div>

              <div className="flex justify-end gap-2 p-6 border-t border-gray-100 dark:border-zinc-800 flex-shrink-0">
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
                  {modalMode === 'create' ? 'Create Role' : 'Save Changes'}
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
