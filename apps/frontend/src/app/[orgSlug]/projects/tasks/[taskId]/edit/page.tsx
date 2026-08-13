'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { ArrowLeft, Save } from 'lucide-react';

interface Project { id: string; projectName: string; projectCode: string; }
interface Milestone { id: string; title: string; }
interface User { id: string; firstName: string; lastName: string; }

export default function EditTaskPage() {
  const router = useRouter();
  const params = useParams();
  const orgSlug = params.orgSlug as string;
  const taskId = params.taskId as string;

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);

  const [form, setForm] = useState({
    title: '', description: '', status: 'TODO', priority: 'MEDIUM',
    labels: '', tags: '', estimatedHours: '', dueDate: '',
    projectId: '', milestoneId: '', reporterId: '',
  });

  useEffect(() => {
    Promise.all([
      apiFetch(`/organizations/${orgSlug}/tasks/${taskId}`),
      apiFetch(`/organizations/${orgSlug}/projects?limit=200`).catch(() => ({ items: [] })),
      apiFetch(`/organizations/${orgSlug}/team/members?limit=100`).catch(() => ({ items: [] })),
    ]).then(([task, p, u]) => {
      setForm({
        title: task.title || '',
        description: task.description || '',
        status: task.status || 'TODO',
        priority: task.priority || 'MEDIUM',
        labels: task.labels || '',
        tags: task.tags || '',
        estimatedHours: task.estimatedHours ? String(task.estimatedHours) : '',
        dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
        projectId: task.projectId || '',
        milestoneId: task.milestoneId || '',
        reporterId: task.reporterId || '',
      });
      setSelectedAssignees(task.assignees?.map((a: any) => a.userId) || []);
      setProjects(p.items?.map((i: any) => ({ id: i.id, projectName: i.projectName, projectCode: i.projectCode })) || []);
      setUsers(u.items?.map((m: any) => m.user) || []);

      if (task.projectId) {
        apiFetch(`/organizations/${orgSlug}/projects/${task.projectId}`).then((data: any) => {
          setMilestones(data.milestones || []);
        }).catch(() => {});
      }
      setLoading(false);
    }).catch(() => { setLoading(false); });
  }, [orgSlug, taskId]);

  useEffect(() => {
    if (form.projectId) {
      apiFetch(`/organizations/${orgSlug}/projects/${form.projectId}`).then((data: any) => {
        setMilestones(data.milestones || []);
      }).catch(() => setMilestones([]));
    }
  }, [orgSlug, form.projectId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const toggleAssignee = (userId: string) => {
    setSelectedAssignees((prev) => prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { setError('Title is required'); return; }
    setSaving(true); setError('');
    try {
      const payload: any = {
        title: form.title, description: form.description || null,
        status: form.status, priority: form.priority,
        labels: form.labels || null, tags: form.tags || null,
        projectId: form.projectId, milestoneId: form.milestoneId || null,
        reporterId: form.reporterId || null,
        assigneeIds: selectedAssignees,
        estimatedHours: form.estimatedHours || null,
        dueDate: form.dueDate || null,
      };
      await apiFetch(`/organizations/${orgSlug}/tasks/${taskId}`, { method: 'PATCH', body: JSON.stringify(payload) });
      router.push(`/${orgSlug}/projects/tasks/${taskId}`);
    } catch (err: any) { setError(err.message || 'Failed to update task'); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"><ArrowLeft size={20} /></button>
        <div><h1 className="text-2xl font-bold tracking-tight">Edit Task</h1><p className="text-sm text-gray-500 mt-1">Update task details</p></div>
      </div>
      {error && <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900 rounded-lg p-4 text-sm text-red-700 dark:text-red-400">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="border border-gray-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 p-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Task Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1">Title *</label>
              <input type="text" name="title" value={form.title} onChange={handleChange} className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" required />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea name="description" value={form.description} onChange={handleChange} rows={4} className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select name="status" value={form.status} onChange={handleChange} className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm">
                <option value="BACKLOG">Backlog</option>
                <option value="TODO">To Do</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="IN_REVIEW">In Review</option>
                <option value="DONE">Done</option>
                <option value="BLOCKED">Blocked</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Priority</label>
              <select name="priority" value={form.priority} onChange={handleChange} className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm">
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Estimated Hours</label>
              <input type="number" name="estimatedHours" value={form.estimatedHours} onChange={handleChange} min="0" step="0.5" className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Due Date</label>
              <input type="date" name="dueDate" value={form.dueDate} onChange={handleChange} className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Labels</label>
              <input type="text" name="labels" value={form.labels} onChange={handleChange} className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Tags</label>
              <input type="text" name="tags" value={form.tags} onChange={handleChange} className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
          </div>
        </div>

        <div className="border border-gray-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 p-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Project & Milestone</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Project</label>
              <select name="projectId" value={form.projectId} onChange={handleChange} className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm">
                <option value="">Select project</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.projectName}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Milestone</label>
              <select name="milestoneId" value={form.milestoneId} onChange={handleChange} className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm" disabled={!form.projectId}>
                <option value="">None</option>{milestones.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Reporter</label>
              <select name="reporterId" value={form.reporterId} onChange={handleChange} className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm">
                <option value="">Select</option>{users.map((u) => <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="border border-gray-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 p-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Assignees</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {users.map((user) => (
              <label key={user.id} className={`flex items-center gap-2 p-2 rounded-md border text-sm cursor-pointer transition-colors ${selectedAssignees.includes(user.id) ? 'border-primary bg-primary/5' : 'border-gray-200 dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-800'}`}>
                <input type="checkbox" checked={selectedAssignees.includes(user.id)} onChange={() => toggleAssignee(user.id)} className="rounded border-gray-300" />
                <span>{user.firstName} {user.lastName}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <Link href={`/${orgSlug}/projects/tasks/${taskId}`} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-md">Cancel</Link>
          <button type="submit" disabled={saving} className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2 rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
            <Save size={16} />{saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
