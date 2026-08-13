'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import {
  Search, Plus, DollarSign, Calendar, Building2, User,
  ChevronLeft, ChevronRight, Filter, ArrowUpDown, LayoutGrid,
  List, TrendingUp, CheckCircle, XCircle, Pause, GripVertical
} from 'lucide-react';

interface Opportunity {
  id: string;
  name: string;
  probability: number;
  estimatedValue: number | null;
  currency: string;
  expectedCloseDate: string | null;
  actualCloseDate: string | null;
  stage: string;
  status: string;
  source: string | null;
  competitor: string | null;
  company: { id: string; name: string } | null;
  contact: { id: string; firstName: string; lastName: string; email: string } | null;
  assignedTo: { id: string; firstName: string; lastName: string; email: string } | null;
  tags: { id: string; name: string }[];
  _count: { notes: number; activities: number };
  createdAt: string;
}

const STAGES = [
  { id: 'NEW_OPPORTUNITY', label: 'New Opportunity', color: 'bg-blue-500' },
  { id: 'QUALIFICATION', label: 'Qualification', color: 'bg-indigo-500' },
  { id: 'DISCOVERY', label: 'Discovery', color: 'bg-purple-500' },
  { id: 'PROPOSAL', label: 'Proposal', color: 'bg-amber-500' },
  { id: 'NEGOTIATION', label: 'Negotiation', color: 'bg-orange-500' },
  { id: 'CONTRACT_REVIEW', label: 'Contract Review', color: 'bg-teal-500' },
  { id: 'WON', label: 'Won', color: 'bg-green-500' },
  { id: 'LOST', label: 'Lost', color: 'bg-red-500' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'OPEN', label: 'Open' },
  { value: 'WON', label: 'Won' },
  { value: 'LOST', label: 'Lost' },
  { value: 'ON_HOLD', label: 'On Hold' },
];

const STATUS_COLORS: Record<string, string> = {
  OPEN: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  WON: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  LOST: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  ON_HOLD: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
};

function formatValue(value: number | null) {
  if (!value) return '-';
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toLocaleString()}`;
}

export default function OpportunitiesPage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = params.orgSlug as string;

  const [view, setView] = useState<'table' | 'kanban'>('kanban');
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [kanbanData, setKanbanData] = useState<Record<string, Opportunity[]>>({});
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [stage, setStage] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [showFilters, setShowFilters] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [draggedItem, setDraggedItem] = useState<string | null>(null);

  const fetchTable = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (status) params.set('status', status);
      if (stage) params.set('stage', stage);
      params.set('sortBy', sortBy);
      params.set('sortOrder', sortOrder);
      params.set('page', String(page));
      params.set('limit', '15');

      const data = await apiFetch(`/organizations/${orgSlug}/opportunities?${params.toString()}`);
      setOpportunities(data.items);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (err) {
      console.error('Failed to fetch opportunities:', err);
    } finally {
      setLoading(false);
    }
  }, [orgSlug, search, status, stage, sortBy, sortOrder, page]);

  const fetchKanban = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch(`/organizations/${orgSlug}/opportunities/kanban`);
      setKanbanData(data);
      const totalItems = Object.values(data).flat().length;
      setTotal(totalItems);
    } catch (err) {
      console.error('Failed to fetch kanban:', err);
    } finally {
      setLoading(false);
    }
  }, [orgSlug]);

  useEffect(() => {
    if (view === 'table') fetchTable();
    else fetchKanban();
  }, [view, fetchTable, fetchKanban]);

  useEffect(() => {
    apiFetch(`/organizations/${orgSlug}/opportunities/stats`).then(setStats).catch(() => {});
  }, [orgSlug]);

  const handleStageMove = async (oppId: string, newStage: string) => {
    try {
      await apiFetch(`/organizations/${orgSlug}/opportunities/${oppId}/stage`, {
        method: 'PATCH',
        body: JSON.stringify({ stage: newStage }),
      });
      fetchKanban();
    } catch (err) {
      console.error('Failed to move opportunity:', err);
    }
  };

  const handleDragStart = (e: React.DragEvent, oppId: string) => {
    setDraggedItem(oppId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetStage: string) => {
    e.preventDefault();
    if (draggedItem) {
      handleStageMove(draggedItem, targetStage);
      setDraggedItem(null);
    }
  };

  const toggleSort = (field: string) => {
    setSortBy(field);
    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    setPage(1);
  };

  return (
    <div className="max-w-full mx-auto space-y-6 px-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Opportunities</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage your sales pipeline</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex border border-gray-200 dark:border-zinc-800 rounded-md overflow-hidden">
            <button
              onClick={() => setView('kanban')}
              className={`px-3 py-2 text-sm font-medium flex items-center gap-1.5 ${view === 'kanban' ? 'bg-primary text-primary-foreground' : 'hover:bg-gray-50 dark:hover:bg-zinc-800'}`}
            >
              <LayoutGrid size={16} /> Pipeline
            </button>
            <button
              onClick={() => setView('table')}
              className={`px-3 py-2 text-sm font-medium flex items-center gap-1.5 ${view === 'table' ? 'bg-primary text-primary-foreground' : 'hover:bg-gray-50 dark:hover:bg-zinc-800'}`}
            >
              <List size={16} /> Table
            </button>
          </div>
          <Link
            href={`/${orgSlug}/crm/opportunities/new`}
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus size={16} /> Add Opportunity
          </Link>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="border border-gray-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 p-4">
            <p className="text-xs text-gray-500 font-medium">Total Pipeline</p>
            <p className="text-2xl font-bold mt-1">{formatValue(stats.totalValue)}</p>
          </div>
          <div className="border border-gray-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 p-4">
            <div className="flex items-center gap-2">
              <CheckCircle size={16} className="text-green-500" />
              <p className="text-xs text-gray-500 font-medium">Won</p>
            </div>
            <p className="text-2xl font-bold mt-1 text-green-600">{formatValue(stats.wonValue)}</p>
          </div>
          <div className="border border-gray-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 p-4">
            <div className="flex items-center gap-2">
              <XCircle size={16} className="text-red-500" />
              <p className="text-xs text-gray-500 font-medium">Lost</p>
            </div>
            <p className="text-2xl font-bold mt-1 text-red-600">{formatValue(stats.lostValue)}</p>
          </div>
          <div className="border border-gray-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 p-4">
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-amber-500" />
              <p className="text-xs text-gray-500 font-medium">Closing This Month</p>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.closingThisMonth}</p>
          </div>
        </div>
      )}

      {/* Filters (Table View) */}
      {view === 'table' && (
        <>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search opportunities..."
                className="w-full pl-10 pr-4 py-2 rounded-md border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`inline-flex items-center gap-2 px-3 py-2 rounded-md border text-sm font-medium transition-colors ${
                  showFilters || status || stage
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-gray-200 dark:border-zinc-800 hover:bg-gray-50'
                }`}
              >
                <Filter size={16} /> Filters
              </button>
              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => { const [f, o] = e.target.value.split('-'); setSortBy(f); setSortOrder(o); setPage(1); }}
                className="px-3 py-2 rounded-md border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm"
              >
                <option value="createdAt-desc">Newest</option>
                <option value="createdAt-asc">Oldest</option>
                <option value="estimatedValue-desc">Highest Value</option>
                <option value="estimatedValue-asc">Lowest Value</option>
                <option value="probability-desc">Highest Probability</option>
                <option value="expectedCloseDate-asc">Closing Soon</option>
              </select>
            </div>
          </div>

          {showFilters && (
            <div className="border border-gray-200 dark:border-zinc-800 rounded-lg p-4 bg-gray-50 dark:bg-zinc-900/50">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
                  <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="w-full px-3 py-2 rounded-md border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm">
                    {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Stage</label>
                  <select value={stage} onChange={(e) => { setStage(e.target.value); setPage(1); }} className="w-full px-3 py-2 rounded-md border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm">
                    <option value="">All Stages</option>
                    {STAGES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Kanban View */}
      {view === 'kanban' && (
        <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: '500px' }}>
          {STAGES.map((s) => (
            <div
              key={s.id}
              className="flex-shrink-0 w-72 border border-gray-200 dark:border-zinc-800 rounded-lg bg-gray-50 dark:bg-zinc-900/50 flex flex-col"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, s.id)}
            >
              <div className="px-3 py-2 border-b border-gray-200 dark:border-zinc-800 flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${s.color}`}></div>
                <span className="text-sm font-medium">{s.label}</span>
                <span className="text-xs text-gray-400 ml-auto">{(kanbanData[s.id] || []).length}</span>
              </div>
              <div className="flex-1 p-2 space-y-2 overflow-y-auto">
                {(kanbanData[s.id] || []).map((opp) => (
                  <div
                    key={opp.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, opp.id)}
                    onClick={() => router.push(`/${orgSlug}/crm/opportunities/${opp.id}`)}
                    className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg p-3 cursor-pointer hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <p className="text-sm font-medium line-clamp-2">{opp.name}</p>
                      <GripVertical size={14} className="text-gray-300 shrink-0 ml-1" />
                    </div>
                    {opp.company && (
                      <p className="text-xs text-gray-500 flex items-center gap-1 mb-1">
                        <Building2 size={12} /> {opp.company.name}
                      </p>
                    )}
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-sm font-bold text-primary">{formatValue(opp.estimatedValue)}</span>
                      <span className="text-xs text-gray-400">{opp.probability}%</span>
                    </div>
                    {opp.assignedTo && (
                      <div className="flex items-center gap-1.5 mt-2">
                        <div className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">
                          {opp.assignedTo.firstName?.[0]}{opp.assignedTo.lastName?.[0]}
                        </div>
                        <span className="text-xs text-gray-500">{opp.assignedTo.firstName}</span>
                      </div>
                    )}
                    {opp.expectedCloseDate && (
                      <p className="text-[10px] text-gray-400 mt-1.5 flex items-center gap-1">
                        <Calendar size={10} /> {new Date(opp.expectedCloseDate).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                ))}
                {(!kanbanData[s.id] || kanbanData[s.id].length === 0) && (
                  <div className="text-center py-6 text-xs text-gray-400">No opportunities</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Table View */}
      {view === 'table' && (
        <div className="border border-gray-200 dark:border-zinc-800 rounded-lg overflow-hidden bg-white dark:bg-zinc-900">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : opportunities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <TrendingUp size={48} className="text-gray-300 dark:text-zinc-600 mb-4" />
              <h3 className="text-lg font-medium mb-1">No opportunities found</h3>
              <p className="text-sm text-gray-500 mb-4">
                {search || status || stage ? 'Try adjusting your filters' : 'Create your first opportunity'}
              </p>
              <Link href={`/${orgSlug}/crm/opportunities/new`} className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90">
                <Plus size={16} /> Add Opportunity
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 dark:bg-zinc-800/50 border-b border-gray-200 dark:border-zinc-800">
                  <tr>
                    <th className="px-6 py-3 font-medium text-gray-500">Name</th>
                    <th className="px-6 py-3 font-medium text-gray-500">Company</th>
                    <th className="px-6 py-3">
                      <button onClick={() => toggleSort('stage')} className="inline-flex items-center gap-1 font-medium text-gray-500">Stage <ArrowUpDown size={14} /></button>
                    </th>
                    <th className="px-6 py-3">
                      <button onClick={() => toggleSort('estimatedValue')} className="inline-flex items-center gap-1 font-medium text-gray-500">Value <ArrowUpDown size={14} /></button>
                    </th>
                    <th className="px-6 py-3 font-medium text-gray-500">Probability</th>
                    <th className="px-6 py-3 font-medium text-gray-500">Close Date</th>
                    <th className="px-6 py-3 font-medium text-gray-500 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {opportunities.map((opp) => (
                    <tr
                      key={opp.id}
                      className="border-b border-gray-200 dark:border-zinc-800 last:border-0 hover:bg-gray-50 dark:hover:bg-zinc-800/30 cursor-pointer"
                      onClick={() => router.push(`/${orgSlug}/crm/opportunities/${opp.id}`)}
                    >
                      <td className="px-6 py-4">
                        <p className="font-medium">{opp.name}</p>
                        {opp.contact && <p className="text-xs text-gray-500">{opp.contact.firstName} {opp.contact.lastName}</p>}
                      </td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                        {opp.company?.name || '-'}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-medium px-2 py-1 rounded-full bg-gray-100 dark:bg-zinc-800">
                          {opp.stage.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-medium">{formatValue(opp.estimatedValue)}</td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{opp.probability}%</td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                        {opp.expectedCloseDate ? new Date(opp.expectedCloseDate).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link href={`/${orgSlug}/crm/opportunities/${opp.id}/edit`} onClick={(e) => e.stopPropagation()} className="text-gray-500 hover:text-primary text-sm">Edit</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/30">
              <p className="text-sm text-gray-500">Showing {((page - 1) * 15) + 1} to {Math.min(page * 15, total)} of {total}</p>
              <div className="flex items-center gap-2">
                <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="p-1.5 rounded-md border disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-zinc-800"><ChevronLeft size={16} /></button>
                <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
                <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} className="p-1.5 rounded-md border disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-zinc-800"><ChevronRight size={16} /></button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
