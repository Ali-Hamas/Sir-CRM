'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import {
  Plus, ArrowLeft, Calendar, Users, CheckSquare, AlertTriangle
} from 'lucide-react';

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  labels: string | null;
  dueDate: string | null;
  project: { id: string; projectName: string };
  milestone: { id: string; title: string } | null;
  reporter: { id: string; firstName: string; lastName: string };
  assignees: { user: { id: string; firstName: string; lastName: string; profilePictureUrl: string | null } }[];
  _count: { comments: number; checklists: number };
}

interface Project { id: string; projectName: string; projectCode: string; }

const COLUMNS = [
  { id: 'BACKLOG', label: 'Backlog', color: 'bg-gray-400' },
  { id: 'TODO', label: 'To Do', color: 'bg-blue-500' },
  { id: 'IN_PROGRESS', label: 'In Progress', color: 'bg-yellow-500' },
  { id: 'IN_REVIEW', label: 'In Review', color: 'bg-purple-500' },
  { id: 'DONE', label: 'Done', color: 'bg-green-500' },
  { id: 'BLOCKED', label: 'Blocked', color: 'bg-red-500' },
];

const PRIORITY_COLORS: Record<string, string> = {
  LOW: 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
  MEDIUM: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  HIGH: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  CRITICAL: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

export default function KanbanPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const orgSlug = params.orgSlug as string;

  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState(searchParams.get('projectId') || '');
  const [board, setBoard] = useState<Record<string, Task[]>>({});
  const [loading, setLoading] = useState(false);
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  useEffect(() => {
    apiFetch(`/organizations/${orgSlug}/projects?limit=200`).then((data) => {
      const items = data.items?.map((p: any) => ({ id: p.id, projectName: p.projectName, projectCode: p.projectCode })) || [];
      setProjects(items);
      if (!selectedProjectId && items.length > 0) {
        setSelectedProjectId(items[0].id);
      }
    }).catch(() => {});
  }, [orgSlug]);

  const fetchBoard = useCallback(async () => {
    if (!selectedProjectId) return;
    setLoading(true);
    try {
      const data = await apiFetch(`/organizations/${orgSlug}/tasks/kanban/${selectedProjectId}`);
      setBoard(data);
    } catch (err) {
      console.error('Failed to fetch kanban board:', err);
    } finally {
      setLoading(false);
    }
  }, [orgSlug, selectedProjectId]);

  useEffect(() => { fetchBoard(); }, [fetchBoard]);

  const handleDragStart = (e: React.DragEvent, task: Task) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', task.id);
  };

  const handleDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumn(columnId);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault();
    setDragOverColumn(null);

    if (!draggedTask || draggedTask.status === targetStatus) {
      setDraggedTask(null);
      return;
    }

    // Optimistic update
    const newBoard = { ...board };
    const sourceCol = [...(newBoard[draggedTask.status] || [])];
    const destCol = [...(newBoard[targetStatus] || [])];
    const taskIndex = sourceCol.findIndex((t) => t.id === draggedTask.id);

    if (taskIndex !== -1) {
      const [task] = sourceCol.splice(taskIndex, 1);
      task.status = targetStatus;
      destCol.push(task);
      newBoard[draggedTask.status] = sourceCol;
      newBoard[targetStatus] = destCol;
      setBoard(newBoard);
    }

    try {
      await apiFetch(`/organizations/${orgSlug}/tasks/${draggedTask.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: targetStatus }),
      });
    } catch (err) {
      console.error('Failed to update task status:', err);
      fetchBoard();
    }

    setDraggedTask(null);
  };

  const handleDragEnd = () => {
    setDraggedTask(null);
    setDragOverColumn(null);
  };

  return (
    <div className="max-w-full mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/${orgSlug}/projects/tasks`} className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"><ArrowLeft size={20} /></Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Kanban Board</h1>
            <p className="text-muted-foreground text-sm mt-1">Drag and drop tasks between columns</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <select value={selectedProjectId} onChange={(e) => setSelectedProjectId(e.target.value)} className="px-3 py-2 rounded-md border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm">
            <option value="">Select Project</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.projectName}</option>)}
          </select>
          {selectedProjectId && (
            <Link href={`/${orgSlug}/projects/tasks/new?projectId=${selectedProjectId}`} className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors">
              <Plus size={16} /> New Task
            </Link>
          )}
        </div>
      </div>

      {/* Board */}
      {loading ? (
        <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
      ) : !selectedProjectId ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <CheckSquare size={48} className="text-gray-300 dark:text-zinc-600 mb-4" />
          <h3 className="text-lg font-medium mb-1">Select a project</h3>
          <p className="text-sm text-gray-500">Choose a project to view its Kanban board</p>
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4 min-h-[calc(100vh-200px)]">
          {COLUMNS.map((col) => {
            const tasks = board[col.id] || [];
            return (
              <div
                key={col.id}
                className={`flex-shrink-0 w-80 rounded-lg border transition-colors ${
                  dragOverColumn === col.id
                    ? 'border-primary bg-primary/5'
                    : 'border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900/50'
                }`}
                onDragOver={(e) => handleDragOver(e, col.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, col.id)}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-zinc-800">
                  <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${col.color}`}></div>
                    <h3 className="text-sm font-semibold">{col.label}</h3>
                    <span className="text-xs text-gray-500 bg-gray-200 dark:bg-zinc-700 px-1.5 py-0.5 rounded-full">{tasks.length}</span>
                  </div>
                </div>

                {/* Tasks */}
                <div className="p-2 space-y-2 min-h-[100px] max-h-[calc(100vh-300px)] overflow-y-auto">
                  {tasks.map((task) => (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, task)}
                      onDragEnd={handleDragEnd}
                      onClick={() => router.push(`/${orgSlug}/projects/tasks/${task.id}`)}
                      className={`p-3 rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow ${
                        draggedTask?.id === task.id ? 'opacity-50' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <p className="text-sm font-medium leading-snug">{task.title}</p>
                        <span className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded-full font-medium ${PRIORITY_COLORS[task.priority] || ''}`}>{task.priority}</span>
                      </div>
                      {task.labels && <p className="text-xs text-gray-500 mb-2">{task.labels}</p>}
                      {task.milestone && <p className="text-xs text-gray-500 mb-2">Milestone: {task.milestone.title}</p>}
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex -space-x-1">
                          {task.assignees.slice(0, 3).map((a) => (
                            <div key={a.user.id} className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[8px] font-bold border border-white dark:border-zinc-800" title={`${a.user.firstName} ${a.user.lastName}`}>{a.user.firstName?.[0]}{a.user.lastName?.[0]}</div>
                          ))}
                        </div>
                        <div className="flex items-center gap-2 text-gray-400">
                          {task._count.comments > 0 && <span className="text-[10px]">{task._count.comments}c</span>}
                          {task._count.checklists > 0 && <span className="text-[10px]">{task._count.checklists}cl</span>}
                          {task.dueDate && (
                            <span className={`text-[10px] flex items-center gap-0.5 ${new Date(task.dueDate) < new Date() && task.status !== 'DONE' ? 'text-red-500' : ''}`}>
                              <Calendar size={10} />{new Date(task.dueDate).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {tasks.length === 0 && (
                    <div className="text-center py-8 text-xs text-gray-400">No tasks</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
