'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import {
  Activity,
  Filter,
  Search,
  Download,
  RefreshCw,
  Clock,
  User,
  Shield,
  Layers,
  Briefcase,
  Sparkles,
  Calendar,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  Info,
  Terminal,
  FileCode,
} from 'lucide-react';

interface ActivityItem {
  id: string;
  action: string;
  module?: string;
  entityType?: string;
  entityId?: string;
  metadata?: string;
  ipAddress?: string;
  device?: string;
  createdAt: string;
  user?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
    profilePictureUrl: string | null;
    role?: string;
  };
}

function getModuleBadgeStyle(module?: string) {
  switch (module?.toUpperCase()) {
    case 'CRM':
      return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
    case 'TASKS':
      return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
    case 'PROJECTS':
      return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20';
    case 'WORKFLOWS':
      return 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20';
    case 'TEAM':
    case 'USERS':
      return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
    case 'AI':
      return 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20';
    case 'COMMUNICATIONS':
      return 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20';
    default:
      return 'bg-gray-100 text-gray-700 dark:bg-zinc-800 dark:text-zinc-300 border-gray-200 dark:border-zinc-700';
  }
}

function formatRelativeTime(dateString: string): string {
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '-';
  }
}

export default function ActivityLogPage() {
  const params = useParams();
  const orgSlug = (params?.orgSlug as string) || '';

  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Pagination
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedModule, setSelectedModule] = useState<string>('ALL');
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);

  // Metadata Inspector Modal
  const [inspectingItem, setInspectingItem] = useState<ActivityItem | null>(null);

  const fetchActivities = useCallback(async () => {
    if (!orgSlug) return;
    setLoading(true);
    setError(null);

    try {
      let endpoint = `/organizations/${orgSlug}/activity?page=${page}&limit=25`;
      if (selectedModule !== 'ALL') {
        endpoint += `&module=${selectedModule}`;
      }
      if (searchQuery.trim()) {
        endpoint += `&search=${encodeURIComponent(searchQuery.trim())}`;
      }

      const res = await apiFetch(endpoint).catch(async () => {
        // Fallback to alias if needed
        return await apiFetch(`/organizations/${orgSlug}/activities?page=${page}&limit=25`);
      });

      if (res && Array.isArray(res.items)) {
        setActivities(res.items);
        setTotalPages(res.totalPages || 1);
        setTotalCount(res.total || res.items.length);
      } else {
        setActivities([]);
        setTotalPages(1);
        setTotalCount(0);
      }
    } catch (err: any) {
      console.error('Failed to load activity logs:', err);
      setError(err.message || 'Failed to load activity audit trail');
    } finally {
      setLoading(false);
    }
  }, [orgSlug, page, selectedModule, searchQuery]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  const handleExportLogs = () => {
    const dataStr =
      'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(activities, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `blackdesk_activity_audit_${orgSlug}_page${page}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const parsedMetadata = (meta?: string) => {
    if (!meta) return null;
    try {
      return typeof meta === 'string' ? JSON.parse(meta) : meta;
    } catch {
      return meta;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-gray-900 dark:text-white flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Activity size={18} />
            </div>
            Activity & Audit Center
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Immutable system audit logs and event mutations across organization resources.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchActivities}
            disabled={loading}
            className="p-2 border border-gray-200 dark:border-zinc-800 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors text-gray-700 dark:text-zinc-300 disabled:opacity-50"
            title="Refresh logs"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={handleExportLogs}
            disabled={activities.length === 0}
            className="flex items-center gap-1.5 px-4 py-2 border border-gray-200 dark:border-zinc-800 rounded-xl text-xs font-bold hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors bg-white dark:bg-zinc-900 shadow-2xs disabled:opacity-50"
          >
            <Download size={14} />
            <span>Export JSON</span>
          </button>
        </div>
      </div>

      {/* Toolbar / Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between p-4 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search action, actor, or entity..."
            className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
          />
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <Filter size={15} className="text-gray-400 shrink-0" />
          <select
            value={selectedModule}
            onChange={(e) => {
              setSelectedModule(e.target.value);
              setPage(1);
            }}
            className="px-3.5 py-2 border border-gray-200 dark:border-zinc-800 rounded-xl text-xs font-semibold bg-gray-50 dark:bg-zinc-950 text-gray-700 dark:text-zinc-300 hover:border-gray-300 dark:hover:border-zinc-700 focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Modules</option>
            <option value="CRM">CRM</option>
            <option value="TASKS">Tasks</option>
            <option value="PROJECTS">Projects</option>
            <option value="WORKFLOWS">Workflows</option>
            <option value="TEAM">Team & Users</option>
            <option value="AI">AI Platform</option>
            <option value="COMMUNICATIONS">Communications</option>
            <option value="SYSTEM">System</option>
          </select>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
          <Info size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Audit Log Table */}
      <div className="glass-card-premium rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-24 text-center space-y-3">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-gray-400 font-medium">Loading live audit trail...</p>
          </div>
        ) : activities.length === 0 ? (
          <div className="py-20 px-6 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-zinc-800 flex items-center justify-center mx-auto text-gray-400 dark:text-zinc-500">
              <Activity size={24} />
            </div>
            <p className="font-bold text-sm text-gray-900 dark:text-white">No activity records found</p>
            <p className="text-xs text-gray-400 max-w-sm mx-auto">
              {searchQuery
                ? `No activity matching "${searchQuery}". Try adjusting your filters.`
                : 'All actions and mutations in your organization will be recorded here.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50/80 dark:bg-zinc-950/80 border-b border-gray-200/80 dark:border-zinc-800 text-gray-500 uppercase tracking-wider text-[10px] font-bold">
                <tr>
                  <th className="px-6 py-3.5">Action / Event</th>
                  <th className="px-6 py-3.5">Actor</th>
                  <th className="px-6 py-3.5">Module</th>
                  <th className="px-6 py-3.5">IP Address / Device</th>
                  <th className="px-6 py-3.5 text-right">Timestamp</th>
                  <th className="px-4 py-3.5 text-center">Inspector</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                {activities.map((item) => {
                  const meta = parsedMetadata(item.metadata);
                  const actorName =
                    item.user?.firstName || item.user?.lastName
                      ? `${item.user.firstName || ''} ${item.user.lastName || ''}`.trim()
                      : item.user?.email || 'System Actor';

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-gray-50/70 dark:hover:bg-zinc-800/40 transition-colors group"
                    >
                      {/* Action */}
                      <td className="px-6 py-4">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-zinc-800 flex items-center justify-center shrink-0 mt-0.5 border border-gray-200/60 dark:border-zinc-700/60 shadow-2xs">
                            <Activity size={14} className="text-primary" />
                          </div>
                          <div>
                            <span className="font-bold text-gray-900 dark:text-white block font-mono text-[11px]">
                              {item.action}
                            </span>
                            {item.entityType && (
                              <span className="text-[10px] text-gray-500 dark:text-zinc-400 mt-0.5 block">
                                Entity: {item.entityType} {item.entityId ? `#${item.entityId.substring(0, 8)}` : ''}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Actor */}
                      <td className="px-6 py-4 font-medium text-gray-900 dark:text-zinc-200">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-primary/80 to-blue-600 flex items-center justify-center text-white text-[9px] font-bold">
                            {actorName.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <span className="block font-semibold">{actorName}</span>
                            {item.user?.role && (
                              <span className="text-[9px] text-gray-400 dark:text-zinc-500 uppercase font-mono block">
                                {item.user.role}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Module */}
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-wider border ${getModuleBadgeStyle(
                            item.module
                          )}`}
                        >
                          {item.module || 'SYSTEM'}
                        </span>
                      </td>

                      {/* IP / Device */}
                      <td className="px-6 py-4 font-mono text-[11px] text-gray-500 dark:text-zinc-400">
                        <span>{item.ipAddress || '127.0.0.1'}</span>
                        {item.device && (
                          <span className="block text-[10px] text-gray-400 font-sans truncate max-w-xs mt-0.5">
                            {item.device}
                          </span>
                        )}
                      </td>

                      {/* Timestamp */}
                      <td className="px-6 py-4 text-right text-gray-500 dark:text-zinc-400 whitespace-nowrap text-[11px]">
                        {formatRelativeTime(item.createdAt)}
                      </td>

                      {/* Inspector Modal Trigger */}
                      <td className="px-4 py-4 text-center">
                        <button
                          onClick={() => setInspectingItem(item)}
                          className="p-1.5 text-gray-400 hover:text-primary rounded-lg hover:bg-primary/10 transition-colors"
                          title="View event payload details"
                        >
                          <Eye size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="px-6 py-3.5 border-t border-gray-100 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-950/40 flex items-center justify-between">
            <span className="text-xs text-gray-500 dark:text-zinc-400">
              Page <strong className="text-gray-900 dark:text-white">{page}</strong> of{' '}
              <strong className="text-gray-900 dark:text-white">{totalPages}</strong> ({totalCount} events)
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1.5 border border-gray-200 dark:border-zinc-800 rounded-lg text-xs font-medium hover:bg-white dark:hover:bg-zinc-800 transition-colors disabled:opacity-40"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-1.5 border border-gray-200 dark:border-zinc-800 rounded-lg text-xs font-medium hover:bg-white dark:hover:bg-zinc-800 transition-colors disabled:opacity-40"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Metadata Inspector Drawer / Modal */}
      {inspectingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-xl rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <FileCode size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                    Audit Event Payload
                  </h3>
                  <p className="text-[10px] font-mono text-gray-400 mt-0.5">
                    ID: {inspectingItem.id}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setInspectingItem(null)}
                className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-zinc-200 rounded-lg"
              >
                <X size={16} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-gray-50 dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800">
                <span className="text-[10px] text-gray-400 uppercase font-bold block">Action</span>
                <span className="font-mono font-bold text-gray-900 dark:text-white">
                  {inspectingItem.action}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-gray-50 dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800">
                <span className="text-[10px] text-gray-400 uppercase font-bold block">Module</span>
                <span className="font-bold text-gray-900 dark:text-white">
                  {inspectingItem.module || 'SYSTEM'}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-gray-50 dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800">
                <span className="text-[10px] text-gray-400 uppercase font-bold block">Timestamp</span>
                <span className="text-gray-900 dark:text-white">
                  {new Date(inspectingItem.createdAt).toLocaleString()}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-gray-50 dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800">
                <span className="text-[10px] text-gray-400 uppercase font-bold block">IP Address</span>
                <span className="font-mono text-gray-900 dark:text-white">
                  {inspectingItem.ipAddress || '127.0.0.1'}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-700 dark:text-zinc-300 uppercase tracking-wider mb-1.5">
                Sanitized Metadata JSON
              </label>
              <pre className="p-4 rounded-xl bg-gray-950 text-emerald-400 font-mono text-xs overflow-x-auto max-h-60 scrollbar-thin border border-gray-800">
                {inspectingItem.metadata
                  ? JSON.stringify(parsedMetadata(inspectingItem.metadata), null, 2)
                  : '{\n  "info": "No additional metadata recorded for this action"\n}'}
              </pre>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setInspectingItem(null)}
                className="px-4 py-2 bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-800 dark:text-zinc-200 rounded-xl text-xs font-bold transition-colors"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
