'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import {
  Search, Plus, Users, BarChart3, Filter, ArrowUpDown,
  ChevronLeft, ChevronRight, AlertTriangle, CheckCircle, Edit2, Trash2
} from 'lucide-react';

interface Allocation {
  id: string;
  role: string | null;
  allocationPercentage: number;
  startDate: string;
  endDate: string | null;
  capacity: number | null;
  notes: string | null;
  user: { id: string; firstName: string; lastName: string; email: string; profilePictureUrl: string | null };
  project: { id: string; projectName: string; projectCode: string };
  createdAt: string;
}

interface WorkloadItem {
  user: { id: string; firstName: string; lastName: string; email: string; profilePictureUrl: string | null };
  allocations: Allocation[];
  totalAllocation: number;
  isOverallocated: boolean;
}

interface Stats {
  totalAllocations: number;
  activeAllocations: number;
  totalCapacity: number;
  activeCapacity: number;
  overallocatedResources: number;
  availableResources: number;
  avgUtilization: number;
  projects: { projectId: string; totalAllocation: number; memberCount: number }[];
}

const ALLOCATION_COLORS = [
  'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500',
  'bg-teal-500', 'bg-indigo-500', 'bg-red-500', 'bg-yellow-500', 'bg-cyan-500',
];

export default function ResourcesPage() {
  const params = useParams();
  const orgSlug = params.orgSlug as string;

  const [activeTab, setActiveTab] = useState<'dashboard' | 'allocations' | 'workload'>('dashboard');
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [projectId, setProjectId] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [workload, setWorkload] = useState<WorkloadItem[]>([]);
  const [projects, setProjects] = useState<{ id: string; projectName: string }[]>([]);
  const [users, setUsers] = useState<{ id: string; firstName: string; lastName: string; email: string }[]>([]);

  // New allocation modal
  const [showNewAllocation, setShowNewAllocation] = useState(false);
  const [editingAllocation, setEditingAllocation] = useState<Allocation | null>(null);
  const [formData, setFormData] = useState({
    userId: '', projectId: '', role: '', allocationPercentage: '100',
    startDate: new Date().toISOString().split('T')[0], endDate: '',
    capacity: '', notes: '',
  });

  const fetchAllocations = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (projectId) params.set('projectId', projectId);
      params.set('page', String(page));
      params.set('limit', '20');

      const data = await apiFetch(`/organizations/${orgSlug}/resource-allocations?${params.toString()}`);
      setAllocations(data.items);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (err) {
      console.error('Failed to fetch allocations:', err);
    } finally {
      setLoading(false);
    }
  }, [orgSlug, search, projectId, page]);

  useEffect(() => { fetchAllocations(); }, [fetchAllocations]);

  useEffect(() => {
    apiFetch(`/organizations/${orgSlug}/resource-allocations/stats`).then(setStats).catch(() => {});
    apiFetch(`/organizations/${orgSlug}/resource-allocations/workload`).then((data) => setWorkload(data.workload || [])).catch(() => {});
    apiFetch(`/organizations/${orgSlug}/projects?limit=200`).then((data) => {
      setProjects(data.items?.map((p: any) => ({ id: p.id, projectName: p.projectName })) || []);
    }).catch(() => {});
    apiFetch(`/organizations/${orgSlug}/users?limit=200`).then((data) => {
      setUsers(data.items?.map((u: any) => ({ id: u.id, firstName: u.firstName, lastName: u.lastName, email: u.email })) || []);
    }).catch(() => {});
  }, [orgSlug]);

  const handleCreate = async () => {
    try {
      if (editingAllocation) {
        await apiFetch(`/organizations/${orgSlug}/resource-allocations/${editingAllocation.id}`, {
          method: 'PATCH',
          body: JSON.stringify(formData),
        });
      } else {
        await apiFetch(`/organizations/${orgSlug}/resource-allocations`, {
          method: 'POST',
          body: JSON.stringify(formData),
        });
      }
      setShowNewAllocation(false);
      setEditingAllocation(null);
      setFormData({ userId: '', projectId: '', role: '', allocationPercentage: '100', startDate: new Date().toISOString().split('T')[0], endDate: '', capacity: '', notes: '' });
      fetchAllocations();
      apiFetch(`/organizations/${orgSlug}/resource-allocations/workload`).then((data) => setWorkload(data.workload || [])).catch(() => {});
      apiFetch(`/organizations/${orgSlug}/resource-allocations/stats`).then(setStats).catch(() => {});
    } catch (err: any) {
      alert(err.message || 'Failed to save allocation');
    }
  };

  const handleEdit = (allocation: Allocation) => {
    setEditingAllocation(allocation);
    setFormData({
      userId: allocation.user.id,
      projectId: allocation.project.id,
      role: allocation.role || '',
      allocationPercentage: String(allocation.allocationPercentage),
      startDate: allocation.startDate.split('T')[0],
      endDate: allocation.endDate ? allocation.endDate.split('T')[0] : '',
      capacity: allocation.capacity ? String(allocation.capacity) : '',
      notes: allocation.notes || '',
    });
    setShowNewAllocation(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this allocation?')) return;
    try {
      await apiFetch(`/organizations/${orgSlug}/resource-allocations/${id}`, { method: 'DELETE' });
      fetchAllocations();
      apiFetch(`/organizations/${orgSlug}/resource-allocations/workload`).then((data) => setWorkload(data.workload || [])).catch(() => {});
      apiFetch(`/organizations/${orgSlug}/resource-allocations/stats`).then(setStats).catch(() => {});
    } catch (err: any) {
      alert(err.message || 'Failed to delete allocation');
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Resource Management</h1>
          <p className="text-muted-foreground text-sm mt-1">Allocate team members and monitor workloads</p>
        </div>
        <button
          onClick={() => { setEditingAllocation(null); setFormData({ userId: '', projectId: '', role: '', allocationPercentage: '100', startDate: new Date().toISOString().split('T')[0], endDate: '', capacity: '', notes: '' }); setShowNewAllocation(true); }}
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus size={16} /> New Allocation
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="border border-gray-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 p-4">
            <p className="text-xs text-gray-500 font-medium">Active Allocations</p>
            <p className="text-2xl font-bold mt-1">{stats.activeAllocations}</p>
          </div>
          <div className="border border-gray-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 p-4">
            <p className="text-xs text-gray-500 font-medium">Avg Utilization</p>
            <p className="text-2xl font-bold mt-1">{stats.avgUtilization}%</p>
          </div>
          <div className="border border-gray-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-red-500" />
              <p className="text-xs text-gray-500 font-medium">Overallocated</p>
            </div>
            <p className="text-2xl font-bold mt-1 text-red-600">{stats.overallocatedResources}</p>
          </div>
          <div className="border border-gray-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 p-4">
            <div className="flex items-center gap-2">
              <CheckCircle size={16} className="text-green-500" />
              <p className="text-xs text-gray-500 font-medium">Available</p>
            </div>
            <p className="text-2xl font-bold mt-1 text-green-600">{stats.availableResources}</p>
          </div>
          <div className="border border-gray-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 p-4">
            <p className="text-xs text-gray-500 font-medium">Projects with Resources</p>
            <p className="text-2xl font-bold mt-1">{stats.projects.length}</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-zinc-800">
        <div className="flex gap-6">
          {[
            { key: 'dashboard' as const, label: 'Dashboard', icon: BarChart3 },
            { key: 'allocations' as const, label: 'Allocations', icon: Users },
            { key: 'workload' as const, label: 'Team Workload', icon: Users },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.key ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              <div className="flex items-center gap-2"><tab.icon size={16} /> {tab.label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && stats && (
        <div className="space-y-6">
          {/* Capacity Bar */}
          <div className="border border-gray-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 p-6">
            <h3 className="text-sm font-semibold mb-4">Team Capacity Overview</h3>
            <div className="space-y-4">
              {workload.slice(0, 10).map((w, idx) => (
                <div key={w.user.id} className="flex items-center gap-4">
                  <div className="flex items-center gap-2 w-40 shrink-0">
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                      {w.user.firstName?.[0]}{w.user.lastName?.[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{w.user.firstName} {w.user.lastName}</p>
                      <p className="text-xs text-gray-500 truncate">{w.user.email}</p>
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="h-6 bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full flex">
                        {w.allocations.map((a, aIdx) => (
                          <div
                            key={a.id}
                            className={`${ALLOCATION_COLORS[aIdx % ALLOCATION_COLORS.length]} h-full transition-all`}
                            style={{ width: `${Math.min(a.allocationPercentage, 100)}%` }}
                            title={`${a.project.projectName}: ${a.allocationPercentage}%`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="w-20 text-right shrink-0">
                    <span className={`text-sm font-bold ${w.isOverallocated ? 'text-red-600' : w.totalAllocation >= 80 ? 'text-yellow-600' : 'text-green-600'}`}>
                      {w.totalAllocation}%
                    </span>
                  </div>
                </div>
              ))}
              {workload.length > 10 && (
                <p className="text-xs text-gray-500 text-center">+{workload.length - 10} more team members</p>
              )}
            </div>
          </div>

          {/* Project Breakdown */}
          {stats.projects.length > 0 && (
            <div className="border border-gray-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 p-6">
              <h3 className="text-sm font-semibold mb-4">Resources by Project</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {stats.projects.map((p) => {
                  const proj = projects.find(pr => pr.id === p.projectId);
                  return (
                    <div key={p.projectId} className="border border-gray-100 dark:border-zinc-800 rounded-lg p-4">
                      <p className="font-medium text-sm">{proj?.projectName || p.projectId}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-gray-500">{p.memberCount} members</span>
                        <span className="text-sm font-bold">{p.totalAllocation}%</span>
                      </div>
                      <div className="mt-2 h-2 bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(p.totalAllocation, 100)}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Allocations Tab */}
      {activeTab === 'allocations' && (
        <>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search allocations..." className="w-full pl-10 pr-4 py-2 rounded-md border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <select value={projectId} onChange={(e) => { setProjectId(e.target.value); setPage(1); }} className="px-3 py-2 rounded-md border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm">
              <option value="">All Projects</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.projectName}</option>)}
            </select>
          </div>

          <div className="border border-gray-200 dark:border-zinc-800 rounded-lg overflow-hidden bg-white dark:bg-zinc-900">
            {loading ? (
              <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
            ) : allocations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Users size={48} className="text-gray-300 dark:text-zinc-600 mb-4" />
                <h3 className="text-lg font-medium mb-1">No allocations found</h3>
                <p className="text-sm text-gray-500 mb-4">Allocate team members to projects</p>
                <button onClick={() => setShowNewAllocation(true)} className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90">
                  <Plus size={16} /> New Allocation
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 dark:bg-zinc-800/50 border-b border-gray-200 dark:border-zinc-800">
                    <tr>
                      <th className="px-6 py-3 font-medium text-gray-500">Member</th>
                      <th className="px-6 py-3 font-medium text-gray-500">Project</th>
                      <th className="px-6 py-3 font-medium text-gray-500">Role</th>
                      <th className="px-6 py-3 font-medium text-gray-500">Allocation</th>
                      <th className="px-6 py-3 font-medium text-gray-500">Duration</th>
                      <th className="px-6 py-3 font-medium text-gray-500 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allocations.map((a) => (
                      <tr key={a.id} className="border-b border-gray-200 dark:border-zinc-800 last:border-0 hover:bg-gray-50 dark:hover:bg-zinc-800/30">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                              {a.user.firstName?.[0]}{a.user.lastName?.[0]}
                            </div>
                            <div>
                              <p className="font-medium">{a.user.firstName} {a.user.lastName}</p>
                              <p className="text-xs text-gray-500">{a.user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs bg-gray-100 dark:bg-zinc-800 px-2 py-1 rounded">{a.project.projectCode}</span>
                          <p className="text-xs text-gray-500 mt-1">{a.project.projectName}</p>
                        </td>
                        <td className="px-6 py-4 text-xs">{a.role || '-'}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-2 bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${a.allocationPercentage > 100 ? 'bg-red-500' : a.allocationPercentage >= 80 ? 'bg-yellow-500' : 'bg-green-500'}`} style={{ width: `${Math.min(a.allocationPercentage, 100)}%` }} />
                            </div>
                            <span className="text-xs font-medium">{a.allocationPercentage}%</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-xs">
                          {new Date(a.startDate).toLocaleDateString()} - {a.endDate ? new Date(a.endDate).toLocaleDateString() : 'Ongoing'}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center gap-2 justify-end">
                            <button onClick={() => handleEdit(a)} className="text-gray-500 hover:text-primary"><Edit2 size={14} /></button>
                            <button onClick={() => handleDelete(a.id)} className="text-gray-500 hover:text-red-500"><Trash2 size={14} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/30">
                <p className="text-sm text-gray-500">Page {page} of {totalPages}</p>
                <div className="flex items-center gap-2">
                  <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="p-1.5 rounded-md border disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-zinc-800"><ChevronLeft size={16} /></button>
                  <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} className="p-1.5 rounded-md border disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-zinc-800"><ChevronRight size={16} /></button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Team Workload Tab */}
      {activeTab === 'workload' && (
        <div className="space-y-4">
          {workload.length === 0 ? (
            <div className="border border-gray-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 p-20 text-center">
              <Users size={48} className="text-gray-300 dark:text-zinc-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-1">No workload data</h3>
              <p className="text-sm text-gray-500">Create resource allocations to see workload</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {workload.map((w) => (
                <div key={w.user.id} className={`border rounded-lg bg-white dark:bg-zinc-900 p-4 ${w.isOverallocated ? 'border-red-200 dark:border-red-800' : 'border-gray-200 dark:border-zinc-800'}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">
                        {w.user.firstName?.[0]}{w.user.lastName?.[0]}
                      </div>
                      <div>
                        <p className="font-medium">{w.user.firstName} {w.user.lastName}</p>
                        <p className="text-xs text-gray-500">{w.user.email}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-lg font-bold ${w.isOverallocated ? 'text-red-600' : w.totalAllocation >= 80 ? 'text-yellow-600' : 'text-green-600'}`}>
                        {w.totalAllocation}%
                      </span>
                      {w.isOverallocated && (
                        <div className="flex items-center gap-1 text-xs text-red-500">
                          <AlertTriangle size={12} /> Overallocated
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Allocation bar */}
                  <div className="h-4 bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden mb-3">
                    <div className="h-full flex">
                      {w.allocations.map((a, idx) => (
                        <div
                          key={a.id}
                          className={`${ALLOCATION_COLORS[idx % ALLOCATION_COLORS.length]} h-full`}
                          style={{ width: `${Math.min(a.allocationPercentage, 100)}%` }}
                          title={`${a.project.projectName}: ${a.allocationPercentage}%`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Allocation details */}
                  <div className="space-y-2">
                    {w.allocations.map((a, idx) => (
                      <div key={a.id} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${ALLOCATION_COLORS[idx % ALLOCATION_COLORS.length]}`} />
                          <span className="text-gray-600 dark:text-gray-400">{a.project.projectName}</span>
                          {a.role && <span className="text-gray-400">({a.role})</span>}
                        </div>
                        <span className="font-medium">{a.allocationPercentage}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* New/Edit Allocation Modal */}
      {showNewAllocation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-xl w-full max-w-lg mx-4">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-zinc-800">
              <h2 className="text-lg font-semibold">{editingAllocation ? 'Edit Allocation' : 'New Allocation'}</h2>
              <button onClick={() => { setShowNewAllocation(false); setEditingAllocation(null); }} className="text-gray-500 hover:text-gray-700">X</button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Team Member</label>
                <select value={formData.userId} onChange={(e) => setFormData({ ...formData, userId: e.target.value })} className="w-full px-3 py-2 rounded-md border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm">
                  <option value="">Select member</option>{users.map((u) => <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Project</label>
                <select value={formData.projectId} onChange={(e) => setFormData({ ...formData, projectId: e.target.value })} className="w-full px-3 py-2 rounded-md border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm">
                  <option value="">Select project</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.projectName}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Role</label>
                  <input type="text" value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })} className="w-full px-3 py-2 rounded-md border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm" placeholder="e.g. Developer" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Allocation %</label>
                  <input type="number" min="0" max="100" value={formData.allocationPercentage} onChange={(e) => setFormData({ ...formData, allocationPercentage: e.target.value })} className="w-full px-3 py-2 rounded-md border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Start Date</label>
                  <input type="date" value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} className="w-full px-3 py-2 rounded-md border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">End Date</label>
                  <input type="date" value={formData.endDate} onChange={(e) => setFormData({ ...formData, endDate: e.target.value })} className="w-full px-3 py-2 rounded-md border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Capacity (hours/week)</label>
                <input type="number" step="0.5" value={formData.capacity} onChange={(e) => setFormData({ ...formData, capacity: e.target.value })} className="w-full px-3 py-2 rounded-md border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm" placeholder="e.g. 40" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Notes</label>
                <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={2} className="w-full px-3 py-2 rounded-md border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm" placeholder="Optional notes..." />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 dark:border-zinc-800">
              <button onClick={() => { setShowNewAllocation(false); setEditingAllocation(null); }} className="px-4 py-2 rounded-md border border-gray-200 dark:border-zinc-800 text-sm font-medium hover:bg-gray-50">Cancel</button>
              <button onClick={handleCreate} className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90">
                {editingAllocation ? 'Update' : 'Create'} Allocation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
