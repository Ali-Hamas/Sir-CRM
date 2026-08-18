'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import {
  ArrowLeft, Edit, Trash2, FolderKanban, DollarSign, Calendar, Building2,
  Users, Clock, CheckCircle, Plus, X, AlertTriangle, Target, ScrollText,
  Columns3, CheckSquare, ListTodo, ChevronRight, Activity
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
  IN_PROGRESS: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  COMPLETED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  CANCELLED: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400',
};

const PRIORITY_COLORS: Record<string, string> = {
  LOW: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
  MEDIUM: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  HIGH: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  URGENT: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const PHASE_STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-gray-100 text-gray-700 dark:bg-zinc-800 dark:text-gray-300',
  IN_PROGRESS: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  COMPLETED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
};

const MILESTONE_STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-gray-100 text-gray-700 dark:bg-zinc-800 dark:text-gray-300',
  IN_PROGRESS: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  COMPLETED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
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
  const [memberRole, setMemberRole] = useState('MEMBER');
  const [updatingProgress, setUpdatingProgress] = useState(false);
  const [taskCount, setTaskCount] = useState(0);

  const fetchProject = useCallback(async () => {
    try {
      const data = await apiFetch(`/organizations/${orgSlug}/projects/${projectId}`);
      setProject(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [orgSlug, projectId]);

  useEffect(() => {
    fetchProject();
    apiFetch(`/organizations/${orgSlug}/tasks?projectId=${projectId}&limit=1`).then((data) => {
      setTaskCount(data.total || 0);
    }).catch(() => {});
  }, [fetchProject, orgSlug, projectId]);

  const fetchUsers = async () => {
    try {
      const data = await apiFetch(`/organizations/${orgSlug}/team/members?limit=100`);
      setUsers(data.items?.map((m: any) => m.user) || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async () => {
    try {
      await apiFetch(`/organizations/${orgSlug}/projects/${projectId}`, { method: 'DELETE' });
      router.push(`/${orgSlug}/projects`);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddMember = async () => {
    if (!newMemberId) return;
    try {
      await apiFetch(`/organizations/${orgSlug}/projects/${projectId}/members`, {
        method: 'POST',
        body: JSON.stringify({ memberId: newMemberId, role: memberRole }),
      });
      setNewMemberId('');
      setMemberRole('MEMBER');
      setShowAddMember(false);
      fetchProject();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      await apiFetch(`/organizations/${orgSlug}/projects/${projectId}/members/${memberId}`, { method: 'DELETE' });
      fetchProject();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddPhase = async () => {
    if (!newPhase.name.trim()) return;
    try {
      await apiFetch(`/organizations/${orgSlug}/projects/${projectId}/phases`, {
        method: 'POST',
        body: JSON.stringify({ ...newPhase, sortOrder: project?.phases.length || 0 }),
      });
      setNewPhase({ name: '', description: '' });
      setShowAddPhase(false);
      fetchProject();
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdatePhaseStatus = async (phaseId: string, status: string) => {
    try {
      await apiFetch(`/organizations/${orgSlug}/projects/${projectId}/phases/${phaseId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      fetchProject();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemovePhase = async (phaseId: string) => {
    try {
      await apiFetch(`/organizations/${orgSlug}/projects/${projectId}/phases/${phaseId}`, { method: 'DELETE' });
      fetchProject();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddMilestone = async () => {
    if (!newMilestone.title.trim()) return;
    try {
      await apiFetch(`/organizations/${orgSlug}/projects/${projectId}/milestones`, {
        method: 'POST',
        body: JSON.stringify(newMilestone),
      });
      setNewMilestone({ title: '', description: '', priority: 'MEDIUM', dueDate: '' });
      setShowAddMilestone(false);
      fetchProject();
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateMilestoneStatus = async (milestoneId: string, status: string) => {
    try {
      await apiFetch(`/organizations/${orgSlug}/projects/${projectId}/milestones/${milestoneId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      fetchProject();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveMilestone = async (milestoneId: string) => {
    try {
      await apiFetch(`/organizations/${orgSlug}/projects/${projectId}/milestones/${milestoneId}`, { method: 'DELETE' });
      fetchProject();
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateProgress = async (progress: number) => {
    setUpdatingProgress(true);
    // Optimistic
    if (project) setProject({ ...project, progress });
    try {
      await apiFetch(`/organizations/${orgSlug}/projects/${projectId}`, {
        method: 'PATCH',
        body: JSON.stringify({ progress: String(progress) }),
      });
      fetchProject();
    } catch (err) {
      console.error(err);
      fetchProject();
    } finally {
      setUpdatingProgress(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <p className="text-sm text-gray-500">Loading project details...</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-20">
        <AlertTriangle size={40} className="mx-auto text-amber-500 mb-3" />
        <h3 className="text-lg font-semibold">Project not found</h3>
        <p className="text-sm text-gray-500 mb-4">This project may have been deleted or moved.</p>
        <Link href={`/${orgSlug}/projects`} className="text-sm font-medium text-primary hover:underline">
          Return to Projects
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <button onClick={() => router.back()} className="mt-1 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="text-xs text-gray-600 dark:text-gray-400 font-mono bg-gray-100 dark:bg-zinc-800 px-2 py-0.5 rounded font-semibold">
                {project.projectCode}
              </span>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[project.status] || ''}`}>
                {project.status.replace(/_/g, ' ')}
              </span>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${PRIORITY_COLORS[project.priority] || ''}`}>
                {project.priority}
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-zinc-100">{project.projectName}</h1>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href={`/${orgSlug}/projects/tasks?projectId=${projectId}`}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm font-medium hover:bg-gray-50 dark:hover:bg-zinc-800 shadow-sm"
          >
            <ListTodo size={16} className="text-blue-500" /> Tasks ({taskCount})
          </Link>
          <Link
            href={`/${orgSlug}/projects/tasks/kanban?projectId=${projectId}`}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm font-medium hover:bg-gray-50 dark:hover:bg-zinc-800 shadow-sm"
          >
            <Columns3 size={16} className="text-purple-500" /> Kanban
          </Link>
          <Link
            href={`/${orgSlug}/projects/time-tracking?projectId=${projectId}`}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm font-medium hover:bg-gray-50 dark:hover:bg-zinc-800 shadow-sm"
          >
            <Clock size={16} className="text-amber-500" /> Time
          </Link>
          <Link
            href={`/${orgSlug}/projects/${projectId}/edit`}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm font-medium hover:bg-gray-50 dark:hover:bg-zinc-800 shadow-sm"
          >
            <Edit size={16} /> Edit
          </Link>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-red-200 dark:border-red-900 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors shadow-sm"
          >
            <Trash2 size={16} /> Delete
          </button>
        </div>
      </div>

      {/* Progress Bar & Quick Adjust */}
      <div className="border border-gray-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold">Overall Project Completion</span>
          <span className="text-sm font-bold text-primary">{project.progress}%</span>
        </div>
        <div className="w-full h-2.5 bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden mb-3">
          <div
            className="h-full bg-primary rounded-full transition-all duration-300"
            style={{ width: `${project.progress}%` }}
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-500 mr-2">Set Progress:</span>
          {[0, 25, 50, 75, 100].map((p) => (
            <button
              key={p}
              disabled={updatingProgress}
              onClick={() => handleUpdateProgress(p)}
              className={`text-xs px-2.5 py-1 rounded-md font-medium transition-all ${
                project.progress === p
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              {p}%
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          {project.description && (
            <div className="border border-gray-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900 p-6 shadow-sm">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Description</h3>
              <p className="text-sm leading-relaxed whitespace-pre-wrap text-gray-700 dark:text-zinc-300">{project.description}</p>
            </div>
          )}

          {/* Phases */}
          <div className="border border-gray-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Phases</h3>
                <span className="text-xs bg-gray-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full text-gray-600 dark:text-gray-400 font-medium">
                  {project.phases.length}
                </span>
              </div>
              <button
                onClick={() => { setShowAddPhase(true); fetchUsers(); }}
                className="inline-flex items-center gap-1 text-xs text-primary font-semibold hover:underline"
              >
                <Plus size={14} /> Add Phase
              </button>
            </div>

            {showAddPhase && (
              <div className="mb-4 p-4 border border-primary/20 rounded-lg bg-primary/5 space-y-3">
                <input
                  type="text"
                  value={newPhase.name}
                  onChange={(e) => setNewPhase({ ...newPhase, name: e.target.value })}
                  placeholder="Phase name (e.g. Discovery, Execution)"
                  className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5 text-sm"
                />
                <input
                  type="text"
                  value={newPhase.description}
                  onChange={(e) => setNewPhase({ ...newPhase, description: e.target.value })}
                  placeholder="Phase description (optional)"
                  className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5 text-sm"
                />
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setShowAddPhase(false)} className="px-3 py-1 text-xs font-medium text-gray-500 hover:text-gray-700">Cancel</button>
                  <button onClick={handleAddPhase} className="px-3 py-1 bg-primary text-primary-foreground rounded-md text-xs font-medium shadow-sm">Save Phase</button>
                </div>
              </div>
            )}

            {project.phases.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No phases defined yet</p>
            ) : (
              <div className="space-y-2.5">
                {project.phases.map((phase, idx) => (
                  <div key={phase.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 dark:border-zinc-800 hover:bg-gray-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                        {idx + 1}
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{phase.name}</p>
                        {phase.description && <p className="text-xs text-gray-500 mt-0.5">{phase.description}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={phase.status}
                        onChange={(e) => handleUpdatePhaseStatus(phase.id, e.target.value)}
                        className={`text-xs px-2.5 py-1 rounded-full border-0 font-semibold cursor-pointer ${PHASE_STATUS_COLORS[phase.status] || ''}`}
                      >
                        <option value="PENDING">Pending</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="COMPLETED">Completed</option>
                      </select>
                      <button onClick={() => handleRemovePhase(phase.id)} className="text-gray-400 hover:text-red-500 p-1">
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Milestones */}
          <div className="border border-gray-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Milestones</h3>
                <span className="text-xs bg-gray-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full text-gray-600 dark:text-gray-400 font-medium">
                  {project.milestones.length}
                </span>
              </div>
              <button
                onClick={() => setShowAddMilestone(true)}
                className="inline-flex items-center gap-1 text-xs text-primary font-semibold hover:underline"
              >
                <Plus size={14} /> Add Milestone
              </button>
            </div>

            {showAddMilestone && (
              <div className="mb-4 p-4 border border-primary/20 rounded-lg bg-primary/5 space-y-3">
                <input
                  type="text"
                  value={newMilestone.title}
                  onChange={(e) => setNewMilestone({ ...newMilestone, title: e.target.value })}
                  placeholder="Milestone title"
                  className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5 text-sm"
                />
                <input
                  type="text"
                  value={newMilestone.description}
                  onChange={(e) => setNewMilestone({ ...newMilestone, description: e.target.value })}
                  placeholder="Description (optional)"
                  className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5 text-sm"
                />
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={newMilestone.priority}
                    onChange={(e) => setNewMilestone({ ...newMilestone, priority: e.target.value })}
                    className="rounded-md border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5 text-sm"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                  <input
                    type="date"
                    value={newMilestone.dueDate}
                    onChange={(e) => setNewMilestone({ ...newMilestone, dueDate: e.target.value })}
                    className="rounded-md border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5 text-sm"
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setShowAddMilestone(false)} className="px-3 py-1 text-xs font-medium text-gray-500 hover:text-gray-700">Cancel</button>
                  <button onClick={handleAddMilestone} className="px-3 py-1 bg-primary text-primary-foreground rounded-md text-xs font-medium shadow-sm">Save Milestone</button>
                </div>
              </div>
            )}

            {project.milestones.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No milestones scheduled</p>
            ) : (
              <div className="space-y-2.5">
                {project.milestones.map((m) => (
                  <div key={m.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 dark:border-zinc-800 hover:bg-gray-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                        m.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30' : 'bg-gray-100 text-gray-500 dark:bg-zinc-800'
                      }`}>
                        {m.status === 'COMPLETED' ? <CheckCircle size={15} /> : <Target size={15} />}
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{m.title}</p>
                        <p className="text-xs text-gray-500">
                          {m.dueDate ? `Due ${new Date(m.dueDate).toLocaleDateString()}` : 'No due date'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${PRIORITY_COLORS[m.priority] || ''}`}>{m.priority}</span>
                      <select
                        value={m.status}
                        onChange={(e) => handleUpdateMilestoneStatus(m.id, e.target.value)}
                        className={`text-xs px-2.5 py-1 rounded-full border-0 font-semibold cursor-pointer ${MILESTONE_STATUS_COLORS[m.status] || ''}`}
                      >
                        <option value="PENDING">Pending</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="COMPLETED">Completed</option>
                      </select>
                      <button onClick={() => handleRemoveMilestone(m.id)} className="text-gray-400 hover:text-red-500 p-1">
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Activity Log */}
          {project.activities.length > 0 && (
            <div className="border border-gray-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900 p-6 shadow-sm">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Activity size={14} /> Recent Activity
              </h3>
              <div className="space-y-3.5">
                {project.activities.map((a) => (
                  <div key={a.id} className="flex items-start gap-3 pb-3 border-b border-gray-100 dark:border-zinc-800/80 last:border-0 last:pb-0">
                    <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">
                      {a.user?.firstName?.[0] || 'U'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-700 dark:text-zinc-300">
                        <span className="font-semibold text-gray-900 dark:text-zinc-100">{a.user?.firstName} {a.user?.lastName}</span>{' '}
                        {a.action.replace(/_/g, ' ').toLowerCase()}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{new Date(a.createdAt).toLocaleString()}</p>
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
          <div className="border border-gray-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900 p-6 shadow-sm">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Project Details</h3>
            <div className="space-y-3.5 text-sm">
              <div>
                <p className="text-xs text-gray-500 mb-1">Project Manager</p>
                {project.projectManager ? (
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">
                      {project.projectManager.firstName?.[0]}{project.projectManager.lastName?.[0]}
                    </div>
                    <span className="font-medium">{project.projectManager.firstName} {project.projectManager.lastName}</span>
                  </div>
                ) : (
                  <p className="text-gray-400 italic">Unassigned</p>
                )}
              </div>

              <div>
                <p className="text-xs text-gray-500 mb-1">Budget</p>
                <p className="font-semibold flex items-center gap-1">
                  <DollarSign size={14} className="text-gray-400" />
                  {project.budget ? `${project.currency} ${project.budget.toLocaleString()}` : '-'}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500 mb-1">Timeline</p>
                <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-zinc-400">
                  <Calendar size={13} className="text-gray-400" />
                  <span>{project.startDate ? new Date(project.startDate).toLocaleDateString() : 'Start TBD'}</span>
                  <span>&rarr;</span>
                  <span>{project.endDate ? new Date(project.endDate).toLocaleDateString() : 'End TBD'}</span>
                </div>
              </div>

              <div>
                <p className="text-xs text-gray-500 mb-1">Created</p>
                <p className="text-xs text-gray-500">{new Date(project.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
          </div>

          {/* Associations */}
          <div className="border border-gray-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900 p-6 shadow-sm">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Associations</h3>
            <div className="space-y-3 text-sm">
              {project.company && (
                <Link href={`/${orgSlug}/crm/companies/${project.company.id}`} className="flex items-center gap-2 hover:text-primary transition-colors">
                  <Building2 size={15} className="text-gray-400" />
                  <span className="font-medium">{project.company.name}</span>
                </Link>
              )}
              {project.client && (
                <div className="flex items-center gap-2 text-gray-700 dark:text-zinc-300">
                  <Building2 size={15} className="text-gray-400" />
                  <span>{project.client.companyName}</span>
                </div>
              )}
              {project.contract && (
                <Link href={`/${orgSlug}/crm/contracts/${project.contract.id}`} className="flex items-center gap-2 hover:text-primary transition-colors">
                  <ScrollText size={15} className="text-gray-400" />
                  <span className="font-medium">{project.contract.title}</span>
                </Link>
              )}
              {!project.company && !project.client && !project.contract && (
                <p className="text-xs text-gray-400 italic">No linked CRM records</p>
              )}
            </div>
          </div>

          {/* Team Members */}
          <div className="border border-gray-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Team Members ({project.members.length})
              </h3>
              <button
                onClick={() => { setShowAddMember(true); fetchUsers(); }}
                className="text-xs text-primary font-semibold hover:underline"
              >
                <Plus size={14} /> Add
              </button>
            </div>

            {showAddMember && (
              <div className="mb-3 p-3 border border-primary/20 rounded-lg bg-primary/5 space-y-2">
                <select
                  value={newMemberId}
                  onChange={(e) => setNewMemberId(e.target.value)}
                  className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 py-1.5 text-xs"
                >
                  <option value="">Select User</option>
                  {users.filter((u) => !project.members.some((m) => m.userId === u.id)).map((u) => (
                    <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
                  ))}
                </select>
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setShowAddMember(false)} className="px-2 py-1 text-xs text-gray-500">Cancel</button>
                  <button onClick={handleAddMember} className="px-3 py-1 bg-primary text-primary-foreground rounded-md text-xs font-medium">Add Member</button>
                </div>
              </div>
            )}

            <div className="space-y-2.5">
              {project.members.map((m) => (
                <div key={m.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">
                      {m.user?.firstName?.[0] || 'U'}{m.user?.lastName?.[0] || ''}
                    </div>
                    <div>
                      <p className="text-xs font-semibold">{m.user?.firstName} {m.user?.lastName}</p>
                      <p className="text-[10px] text-gray-400">{m.role || 'Member'}</p>
                    </div>
                  </div>
                  <button onClick={() => handleRemoveMember(m.userId)} className="text-gray-400 hover:text-red-500 p-1">
                    <X size={13} />
                  </button>
                </div>
              ))}
              {project.members.length === 0 && !showAddMember && (
                <p className="text-xs text-gray-400 text-center py-2">No team members assigned</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-2xl max-w-md w-full p-6 border border-gray-200 dark:border-zinc-800">
            <h3 className="text-lg font-bold mb-2 text-gray-900 dark:text-zinc-100">Delete Project</h3>
            <p className="text-sm text-gray-600 dark:text-zinc-400 mb-6">
              Are you sure you want to delete <strong className="text-gray-900 dark:text-zinc-100">{project.projectName}</strong>? This will soft-delete the project.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm transition-colors"
              >
                Delete Project
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
