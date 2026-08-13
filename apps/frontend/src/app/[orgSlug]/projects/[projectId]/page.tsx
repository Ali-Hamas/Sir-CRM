'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import {
  ArrowLeft, Edit, Trash2, FolderKanban, DollarSign, Calendar, Building2,
  Users, Clock, CheckCircle, Plus, X, AlertTriangle, Target, ScrollText
} from 'lucide-react';

interface ProjectDetail {
  id: string;
  projectName: string;
  projectCode: string;
  description: string | null;
  status: string;
  priority: string;
  budget: number | null;
  currency: string;
  progress: number;
  startDate: string | null;
  endDate: string | null;
  company: { id: string; name: string; industry: string | null } | null;
  client: { id: string; companyName: string; status: string } | null;
  contract: { id: string; title: string; contractNumber: string; contractValue: number | null } | null;
  projectManager: { id: string; firstName: string; lastName: string; email: string; profilePictureUrl: string | null } | null;
  createdBy: { id: string; firstName: string; lastName: string; email: string };
  members: { id: string; userId: string; role: string; user: { id: string; firstName: string; lastName: string; email: string; profilePictureUrl: string | null } }[];
  phases: { id: string; name: string; description: string | null; status: string; sortOrder: number; startDate: string | null; endDate: string | null; completedAt: string | null }[];
  milestones: { id: string; title: string; description: string | null; status: string; priority: string; dueDate: string | null; completedAt: string | null }[];
  activities: { id: string; action: string; description: string | null; createdAt: string; user: { firstName: string; lastName: string; profilePictureUrl: string | null } }[];
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  PLANNING: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  ON_HOLD: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  IN_PROGRESS: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  COMPLETED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  CANCELLED: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400',
};

const PRIORITY_COLORS: Record<string, string> = {
  LOW: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
  MEDIUM: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  HIGH: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  URGENT: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const PHASE_STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-gray-100 text-gray-700',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  COMPLETED: 'bg-green-100 text-green-700',
};

const MILESTONE_STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-gray-100 text-gray-700',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  COMPLETED: 'bg-green-100 text-green-700',
};

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = params.orgSlug as string;
  const projectId = params.projectId as string;

  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [users, setUsers] = useState<{ id: string; firstName: string; lastName: string }[]>([]);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showAddPhase, setShowAddPhase] = useState(false);
  const [showAddMilestone, setShowAddMilestone] = useState(false);
  const [newPhase, setNewPhase] = useState({ name: '', description: '' });
  const [newMilestone, setNewMilestone] = useState({ title: '', description: '', priority: 'MEDIUM', dueDate: '' });
  const [newMemberId, setNewMemberId] = useState('');

  useEffect(() => { fetchProject(); }, [projectId]);

  const fetchProject = async () => {
    try {
      const data = await apiFetch(`/organizations/${orgSlug}/projects/${projectId}`);
      setProject(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const fetchUsers = async () => {
    try {
      const data = await apiFetch(`/organizations/${orgSlug}/team/members?limit=100`);
      setUsers(data.items?.map((m: any) => m.user) || []);
    } catch (err) { console.error(err); }
  };

  const handleDelete = async () => {
    try {
      await apiFetch(`/organizations/${orgSlug}/projects/${projectId}`, { method: 'DELETE' });
      router.push(`/${orgSlug}/projects`);
    } catch (err) { console.error(err); }
  };

  const handleAddMember = async () => {
    if (!newMemberId) return;
    try {
      await apiFetch(`/organizations/${orgSlug}/projects/${projectId}/members`, {
        method: 'POST', body: JSON.stringify({ memberId: newMemberId }),
      });
      setNewMemberId(''); setShowAddMember(false); fetchProject();
    } catch (err) { console.error(err); }
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      await apiFetch(`/organizations/${orgSlug}/projects/${projectId}/members/${memberId}`, { method: 'DELETE' });
      fetchProject();
    } catch (err) { console.error(err); }
  };

  const handleAddPhase = async () => {
    if (!newPhase.name.trim()) return;
    try {
      await apiFetch(`/organizations/${orgSlug}/projects/${projectId}/phases`, {
        method: 'POST', body: JSON.stringify({ ...newPhase, sortOrder: project?.phases.length || 0 }),
      });
      setNewPhase({ name: '', description: '' }); setShowAddPhase(false); fetchProject();
    } catch (err) { console.error(err); }
  };

  const handleUpdatePhaseStatus = async (phaseId: string, status: string) => {
    try {
      await apiFetch(`/organizations/${orgSlug}/projects/${projectId}/phases/${phaseId}`, {
        method: 'PATCH', body: JSON.stringify({ status }),
      });
      fetchProject();
    } catch (err) { console.error(err); }
  };

  const handleAddMilestone = async () => {
    if (!newMilestone.title.trim()) return;
    try {
      await apiFetch(`/organizations/${orgSlug}/projects/${projectId}/milestones`, {
        method: 'POST', body: JSON.stringify(newMilestone),
      });
      setNewMilestone({ title: '', description: '', priority: 'MEDIUM', dueDate: '' }); setShowAddMilestone(false); fetchProject();
    } catch (err) { console.error(err); }
  };

  const handleUpdateMilestoneStatus = async (milestoneId: string, status: string) => {
    try {
      await apiFetch(`/organizations/${orgSlug}/projects/${projectId}/milestones/${milestoneId}`, {
        method: 'PATCH', body: JSON.stringify({ status }),
      });
      fetchProject();
    } catch (err) { console.error(err); }
  };

  const handleUpdateProgress = async (progress: number) => {
    try {
      await apiFetch(`/organizations/${orgSlug}/projects/${projectId}`, {
        method: 'PATCH', body: JSON.stringify({ progress: String(progress) }),
      });
      fetchProject();
    } catch (err) { console.error(err); }
  };

  if (loading) return <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  if (!project) return <div className="text-center py-20"><p className="text-gray-500">Project not found</p></div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <button onClick={() => router.back()} className="mt-1 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"><ArrowLeft size={20} /></button>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="text-xs text-gray-500 font-mono">{project.projectCode}</span>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[project.status]}`}>{project.status.replace(/_/g, ' ')}</span>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${PRIORITY_COLORS[project.priority]}`}>{project.priority}</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">{project.projectName}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/${orgSlug}/projects/${projectId}/edit`} className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-gray-200 dark:border-zinc-800 text-sm font-medium hover:bg-gray-50 dark:hover:bg-zinc-800">
            <Edit size={16} /> Edit
          </Link>
          <button onClick={() => setShowDeleteConfirm(true)} className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-red-200 dark:border-red-900 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
            <Trash2 size={16} /> Delete
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="border border-gray-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Progress</span>
          <span className="text-sm text-gray-500">{project.progress}%</span>
        </div>
        <div className="w-full h-2 bg-gray-200 dark:bg-zinc-700 rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${project.progress}%` }} />
        </div>
        <div className="flex items-center gap-2 mt-2">
          {[0, 25, 50, 75, 100].map((p) => (
            <button key={p} onClick={() => handleUpdateProgress(p)} className={`text-xs px-2 py-1 rounded-md transition-colors ${project.progress === p ? 'bg-primary text-primary-foreground' : 'bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700'}`}>{p}%</button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          {project.description && (
            <div className="border border-gray-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 p-6">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Description</h3>
              <p className="text-sm whitespace-pre-wrap">{project.description}</p>
            </div>
          )}

          {/* Phases */}
          <div className="border border-gray-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Phases</h3>
              <button onClick={() => { setShowAddPhase(true); fetchUsers(); }} className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80"><Plus size={14} /> Add Phase</button>
            </div>
            {showAddPhase && (
              <div className="mb-4 p-3 border border-primary/20 rounded-lg bg-primary/5">
                <input type="text" value={newPhase.name} onChange={(e) => setNewPhase({ ...newPhase, name: e.target.value })} placeholder="Phase name" className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-3 py-1.5 text-sm mb-2" />
                <input type="text" value={newPhase.description} onChange={(e) => setNewPhase({ ...newPhase, description: e.target.value })} placeholder="Description (optional)" className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-3 py-1.5 text-sm mb-2" />
                <div className="flex gap-2">
                  <button onClick={handleAddPhase} className="px-3 py-1 bg-primary text-primary-foreground rounded-md text-xs font-medium">Add</button>
                  <button onClick={() => setShowAddPhase(false)} className="px-3 py-1 text-xs font-medium text-gray-500 hover:text-gray-700">Cancel</button>
                </div>
              </div>
            )}
            {project.phases.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No phases yet</p>
            ) : (
              <div className="space-y-3">
                {project.phases.map((phase) => (
                  <div key={phase.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 dark:border-zinc-800">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">{phase.sortOrder + 1}</div>
                      <div>
                        <p className="text-sm font-medium">{phase.name}</p>
                        {phase.description && <p className="text-xs text-gray-500">{phase.description}</p>}
                      </div>
                    </div>
                    <select value={phase.status} onChange={(e) => handleUpdatePhaseStatus(phase.id, e.target.value)} className={`text-xs px-2 py-1 rounded-full border-0 font-medium cursor-pointer ${PHASE_STATUS_COLORS[phase.status] || ''}`}>
                      <option value="PENDING">Pending</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="COMPLETED">Completed</option>
                    </select>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Milestones */}
          <div className="border border-gray-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Milestones</h3>
              <button onClick={() => { setShowAddMilestone(true); }} className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80"><Plus size={14} /> Add Milestone</button>
            </div>
            {showAddMilestone && (
              <div className="mb-4 p-3 border border-primary/20 rounded-lg bg-primary/5">
                <input type="text" value={newMilestone.title} onChange={(e) => setNewMilestone({ ...newMilestone, title: e.target.value })} placeholder="Milestone title" className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-3 py-1.5 text-sm mb-2" />
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <select value={newMilestone.priority} onChange={(e) => setNewMilestone({ ...newMilestone, priority: e.target.value })} className="rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-3 py-1.5 text-sm">
                    <option value="LOW">Low</option><option value="MEDIUM">Medium</option><option value="HIGH">High</option><option value="URGENT">Urgent</option>
                  </select>
                  <input type="date" value={newMilestone.dueDate} onChange={(e) => setNewMilestone({ ...newMilestone, dueDate: e.target.value })} className="rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-3 py-1.5 text-sm" />
                </div>
                <div className="flex gap-2">
                  <button onClick={handleAddMilestone} className="px-3 py-1 bg-primary text-primary-foreground rounded-md text-xs font-medium">Add</button>
                  <button onClick={() => setShowAddMilestone(false)} className="px-3 py-1 text-xs font-medium text-gray-500 hover:text-gray-700">Cancel</button>
                </div>
              </div>
            )}
            {project.milestones.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No milestones yet</p>
            ) : (
              <div className="space-y-3">
                {project.milestones.map((m) => (
                  <div key={m.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 dark:border-zinc-800">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${m.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {m.status === 'COMPLETED' ? <CheckCircle size={16} /> : <Target size={16} />}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{m.title}</p>
                        <p className="text-xs text-gray-500">{m.dueDate ? `Due ${new Date(m.dueDate).toLocaleDateString()}` : 'No due date'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${PRIORITY_COLORS[m.priority] || ''}`}>{m.priority}</span>
                      <select value={m.status} onChange={(e) => handleUpdateMilestoneStatus(m.id, e.target.value)} className={`text-xs px-2 py-1 rounded-full border-0 font-medium cursor-pointer ${MILESTONE_STATUS_COLORS[m.status] || ''}`}>
                        <option value="PENDING">Pending</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="COMPLETED">Completed</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Activity */}
          {project.activities.length > 0 && (
            <div className="border border-gray-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 p-6">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Activity</h3>
              <div className="space-y-4">
                {project.activities.map((a) => (
                  <div key={a.id} className="flex items-start gap-3 pb-4 border-b border-gray-100 dark:border-zinc-800 last:border-0 last:pb-0">
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">{a.user.firstName?.[0]}{a.user.lastName?.[0]}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm"><span className="font-medium">{a.user.firstName} {a.user.lastName}</span> <span className="text-gray-600 dark:text-gray-400">{a.action.replace(/_/g, ' ').toLowerCase()}</span></p>
                      <p className="text-xs text-gray-400 mt-1">{new Date(a.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Details */}
          <div className="border border-gray-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 p-6">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Details</h3>
            <div className="space-y-3">
              <div><p className="text-xs text-gray-500 mb-1">Project Manager</p>
                {project.projectManager ? <div className="flex items-center gap-2"><div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">{project.projectManager.firstName?.[0]}{project.projectManager.lastName?.[0]}</div><span className="text-sm">{project.projectManager.firstName} {project.projectManager.lastName}</span></div> : <p className="text-sm text-gray-400">Unassigned</p>}
              </div>
              <div><p className="text-xs text-gray-500 mb-1">Budget</p><p className="text-sm font-medium flex items-center gap-1"><DollarSign size={14} className="text-gray-400" />{project.budget ? `${project.currency} ${project.budget.toLocaleString()}` : '-'}</p></div>
              <div><p className="text-xs text-gray-500 mb-1">Start Date</p><p className="text-sm">{project.startDate ? new Date(project.startDate).toLocaleDateString() : '-'}</p></div>
              <div><p className="text-xs text-gray-500 mb-1">End Date</p><p className="text-sm">{project.endDate ? new Date(project.endDate).toLocaleDateString() : '-'}</p></div>
              <div><p className="text-xs text-gray-500 mb-1">Created</p><p className="text-sm">{new Date(project.createdAt).toLocaleDateString()}</p></div>
            </div>
          </div>

          {/* Associations */}
          <div className="border border-gray-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 p-6">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Associations</h3>
            <div className="space-y-3">
              {project.company && <Link href={`/${orgSlug}/crm/companies/${project.company.id}`} className="flex items-center gap-2 text-sm hover:text-primary"><Building2 size={14} className="text-gray-400" />{project.company.name}</Link>}
              {project.client && <div className="flex items-center gap-2 text-sm"><Building2 size={14} className="text-gray-400" />{project.client.companyName}</div>}
              {project.contract && <Link href={`/${orgSlug}/crm/contracts/${project.contract.id}`} className="flex items-center gap-2 text-sm hover:text-primary"><ScrollText size={14} className="text-gray-400" />{project.contract.title}</Link>}
              {!project.company && !project.client && !project.contract && <p className="text-sm text-gray-400">No associations</p>}
            </div>
          </div>

          {/* Team Members */}
          <div className="border border-gray-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Team ({project.members.length})</h3>
              <button onClick={() => { setShowAddMember(true); fetchUsers(); }} className="text-xs text-primary hover:text-primary/80"><Plus size={14} /></button>
            </div>
            {showAddMember && (
              <div className="mb-3 flex gap-2">
                <select value={newMemberId} onChange={(e) => setNewMemberId(e.target.value)} className="flex-1 rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-2 py-1 text-xs">
                  <option value="">Select member</option>{users.filter((u) => !project.members.some((m) => m.userId === u.id)).map((u) => <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>)}
                </select>
                <button onClick={handleAddMember} className="px-2 py-1 bg-primary text-primary-foreground rounded-md text-xs">Add</button>
                <button onClick={() => setShowAddMember(false)} className="px-2 py-1 text-xs text-gray-500">Cancel</button>
              </div>
            )}
            <div className="space-y-2">
              {project.members.map((m) => (
                <div key={m.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">{m.user.firstName?.[0]}{m.user.lastName?.[0]}</div>
                    <span className="text-sm">{m.user.firstName} {m.user.lastName}</span>
                  </div>
                  <button onClick={() => handleRemoveMember(m.userId)} className="text-gray-400 hover:text-red-500"><X size={14} /></button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Delete Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg max-w-md w-full p-6">
            <h3 className="text-lg font-bold mb-2">Delete Project</h3>
            <p className="text-sm text-gray-500 mb-6">Are you sure you want to delete <strong>{project.projectName}</strong>?</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowDeleteConfirm(false)} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md">Cancel</button>
              <button onClick={handleDelete} className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
