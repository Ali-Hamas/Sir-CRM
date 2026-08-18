'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import {
  ArrowLeft, Edit, Trash2, Calendar, Users, Clock, CheckCircle, Plus, X,
  MessageSquare, Paperclip, CheckSquare, Link as LinkIcon, AlertTriangle,
  FolderKanban, Columns3, Check
} from 'lucide-react';

interface TaskDetail {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  labels: string | null;
  tags: string | null;
  estimatedHours: number | null;
  dueDate: string | null;
  completedAt: string | null;
  project: { id: string; projectName: string; projectCode: string };
  milestone: { id: string; title: string; status: string } | null;
  reporter: { id: string; firstName: string; lastName: string; email: string; profilePictureUrl: string | null };
  createdBy: { id: string; firstName: string; lastName: string; email: string };
  assignees: { id: string; userId: string; user: { id: string; firstName: string; lastName: string; email: string; profilePictureUrl: string | null } }[];
  comments: { id: string; content: string; user: { id: string; firstName: string; lastName: string; profilePictureUrl: string | null }; createdAt: string }[];
  attachments: { id: string; fileName: string; originalName: string; mimeType: string; size: number; uploadedBy: { firstName: string; lastName: string }; createdAt: string }[];
  checklists: { id: string; title: string; items: { id: string; title: string; isCompleted: boolean; sortOrder: number }[] }[];
  parentDependencies: { id: string; dependsOn: { id: string; title: string; status: string } }[];
  childDependencies: { id: string; task: { id: string; title: string; status: string } }[];
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  BACKLOG: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400',
  TODO: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  IN_PROGRESS: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  IN_REVIEW: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  DONE: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  BLOCKED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

const PRIORITY_COLORS: Record<string, string> = {
  LOW: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
  MEDIUM: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  HIGH: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  CRITICAL: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

export default function TaskDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = params.orgSlug as string;
  const taskId = params.taskId as string;

  const [task, setTask] = useState<TaskDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [newChecklistTitle, setNewChecklistTitle] = useState('');
  const [showNewChecklist, setShowNewChecklist] = useState(false);
  const [newChecklistItems, setNewChecklistItems] = useState('');
  const [users, setUsers] = useState<{ id: string; firstName: string; lastName: string }[]>([]);
  const [showAddAssignee, setShowAddAssignee] = useState(false);
  const [newAssigneeId, setNewAssigneeId] = useState('');
  const [statusUpdating, setStatusUpdating] = useState(false);

  const fetchTask = useCallback(async () => {
    try {
      const data = await apiFetch(`/organizations/${orgSlug}/tasks/${taskId}`);
      setTask(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [orgSlug, taskId]);

  useEffect(() => { fetchTask(); }, [fetchTask]);

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
      await apiFetch(`/organizations/${orgSlug}/tasks/${taskId}`, { method: 'DELETE' });
      router.push(`/${orgSlug}/projects/tasks`);
    } catch (err) {
      console.error(err);
    }
  };

  const handleStatusChange = async (status: string) => {
    if (!task) return;
    setStatusUpdating(true);
    // Optimistic
    setTask({ ...task, status, completedAt: status === 'DONE' ? new Date().toISOString() : null });
    try {
      await apiFetch(`/organizations/${orgSlug}/tasks/${taskId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      fetchTask();
    } catch (err) {
      console.error(err);
      fetchTask();
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    setSubmittingComment(true);
    try {
      await apiFetch(`/organizations/${orgSlug}/tasks/${taskId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ content: newComment }),
      });
      setNewComment('');
      fetchTask();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleAddChecklist = async () => {
    if (!newChecklistTitle.trim()) return;
    const items = newChecklistItems.split('\n').filter((l) => l.trim());
    try {
      await apiFetch(`/organizations/${orgSlug}/tasks/${taskId}/checklists`, {
        method: 'POST',
        body: JSON.stringify({ title: newChecklistTitle, items }),
      });
      setNewChecklistTitle('');
      setNewChecklistItems('');
      setShowNewChecklist(false);
      fetchTask();
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleChecklistItem = async (checklistId: string, itemId: string, isCompleted: boolean) => {
    if (!task) return;
    // Optimistic toggle
    const updatedChecklists = task.checklists.map((cl) => {
      if (cl.id === checklistId) {
        return {
          ...cl,
          items: cl.items.map((it) => it.id === itemId ? { ...it, isCompleted } : it),
        };
      }
      return cl;
    });
    setTask({ ...task, checklists: updatedChecklists });

    try {
      await apiFetch(`/organizations/${orgSlug}/tasks/${taskId}/checklists/items/${itemId}`, {
        method: 'PATCH',
        body: JSON.stringify({ isCompleted }),
      });
    } catch (err) {
      console.error(err);
      fetchTask();
    }
  };

  const handleAddAssignee = async () => {
    if (!newAssigneeId || !task) return;
    try {
      await apiFetch(`/organizations/${orgSlug}/tasks/${taskId}`, {
        method: 'PATCH',
        body: JSON.stringify({ assigneeIds: [...task.assignees.map((a) => a.userId), newAssigneeId] }),
      });
      setNewAssigneeId('');
      setShowAddAssignee(false);
      fetchTask();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveAssignee = async (userId: string) => {
    if (!task) return;
    try {
      await apiFetch(`/organizations/${orgSlug}/tasks/${taskId}`, {
        method: 'PATCH',
        body: JSON.stringify({ assigneeIds: task.assignees.filter((a) => a.userId !== userId).map((a) => a.userId) }),
      });
      fetchTask();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <p className="text-sm text-gray-500">Loading task details...</p>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="text-center py-20">
        <AlertTriangle size={40} className="mx-auto text-amber-500 mb-3" />
        <h3 className="text-lg font-semibold">Task not found</h3>
        <p className="text-sm text-gray-500 mb-4">This task may have been removed.</p>
        <Link href={`/${orgSlug}/projects/tasks`} className="text-sm font-medium text-primary hover:underline">
          Return to Tasks
        </Link>
      </div>
    );
  }

  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'DONE';
  const totalChecklistItems = task.checklists.reduce((acc, cl) => acc + cl.items.length, 0);
  const completedChecklistItems = task.checklists.reduce((acc, cl) => acc + cl.items.filter((i) => i.isCompleted).length, 0);

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
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[task.status] || ''}`}>
                {task.status.replace(/_/g, ' ')}
              </span>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${PRIORITY_COLORS[task.priority] || ''}`}>
                {task.priority}
              </span>
              {isOverdue && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                  <AlertTriangle size={12} /> Overdue
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-zinc-100">{task.title}</h1>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Status Quick Selector */}
          <select
            value={task.status}
            disabled={statusUpdating}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="px-3 py-2 rounded-md border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm font-semibold shadow-sm cursor-pointer"
          >
            <option value="BACKLOG">Backlog</option>
            <option value="TODO">To Do</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="IN_REVIEW">In Review</option>
            <option value="DONE">Done</option>
            <option value="BLOCKED">Blocked</option>
          </select>

          <Link
            href={`/${orgSlug}/projects/time-tracking?taskId=${taskId}&projectId=${task.project.id}`}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300 text-sm font-medium hover:bg-amber-100 shadow-sm"
          >
            <Clock size={16} /> Track Time
          </Link>

          <Link
            href={`/${orgSlug}/projects/tasks/kanban?projectId=${task.project.id}`}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm font-medium hover:bg-gray-50 dark:hover:bg-zinc-800 shadow-sm"
          >
            <Columns3 size={16} /> Kanban
          </Link>

          <Link
            href={`/${orgSlug}/projects/tasks/${taskId}/edit`}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm font-medium hover:bg-gray-50 dark:hover:bg-zinc-800 shadow-sm"
          >
            <Edit size={16} /> Edit
          </Link>

          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-red-200 dark:border-red-900 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 shadow-sm"
          >
            <Trash2 size={16} /> Delete
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          {task.description && (
            <div className="border border-gray-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900 p-6 shadow-sm">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Description</h3>
              <p className="text-sm leading-relaxed whitespace-pre-wrap text-gray-800 dark:text-zinc-200">{task.description}</p>
            </div>
          )}

          {/* Checklists */}
          <div className="border border-gray-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Checklist {totalChecklistItems > 0 && <span className="text-gray-400">({completedChecklistItems}/{totalChecklistItems})</span>}
                </h3>
              </div>
              <button
                onClick={() => { setShowNewChecklist(true); fetchUsers(); }}
                className="inline-flex items-center gap-1 text-xs text-primary font-semibold hover:underline"
              >
                <Plus size={14} /> Add Checklist
              </button>
            </div>

            {showNewChecklist && (
              <div className="mb-4 p-4 border border-primary/20 rounded-lg bg-primary/5 space-y-3">
                <input
                  type="text"
                  value={newChecklistTitle}
                  onChange={(e) => setNewChecklistTitle(e.target.value)}
                  placeholder="Checklist title (e.g. Acceptance Criteria)"
                  className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5 text-sm"
                />
                <textarea
                  value={newChecklistItems}
                  onChange={(e) => setNewChecklistItems(e.target.value)}
                  placeholder="Enter items (one item per line)"
                  rows={3}
                  className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5 text-sm resize-none"
                />
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setShowNewChecklist(false)} className="px-3 py-1 text-xs font-medium text-gray-500 hover:text-gray-700">Cancel</button>
                  <button onClick={handleAddChecklist} className="px-3 py-1 bg-primary text-primary-foreground rounded-md text-xs font-medium shadow-sm">Save Checklist</button>
                </div>
              </div>
            )}

            {task.checklists.map((cl) => {
              const clTotal = cl.items.length;
              const clCompleted = cl.items.filter((i) => i.isCompleted).length;
              const percent = clTotal > 0 ? Math.round((clCompleted / clTotal) * 100) : 0;

              return (
                <div key={cl.id} className="mb-5 last:mb-0 p-3.5 border border-gray-100 dark:border-zinc-800 rounded-lg bg-gray-50/40 dark:bg-zinc-800/20">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold">{cl.title}</span>
                    <span className="text-xs text-gray-500 font-medium">{clCompleted}/{clTotal} ({percent}%)</span>
                  </div>
                  <div className="w-full h-1.5 bg-gray-200 dark:bg-zinc-700 rounded-full mb-3 overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <div className="space-y-2">
                    {cl.items.sort((a, b) => a.sortOrder - b.sortOrder).map((item) => (
                      <label key={item.id} className="flex items-start gap-2.5 text-sm cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={item.isCompleted}
                          onChange={(e) => handleToggleChecklistItem(cl.id, item.id, e.target.checked)}
                          className="mt-0.5 rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
                        />
                        <span className={`transition-all ${item.isCompleted ? 'line-through text-gray-400 dark:text-zinc-500' : 'text-gray-800 dark:text-zinc-200 group-hover:text-primary'}`}>
                          {item.title}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}

            {task.checklists.length === 0 && !showNewChecklist && (
              <p className="text-sm text-gray-400 text-center py-6">No checklists added yet</p>
            )}
          </div>

          {/* Dependencies */}
          {(task.parentDependencies.length > 0 || task.childDependencies.length > 0) && (
            <div className="border border-gray-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900 p-6 shadow-sm">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Dependencies</h3>
              {task.parentDependencies.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs text-gray-500 mb-2">Depends on:</p>
                  {task.parentDependencies.map((dep) => (
                    <Link key={dep.id} href={`/${orgSlug}/projects/tasks/${dep.dependsOn.id}`} className="flex items-center gap-2 text-sm hover:text-primary mb-1">
                      <LinkIcon size={12} className="text-gray-400" />
                      <span>{dep.dependsOn.title}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${STATUS_COLORS[dep.dependsOn.status] || ''}`}>{dep.dependsOn.status.replace(/_/g, ' ')}</span>
                    </Link>
                  ))}
                </div>
              )}
              {task.childDependencies.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 mb-2">Blocks:</p>
                  {task.childDependencies.map((dep) => (
                    <Link key={dep.id} href={`/${orgSlug}/projects/tasks/${dep.task.id}`} className="flex items-center gap-2 text-sm hover:text-primary mb-1">
                      <LinkIcon size={12} className="text-gray-400" />
                      <span>{dep.task.title}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${STATUS_COLORS[dep.task.status] || ''}`}>{dep.task.status.replace(/_/g, ' ')}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Comments */}
          <div className="border border-gray-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900 p-6 shadow-sm">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
              <MessageSquare size={14} /> Comments ({task.comments.length})
            </h3>
            <div className="flex gap-3 mb-5">
              <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                {task.createdBy?.firstName?.[0] || 'U'}
              </div>
              <div className="flex-1 space-y-2">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Write a comment..."
                  rows={2}
                  className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                />
                <div className="flex justify-end">
                  <button
                    onClick={handleAddComment}
                    disabled={!newComment.trim() || submittingComment}
                    className="px-3.5 py-1.5 bg-primary text-primary-foreground rounded-md text-xs font-medium disabled:opacity-50 shadow-sm"
                  >
                    {submittingComment ? 'Posting...' : 'Post Comment'}
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-3.5">
              {task.comments.map((c) => (
                <div key={c.id} className="flex gap-3 pb-3.5 border-b border-gray-100 dark:border-zinc-800/80 last:border-0 last:pb-0">
                  <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                    {c.user?.firstName?.[0] || 'U'}{c.user?.lastName?.[0] || ''}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold">{c.user?.firstName} {c.user?.lastName}</span>
                      <span className="text-[10px] text-gray-400">{new Date(c.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="text-xs text-gray-700 dark:text-zinc-300 whitespace-pre-wrap">{c.content}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Details */}
          <div className="border border-gray-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900 p-6 shadow-sm">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Task Details</h3>
            <div className="space-y-3.5 text-sm">
              <div>
                <p className="text-xs text-gray-500 mb-1">Project</p>
                <Link href={`/${orgSlug}/projects/${task.project.id}`} className="flex items-center gap-1.5 text-sm font-semibold hover:text-primary transition-colors">
                  <FolderKanban size={14} className="text-primary" />
                  {task.project.projectName}
                </Link>
              </div>

              {task.milestone && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Milestone</p>
                  <p className="text-xs font-medium text-gray-800 dark:text-zinc-200">{task.milestone.title}</p>
                </div>
              )}

              <div>
                <p className="text-xs text-gray-500 mb-1">Reporter</p>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[8px] font-bold">
                    {task.reporter?.firstName?.[0] || 'U'}
                  </div>
                  <span className="text-xs font-medium">{task.reporter?.firstName} {task.reporter?.lastName}</span>
                </div>
              </div>

              <div>
                <p className="text-xs text-gray-500 mb-1">Estimated Hours</p>
                <p className="text-xs font-semibold">{task.estimatedHours ? `${task.estimatedHours} hrs` : '-'}</p>
              </div>

              <div>
                <p className="text-xs text-gray-500 mb-1">Due Date</p>
                <p className={`text-xs font-semibold flex items-center gap-1 ${isOverdue ? 'text-red-600' : 'text-gray-700 dark:text-zinc-300'}`}>
                  <Calendar size={13} className={isOverdue ? 'text-red-500' : 'text-gray-400'} />
                  {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date'}
                  {isOverdue && <span className="text-[10px] ml-1 font-bold">(Overdue)</span>}
                </p>
              </div>

              {task.completedAt && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Completed At</p>
                  <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                    <CheckCircle size={13} />
                    {new Date(task.completedAt).toLocaleString()}
                  </p>
                </div>
              )}

              {task.labels && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Labels</p>
                  <div className="flex flex-wrap gap-1">
                    {task.labels.split(',').map((l, i) => (
                      <span key={i} className="text-[10px] bg-gray-100 dark:bg-zinc-800 px-2 py-0.5 rounded font-medium">
                        {l.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Assignees */}
          <div className="border border-gray-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Assignees ({task.assignees.length})
              </h3>
              <button
                onClick={() => { setShowAddAssignee(true); fetchUsers(); }}
                className="text-xs text-primary font-semibold hover:underline"
              >
                <Plus size={14} /> Add
              </button>
            </div>

            {showAddAssignee && (
              <div className="mb-3 p-3 border border-primary/20 rounded-lg bg-primary/5 space-y-2">
                <select
                  value={newAssigneeId}
                  onChange={(e) => setNewAssigneeId(e.target.value)}
                  className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 py-1.5 text-xs"
                >
                  <option value="">Select Member</option>
                  {users.filter((u) => !task.assignees.some((a) => a.userId === u.id)).map((u) => (
                    <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
                  ))}
                </select>
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setShowAddAssignee(false)} className="px-2 py-1 text-xs text-gray-500">Cancel</button>
                  <button onClick={handleAddAssignee} className="px-3 py-1 bg-primary text-primary-foreground rounded-md text-xs font-medium">Add</button>
                </div>
              </div>
            )}

            <div className="space-y-2.5">
              {task.assignees.map((a) => (
                <div key={a.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">
                      {a.user?.firstName?.[0] || 'U'}{a.user?.lastName?.[0] || ''}
                    </div>
                    <span className="text-xs font-semibold">{a.user?.firstName} {a.user?.lastName}</span>
                  </div>
                  <button onClick={() => handleRemoveAssignee(a.userId)} className="text-gray-400 hover:text-red-500 p-1">
                    <X size={13} />
                  </button>
                </div>
              ))}
              {task.assignees.length === 0 && !showAddAssignee && (
                <p className="text-xs text-gray-400 text-center py-2">No assignees</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Delete Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-2xl max-w-md w-full p-6 border border-gray-200 dark:border-zinc-800">
            <h3 className="text-lg font-bold mb-2 text-gray-900 dark:text-zinc-100">Delete Task</h3>
            <p className="text-sm text-gray-600 dark:text-zinc-400 mb-6">
              Are you sure you want to delete <strong className="text-gray-900 dark:text-zinc-100">{task.title}</strong>?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm"
              >
                Delete Task
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
