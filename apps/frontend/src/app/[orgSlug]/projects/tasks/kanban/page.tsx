'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import {
  Plus, ArrowLeft, Calendar, Users, CheckSquare, AlertTriangle, Filter,
  Columns3, RefreshCw, CheckCircle, Clock
} from 'lucide-react';

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  labels: string | null;
  dueDate: string | null;
  project: { id: string; projectName: string; projectCode?: string };
  milestone: { id: string; title: string } | null;
  reporter: { id: string; firstName: string; lastName: string };
  assignees: { user: { id: string; firstName: string; lastName: string; profilePictureUrl: string | null } }[];
  _count: { comments: number; checklists: number };
}

interface Project { id: string; projectName: string; projectCode: string; }

const COLUMNS = [
  { id: 'BACKLOG', label: 'Backlog', color: 'bg-gray-400', badgeColor: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
  { id: 'TODO', label: 'To Do', color: 'bg-blue-500', badgeColor: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  { id: 'IN_PROGRESS', label: 'In Progress', color: 'bg-amber-500', badgeColor: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  { id: 'IN_REVIEW', label: 'In Review', color: 'bg-purple-500', badgeColor: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
  { id: 'DONE', label: 'Done', color: 'bg-emerald-500', badgeColor: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  { id: 'BLOCKED', label: 'Blocked', color: 'bg-red-500', badgeColor: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
];

const PRIORITY_COLORS: Record<string, string> = {
  LOW: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
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
  const [selectedProjectId, setSelectedProjectId] = useState(searchParams.get('projectId') || 'all');
  const [board, setBoard] = useState<Record<string, Task[]>>({
    BACKLOG: [],
    TODO: [],
    IN_PROGRESS: [],
    IN_REVIEW: [],
    DONE: [],
    BLOCKED: [],
  });
  const [loading, setLoading] = useState(false);
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  useEffect(() => {
    apiFetch(`/organizations/${orgSlug}/projects?limit=200`).then((data) => {
      const items = data.items?.map((p: any) => ({ id: p.id, projectName: p.projectName, projectCode: p.projectCode })) || [];
      setProjects(items);
    }).catch(() => {});
  }, [orgSlug]);

  const fetchBoard = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const url = selectedProjectId && selectedProjectId !== 'all'
        ? `/organizations/${orgSlug}/tasks/kanban/${selectedProjectId}`
        : `/organizations/${orgSlug}/tasks/kanban`;
      const data = await apiFetch(url);
      setBoard({
        BACKLOG: data.BACKLOG || [],
        TODO: data.TODO || [],
        IN_PROGRESS: data.IN_PROGRESS || [],
        IN_REVIEW: data.IN_REVIEW || [],
        DONE: data.DONE || [],
        BLOCKED: data.BLOCKED || [],
      });
    } catch (err: any) {
      console.error('Failed to fetch kanban board:', err);
      setErrorMsg(err.message || 'Failed to load Kanban board');
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
    if (dragOverColumn !== columnId) {
      setDragOverColumn(columnId);
    }
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

    const previousStatus = draggedTask.status;
    const currentTask = draggedTask;

    // Optimistic board state
    const newBoard = { ...board };
    const sourceCol = [...(newBoard[previousStatus] || [])];
    const destCol = [...(newBoard[targetStatus] || [])];
    const taskIndex = sourceCol.findIndex((t) => t.id === currentTask.id);

    if (taskIndex !== -1) {
      const [task] = sourceCol.splice(taskIndex, 1);
      task.status = targetStatus;
      destCol.unshift(task);
      newBoard[previousStatus] = sourceCol;
      newBoard[targetStatus] = destCol;
      setBoard(newBoard);
    }

    setDraggedTask(null);

    try {
      await apiFetch(`/organizations/${orgSlug}/tasks/${currentTask.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: targetStatus }),
      });
      setSuccessToast(`Task moved to ${targetStatus.replace(/_/g, ' ')}`);
      setTimeout(() => setSuccessToast(null), 3000);
    } catch (err: any) {
      console.error('Failed to update task status:', err);
      setErrorMsg(err.message || 'Failed to update task status. Reverting change.');
      setTimeout(() => setErrorMsg(null), 4000);
      fetchBoard();
    }
  };

  const handleDragEnd = () => {
    setDraggedTask(null);
    setDragOverColumn(null);
  };

  const totalTasks = Object.values(board).reduce((sum, col) => sum + (col?.length || 0), 0);

  return (
    <div className="max-w-full mx-auto space-y-6">
      {/* Toast Notifications */}
      {successToast && (
        <div className="fixed bottom-5 right-5 z-50 bg-emerald-600 text-white px-4 py-2.5 rounded-lg shadow-lg flex items-center gap-2 text-sm font-medium animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle size={16} />
          {successToast}
        </div>
      )}

      {errorMsg && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-700 dark:text-red-400 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-xs underline ml-4">Dismiss</button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href={`/${orgSlug}/projects/tasks`} className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">Kanban Board</h1>
              <span className="text-xs bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-full font-medium">
                {totalTasks} tasks
              </span>
            </div>
            <p className="text-muted-foreground text-xs mt-0.5">Drag and drop tasks between workflow columns to update status</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-md px-3 py-1.5 shadow-sm">
            <Filter size={14} className="text-gray-400" />
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="bg-transparent text-sm focus:outline-none cursor-pointer"
            >
              <option value="all">All Projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.projectName} ({p.projectCode})</option>
              ))}
            </select>
          </div>

          <button
            onClick={fetchBoard}
            disabled={loading}
            className="p-2 rounded-md border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
            title="Refresh Board"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>

          <Link
            href={`/${orgSlug}/projects/tasks/new${selectedProjectId && selectedProjectId !== 'all' ? `?projectId=${selectedProjectId}` : ''}`}
            className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground px-3.5 py-1.5 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Plus size={16} /> New Task
          </Link>
        </div>
      </div>

      {/* Sub-navigation link tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 dark:border-zinc-800 pb-2">
        <Link
          href={`/${orgSlug}/projects`}
          className="px-3 py-1.5 rounded-lg text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 font-medium text-xs transition-colors"
        >
          Projects Overview
        </Link>
        <Link
          href={`/${orgSlug}/projects/tasks`}
          className="px-3 py-1.5 rounded-lg text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 font-medium text-xs transition-colors"
        >
          Tasks List
        </Link>
        <span
          className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary font-semibold text-xs transition-colors"
        >
          Kanban Board
        </span>
        <Link
          href={`/${orgSlug}/projects/time-tracking`}
          className="px-3 py-1.5 rounded-lg text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 font-medium text-xs transition-colors"
        >
          Time Logs
        </Link>
      </div>

      {/* Kanban Board Columns */}
      {loading && totalTasks === 0 ? (
        <div className="flex items-center justify-center py-24">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="text-xs text-gray-500">Loading Kanban board...</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 items-start overflow-x-auto pb-6 min-h-[calc(100vh-250px)]">
          {COLUMNS.map((col) => {
            const columnTasks = board[col.id] || [];
            const isDropTarget = dragOverColumn === col.id;

            return (
              <div
                key={col.id}
                className={`rounded-xl border transition-all duration-150 flex flex-col max-h-[calc(100vh-240px)] ${
                  isDropTarget
                    ? 'border-primary bg-primary/5 ring-2 ring-primary/20 shadow-md'
                    : 'border-gray-200 dark:border-zinc-800 bg-gray-50/70 dark:bg-zinc-900/40 shadow-sm'
                }`}
                onDragOver={(e) => handleDragOver(e, col.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, col.id)}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between px-3.5 py-3 border-b border-gray-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 rounded-t-xl">
                  <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${col.color}`} />
                    <h3 className="text-xs font-semibold uppercase tracking-wider">{col.label}</h3>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${col.badgeColor}`}>
                    {columnTasks.length}
                  </span>
                </div>

                {/* Tasks List */}
                <div className="p-2 space-y-2 overflow-y-auto flex-1 min-h-[140px]">
                  {columnTasks.map((task) => {
                    const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'DONE';
                    const isDragging = draggedTask?.id === task.id;

                    return (
                      <div
                        key={task.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, task)}
                        onDragEnd={handleDragEnd}
                        onClick={() => router.push(`/${orgSlug}/projects/tasks/${task.id}`)}
                        className={`p-3 rounded-lg border border-gray-200/80 dark:border-zinc-700/80 bg-white dark:bg-zinc-800/90 shadow-sm hover:shadow-md hover:border-primary/40 transition-all cursor-grab active:cursor-grabbing group ${
                          isDragging ? 'opacity-40 scale-95' : ''
                        }`}
                      >
                        {/* Project Code & Priority */}
                        <div className="flex items-center justify-between gap-1 mb-1.5">
                          <span className="text-[10px] font-mono font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-zinc-700/60 px-1.5 py-0.5 rounded">
                            {task.project?.projectCode || 'PRJ'}
                          </span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${PRIORITY_COLORS[task.priority] || ''}`}>
                            {task.priority}
                          </span>
                        </div>

                        {/* Title */}
                        <p className="text-xs font-medium leading-snug line-clamp-2 text-gray-900 dark:text-zinc-100 group-hover:text-primary transition-colors">
                          {task.title}
                        </p>

                        {/* Project Name (if viewing all projects) */}
                        {selectedProjectId === 'all' && task.project?.projectName && (
                          <p className="text-[10px] text-gray-500 dark:text-zinc-400 truncate mt-1">
                            📁 {task.project.projectName}
                          </p>
                        )}

                        {/* Milestone or Labels */}
                        {task.milestone && (
                          <div className="mt-1.5">
                            <span className="text-[10px] text-primary/80 bg-primary/5 px-1.5 py-0.5 rounded truncate inline-block max-w-full">
                              🎯 {task.milestone.title}
                            </span>
                          </div>
                        )}

                        {/* Footer Details: Assignees & Meta */}
                        <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-gray-100 dark:border-zinc-700/40 text-gray-400 text-[10px]">
                          {/* Assignees Avatars */}
                          <div className="flex -space-x-1">
                            {task.assignees && task.assignees.length > 0 ? (
                              task.assignees.slice(0, 3).map((a, idx) => (
                                <div
                                  key={idx}
                                  className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[8px] font-bold border border-white dark:border-zinc-800"
                                  title={`${a.user?.firstName || ''} ${a.user?.lastName || ''}`}
                                >
                                  {a.user?.firstName?.[0] || 'U'}
                                </div>
                              ))
                            ) : (
                              <span className="text-[10px] text-gray-400">Unassigned</span>
                            )}
                          </div>

                          {/* Counts & Due Date */}
                          <div className="flex items-center gap-1.5">
                            {task._count?.checklists > 0 && (
                              <span className="flex items-center gap-0.5 text-gray-500 dark:text-zinc-400" title="Checklists">
                                <CheckSquare size={10} />
                                {task._count.checklists}
                              </span>
                            )}
                            {task._count?.comments > 0 && (
                              <span className="text-gray-500 dark:text-zinc-400" title="Comments">
                                💬 {task._count.comments}
                              </span>
                            )}
                            {task.dueDate && (
                              <span
                                className={`flex items-center gap-0.5 font-medium px-1.5 py-0.5 rounded ${
                                  isOverdue
                                    ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400'
                                    : 'text-gray-500 dark:text-zinc-400'
                                }`}
                                title={`Due ${new Date(task.dueDate).toLocaleDateString()}`}
                              >
                                <Calendar size={10} />
                                {new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {columnTasks.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-10 text-center border border-dashed border-gray-200 dark:border-zinc-800 rounded-lg">
                      <p className="text-[11px] text-gray-400 font-medium">Drop tasks here</p>
                    </div>
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
