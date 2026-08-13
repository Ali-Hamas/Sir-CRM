'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import {
  Search, Plus, Users, Mail, Phone, MapPin,
  ChevronLeft, ChevronRight, Filter, ArrowUpDown, Building2,
  TrendingUp, Star, DollarSign, Zap
} from 'lucide-react';

interface Lead {
  id: string;
  firstName: string;
  lastName: string;
  companyName: string | null;
  email: string | null;
  phone: string | null;
  jobTitle: string | null;
  country: string | null;
  source: string;
  status: string;
  leadScore: number;
  estimatedValue: number | null;
  expectedCloseDate: string | null;
  assignedTo: { id: string; firstName: string; lastName: string; email: string } | null;
  tags: { id: string; name: string }[];
  _count: { notes: number; activities: number };
  createdAt: string;
}

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'NEW', label: 'New' },
  { value: 'CONTACTED', label: 'Contacted' },
  { value: 'QUALIFIED', label: 'Qualified' },
  { value: 'PROPOSAL_SENT', label: 'Proposal Sent' },
  { value: 'NEGOTIATION', label: 'Negotiation' },
  { value: 'WON', label: 'Won' },
  { value: 'LOST', label: 'Lost' },
];

const SOURCE_OPTIONS = [
  { value: '', label: 'All Sources' },
  { value: 'WEBSITE', label: 'Website' },
  { value: 'REFERRAL', label: 'Referral' },
  { value: 'LINKEDIN', label: 'LinkedIn' },
  { value: 'EMAIL_CAMPAIGN', label: 'Email Campaign' },
  { value: 'EVENT', label: 'Event' },
  { value: 'COLD_OUTREACH', label: 'Cold Outreach' },
  { value: 'PARTNER', label: 'Partner' },
  { value: 'OTHER', label: 'Other' },
];

const SORT_OPTIONS = [
  { value: 'createdAt', label: 'Date Created' },
  { value: 'firstName', label: 'Name' },
  { value: 'status', label: 'Status' },
  { value: 'leadScore', label: 'Lead Score' },
  { value: 'estimatedValue', label: 'Estimated Value' },
];

const STATUS_COLORS: Record<string, string> = {
  NEW: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  CONTACTED: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  QUALIFIED: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
  PROPOSAL_SENT: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  NEGOTIATION: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  WON: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  LOST: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

const SOURCE_LABELS: Record<string, string> = {
  WEBSITE: 'Website',
  REFERRAL: 'Referral',
  LINKEDIN: 'LinkedIn',
  EMAIL_CAMPAIGN: 'Email Campaign',
  EVENT: 'Event',
  COLD_OUTREACH: 'Cold Outreach',
  PARTNER: 'Partner',
  OTHER: 'Other',
};

function getScoreColor(score: number) {
  if (score >= 80) return 'text-green-600 dark:text-green-400';
  if (score >= 50) return 'text-yellow-600 dark:text-yellow-400';
  if (score >= 30) return 'text-orange-600 dark:text-orange-400';
  return 'text-red-600 dark:text-red-400';
}

function formatValue(value: number | null) {
  if (!value) return '-';
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toLocaleString()}`;
}

export default function LeadsPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const orgSlug = params.orgSlug as string;

  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [status, setStatus] = useState(searchParams.get('status') || '');
  const [source, setSource] = useState(searchParams.get('source') || '');
  const [sortBy, setSortBy] = useState(searchParams.get('sortBy') || 'createdAt');
  const [sortOrder, setSortOrder] = useState(searchParams.get('sortOrder') || 'desc');
  const [showFilters, setShowFilters] = useState(false);
  const [stats, setStats] = useState<any>(null);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (status) params.set('status', status);
      if (source) params.set('source', source);
      params.set('sortBy', sortBy);
      params.set('sortOrder', sortOrder);
      params.set('page', String(page));
      params.set('limit', '15');

      const data = await apiFetch(`/organizations/${orgSlug}/leads?${params.toString()}`);
      setLeads(data.items);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (err) {
      console.error('Failed to fetch leads:', err);
    } finally {
      setLoading(false);
    }
  }, [orgSlug, search, status, source, sortBy, sortOrder, page]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  useEffect(() => {
    apiFetch(`/organizations/${orgSlug}/leads/stats`)
      .then(setStats)
      .catch(() => {});
  }, [orgSlug]);

  const toggleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
    setPage(1);
  };

  const activeFilterCount = [status, source].filter(Boolean).length;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Leads</h1>
          <p className="text-muted-foreground text-sm mt-1">Track and manage your sales leads</p>
        </div>
        <Link
          href={`/${orgSlug}/crm/leads/new`}
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus size={16} />
          Add Lead
        </Link>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="border border-gray-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium">Total Leads</p>
                <p className="text-2xl font-bold mt-1">{stats.total}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                <Users size={20} className="text-blue-500" />
              </div>
            </div>
          </div>
          <div className="border border-gray-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium">Total Value</p>
                <p className="text-2xl font-bold mt-1">{formatValue(stats.totalValue)}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
                <DollarSign size={20} className="text-green-500" />
              </div>
            </div>
          </div>
          <div className="border border-gray-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium">New Leads</p>
                <p className="text-2xl font-bold mt-1">{stats.byStatus?.NEW || 0}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center">
                <Zap size={20} className="text-indigo-500" />
              </div>
            </div>
          </div>
          <div className="border border-gray-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium">Won</p>
                <p className="text-2xl font-bold mt-1">{stats.byStatus?.WON || 0}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
                <TrendingUp size={20} className="text-emerald-500" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search leads..."
            className="w-full pl-10 pr-4 py-2 rounded-md border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center gap-2 px-3 py-2 rounded-md border text-sm font-medium transition-colors ${
              showFilters || activeFilterCount > 0
                ? 'border-primary bg-primary/5 text-primary'
                : 'border-gray-200 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-800'
            }`}
          >
            <Filter size={16} />
            Filters
            {activeFilterCount > 0 && (
              <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs">{activeFilterCount}</span>
            )}
          </button>
          <select
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [field, order] = e.target.value.split('-');
              setSortBy(field);
              setSortOrder(order);
              setPage(1);
            }}
            className="px-3 py-2 rounded-md border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={`${opt.value}-desc`}>{opt.label} (Newest)</option>
            ))}
            {SORT_OPTIONS.map((opt) => (
              <option key={`${opt.value}-asc`} value={`${opt.value}-asc`}>{opt.label} (Oldest)</option>
            ))}
          </select>
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="border border-gray-200 dark:border-zinc-800 rounded-lg p-4 bg-gray-50 dark:bg-zinc-900/50">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium">Filters</h3>
            {activeFilterCount > 0 && (
              <button onClick={() => { setStatus(''); setSource(''); setPage(1); }} className="text-sm text-primary hover:underline">Clear all</button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
              <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="w-full px-3 py-2 rounded-md border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm">
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Source</label>
              <select value={source} onChange={(e) => { setSource(e.target.value); setPage(1); }} className="w-full px-3 py-2 rounded-md border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm">
                {SOURCE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Leads Table */}
      <div className="border border-gray-200 dark:border-zinc-800 rounded-lg overflow-hidden bg-white dark:bg-zinc-900">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : leads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <TrendingUp size={48} className="text-gray-300 dark:text-zinc-600 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">No leads found</h3>
            <p className="text-sm text-gray-500 mb-4">
              {search || status || source ? 'Try adjusting your search or filters' : 'Get started by adding your first lead'}
            </p>
            {!search && !status && !source && (
              <Link href={`/${orgSlug}/crm/leads/new`} className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90">
                <Plus size={16} /> Add Lead
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 dark:bg-zinc-800/50 border-b border-gray-200 dark:border-zinc-800">
                <tr>
                  <th className="px-6 py-3">
                    <button onClick={() => toggleSort('lastName')} className="inline-flex items-center gap-1 font-medium text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                      Name <ArrowUpDown size={14} />
                    </button>
                  </th>
                  <th className="px-6 py-3 font-medium text-gray-500">Company</th>
                  <th className="px-6 py-3">
                    <button onClick={() => toggleSort('status')} className="inline-flex items-center gap-1 font-medium text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                      Status <ArrowUpDown size={14} />
                    </button>
                  </th>
                  <th className="px-6 py-3">
                    <button onClick={() => toggleSort('leadScore')} className="inline-flex items-center gap-1 font-medium text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                      Score <ArrowUpDown size={14} />
                    </button>
                  </th>
                  <th className="px-6 py-3 font-medium text-gray-500">Source</th>
                  <th className="px-6 py-3">
                    <button onClick={() => toggleSort('estimatedValue')} className="inline-flex items-center gap-1 font-medium text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                      Value <ArrowUpDown size={14} />
                    </button>
                  </th>
                  <th className="px-6 py-3 font-medium text-gray-500 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr
                    key={lead.id}
                    className="border-b border-gray-200 dark:border-zinc-800 last:border-0 hover:bg-gray-50 dark:hover:bg-zinc-800/30 transition-colors cursor-pointer"
                    onClick={() => router.push(`/${orgSlug}/crm/leads/${lead.id}`)}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                          {lead.firstName?.[0]}{lead.lastName?.[0]}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-gray-100">{lead.firstName} {lead.lastName}</p>
                          {lead.jobTitle && <p className="text-xs text-gray-500">{lead.jobTitle}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {lead.companyName ? (
                        <span className="inline-flex items-center gap-1 text-gray-600 dark:text-gray-400">
                          <Building2 size={14} /> {lead.companyName}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[lead.status] || ''}`}>
                        {lead.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        <Star size={14} className={getScoreColor(lead.leadScore)} />
                        <span className={`text-sm font-medium ${getScoreColor(lead.leadScore)}`}>{lead.leadScore}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-400 text-sm">
                      {SOURCE_LABELS[lead.source] || lead.source}
                    </td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-400 text-sm font-medium">
                      {formatValue(lead.estimatedValue)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/${orgSlug}/crm/leads/${lead.id}/edit`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-gray-500 hover:text-primary text-sm"
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/30">
            <p className="text-sm text-gray-500">
              Showing {((page - 1) * 15) + 1} to {Math.min(page * 15, total)} of {total} leads
            </p>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="p-1.5 rounded-md border border-gray-200 dark:border-zinc-700 disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-zinc-800">
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) pageNum = i + 1;
                else if (page <= 3) pageNum = i + 1;
                else if (page >= totalPages - 2) pageNum = totalPages - 4 + i;
                else pageNum = page - 2 + i;
                return (
                  <button key={pageNum} onClick={() => setPage(pageNum)} className={`w-8 h-8 rounded-md text-sm font-medium ${page === pageNum ? 'bg-primary text-primary-foreground' : 'hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-600 dark:text-gray-400'}`}>
                    {pageNum}
                  </button>
                );
              })}
              <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} className="p-1.5 rounded-md border border-gray-200 dark:border-zinc-700 disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-zinc-800">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
