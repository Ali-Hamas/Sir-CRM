'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import {
  Search, Plus, FileText, DollarSign, Calendar, Building2,
  ChevronLeft, ChevronRight, Filter, ArrowUpDown, AlertTriangle, Clock
} from 'lucide-react';

interface Contract {
  id: string;
  contractNumber: string;
  title: string;
  status: string;
  contractType: string;
  currency: string;
  contractValue: number | null;
  startDate: string | null;
  endDate: string | null;
  renewalDate: string | null;
  autoRenewal: boolean;
  company: { id: string; name: string } | null;
  contact: { id: string; firstName: string; lastName: string } | null;
  owner: { id: string; firstName: string; lastName: string; email: string } | null;
  _count: { versions: number; approvalLogs: number };
  createdAt: string;
}

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'INTERNAL_REVIEW', label: 'Internal Review' },
  { value: 'PENDING_CLIENT_SIGNATURE', label: 'Pending Signature' },
  { value: 'SIGNED', label: 'Signed' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'EXPIRED', label: 'Expired' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400',
  INTERNAL_REVIEW: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
  PENDING_CLIENT_SIGNATURE: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  SIGNED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  ACTIVE: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  EXPIRED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  CANCELLED: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400',
};

const CONTRACT_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'SERVICE_AGREEMENT', label: 'Service Agreement' },
  { value: 'SOFTWARE_LICENSE', label: 'Software License' },
  { value: 'CONSULTING', label: 'Consulting' },
  { value: 'MAINTENANCE', label: 'Maintenance' },
  { value: 'NDA', label: 'NDA' },
  { value: 'OTHER', label: 'Other' },
];

function formatValue(value: number | null, currency: string) {
  if (!value) return '-';
  return `${currency} ${value.toLocaleString()}`;
}

export default function ContractsPage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = params.orgSlug as string;

  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [contractType, setContractType] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [showFilters, setShowFilters] = useState(false);
  const [stats, setStats] = useState<any>(null);

  const fetchContracts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (status) params.set('status', status);
      if (contractType) params.set('contractType', contractType);
      params.set('sortBy', sortBy);
      params.set('sortOrder', sortOrder);
      params.set('page', String(page));
      params.set('limit', '15');

      const data = await apiFetch(`/organizations/${orgSlug}/contracts?${params.toString()}`);
      setContracts(data.items);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (err) {
      console.error('Failed to fetch contracts:', err);
    } finally {
      setLoading(false);
    }
  }, [orgSlug, search, status, contractType, sortBy, sortOrder, page]);

  useEffect(() => { fetchContracts(); }, [fetchContracts]);

  useEffect(() => {
    apiFetch(`/organizations/${orgSlug}/contracts/stats`).then(setStats).catch(() => {});
  }, [orgSlug]);

  const toggleSort = (field: string) => {
    setSortBy(field);
    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    setPage(1);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Contracts</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage contracts and client conversions</p>
        </div>
        <Link href={`/${orgSlug}/crm/contracts/new`} className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors">
          <Plus size={16} /> New Contract
        </Link>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="border border-gray-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 p-4">
            <p className="text-xs text-gray-500 font-medium">Total Contracts</p>
            <p className="text-2xl font-bold mt-1">{stats.total}</p>
          </div>
          <div className="border border-gray-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 p-4">
            <p className="text-xs text-gray-500 font-medium">Active</p>
            <p className="text-2xl font-bold mt-1 text-green-600">{stats.active}</p>
          </div>
          <div className="border border-gray-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 p-4">
            <p className="text-xs text-gray-500 font-medium">Active Value</p>
            <p className="text-2xl font-bold mt-1">${stats.totalValue?.toLocaleString() || 0}</p>
          </div>
          <div className="border border-gray-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber-500" />
              <p className="text-xs text-gray-500 font-medium">Expiring Soon</p>
            </div>
            <p className="text-2xl font-bold mt-1 text-amber-600">{stats.expiringSoon}</p>
          </div>
        </div>
      )}

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search contracts..." className="w-full pl-10 pr-4 py-2 rounded-md border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowFilters(!showFilters)} className={`inline-flex items-center gap-2 px-3 py-2 rounded-md border text-sm font-medium transition-colors ${showFilters || status || contractType ? 'border-primary bg-primary/5 text-primary' : 'border-gray-200 dark:border-zinc-800 hover:bg-gray-50'}`}>
            <Filter size={16} /> Filters
          </button>
          <select value={`${sortBy}-${sortOrder}`} onChange={(e) => { const [f, o] = e.target.value.split('-'); setSortBy(f); setSortOrder(o); setPage(1); }} className="px-3 py-2 rounded-md border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm">
            <option value="createdAt-desc">Newest</option>
            <option value="createdAt-asc">Oldest</option>
            <option value="contractValue-desc">Highest Value</option>
            <option value="endDate-asc">Expiring Soon</option>
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
              <label className="block text-xs font-medium text-gray-500 mb-1">Type</label>
              <select value={contractType} onChange={(e) => { setContractType(e.target.value); setPage(1); }} className="w-full px-3 py-2 rounded-md border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm">
                {CONTRACT_TYPES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Contracts Table */}
      <div className="border border-gray-200 dark:border-zinc-800 rounded-lg overflow-hidden bg-white dark:bg-zinc-900">
        {loading ? (
          <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
        ) : contracts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <FileText size={48} className="text-gray-300 dark:text-zinc-600 mb-4" />
            <h3 className="text-lg font-medium mb-1">No contracts found</h3>
            <p className="text-sm text-gray-500 mb-4">{search || status || contractType ? 'Try adjusting your filters' : 'Create your first contract'}</p>
            <Link href={`/${orgSlug}/crm/contracts/new`} className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90">
              <Plus size={16} /> New Contract
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 dark:bg-zinc-800/50 border-b border-gray-200 dark:border-zinc-800">
                <tr>
                  <th className="px-6 py-3 font-medium text-gray-500">Contract</th>
                  <th className="px-6 py-3 font-medium text-gray-500">Company</th>
                  <th className="px-6 py-3">
                    <button onClick={() => toggleSort('status')} className="inline-flex items-center gap-1 font-medium text-gray-500">Status <ArrowUpDown size={14} /></button>
                  </th>
                  <th className="px-6 py-3">
                    <button onClick={() => toggleSort('contractValue')} className="inline-flex items-center gap-1 font-medium text-gray-500">Value <ArrowUpDown size={14} /></button>
                  </th>
                  <th className="px-6 py-3 font-medium text-gray-500">Period</th>
                  <th className="px-6 py-3 font-medium text-gray-500 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {contracts.map((c) => (
                  <tr key={c.id} className="border-b border-gray-200 dark:border-zinc-800 last:border-0 hover:bg-gray-50 dark:hover:bg-zinc-800/30 cursor-pointer" onClick={() => router.push(`/${orgSlug}/crm/contracts/${c.id}`)}>
                    <td className="px-6 py-4">
                      <p className="font-medium">{c.title}</p>
                      <p className="text-xs text-gray-500">{c.contractNumber}</p>
                    </td>
                    <td className="px-6 py-4">
                      {c.company ? <span className="flex items-center gap-1 text-gray-600 dark:text-gray-400"><Building2 size={14} />{c.company.name}</span> : <span className="text-gray-400">-</span>}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[c.status] || ''}`}>{c.status.replace(/_/g, ' ')}</span>
                    </td>
                    <td className="px-6 py-4 font-medium">{formatValue(c.contractValue, c.currency)}</td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-400 text-xs">
                      {c.startDate && c.endDate ? `${new Date(c.startDate).toLocaleDateString()} - ${new Date(c.endDate).toLocaleDateString()}` : '-'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link href={`/${orgSlug}/crm/contracts/${c.id}/edit`} onClick={(e) => e.stopPropagation()} className="text-gray-500 hover:text-primary text-sm">Edit</Link>
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
    </div>
  );
}
