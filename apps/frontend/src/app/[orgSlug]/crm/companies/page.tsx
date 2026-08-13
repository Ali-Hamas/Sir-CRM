'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import {
  Search, Plus, Building2, Globe, Mail, Phone, MapPin,
  ChevronLeft, ChevronRight, Filter, ArrowUpDown
} from 'lucide-react';

interface Company {
  id: string;
  name: string;
  legalName: string | null;
  industry: string | null;
  companyType: string | null;
  website: string | null;
  email: string | null;
  phone: string | null;
  country: string | null;
  city: string | null;
  status: string;
  numberOfEmployees: number | null;
  annualRevenue: number | null;
  assignedTo: { id: string; firstName: string; lastName: string; email: string } | null;
  tags: { id: string; name: string }[];
  _count: { notes: number; activities: number };
  createdAt: string;
}

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'PROSPECT', label: 'Prospect' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
  { value: 'CLIENT', label: 'Client' },
];

const INDUSTRY_OPTIONS = [
  '', 'Technology', 'Healthcare', 'Finance', 'Manufacturing', 'Retail',
  'Education', 'Real Estate', 'Energy', 'Transportation', 'Media',
  'Telecommunications', 'Agriculture', 'Construction', 'Hospitality',
  'Legal', 'Consulting', 'Other',
];

const SORT_OPTIONS = [
  { value: 'createdAt', label: 'Date Created' },
  { value: 'name', label: 'Company Name' },
  { value: 'status', label: 'Status' },
  { value: 'industry', label: 'Industry' },
  { value: 'numberOfEmployees', label: 'Employees' },
  { value: 'annualRevenue', label: 'Revenue' },
];

const STATUS_COLORS: Record<string, string> = {
  PROSPECT: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  ACTIVE: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  INACTIVE: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400',
  CLIENT: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
};

export default function CompaniesPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const orgSlug = params.orgSlug as string;

  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [status, setStatus] = useState(searchParams.get('status') || '');
  const [industry, setIndustry] = useState(searchParams.get('industry') || '');
  const [sortBy, setSortBy] = useState(searchParams.get('sortBy') || 'createdAt');
  const [sortOrder, setSortOrder] = useState(searchParams.get('sortOrder') || 'desc');
  const [showFilters, setShowFilters] = useState(false);
  const [activeFilterCount, setActiveFilterCount] = useState(0);

  const fetchCompanies = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (status) params.set('status', status);
      if (industry) params.set('industry', industry);
      params.set('sortBy', sortBy);
      params.set('sortOrder', sortOrder);
      params.set('page', String(page));
      params.set('limit', '15');

      const data = await apiFetch(`/organizations/${orgSlug}/companies?${params.toString()}`);
      setCompanies(data?.items || []);
      setTotal(data?.total || 0);
      setTotalPages(data?.totalPages || 0);
    } catch (err) {
      console.error('Failed to fetch companies:', err);
    } finally {
      setLoading(false);
    }
  }, [orgSlug, search, status, industry, sortBy, sortOrder, page]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  useEffect(() => {
    let count = 0;
    if (status) count++;
    if (industry) count++;
    setActiveFilterCount(count);
  }, [status, industry]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
  };

  const clearFilters = () => {
    setStatus('');
    setIndustry('');
    setPage(1);
  };

  const toggleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
    setPage(1);
  };

  const formatRevenue = (revenue: number | null) => {
    if (!revenue) return '-';
    if (revenue >= 1_000_000_000) return `$${(revenue / 1_000_000_000).toFixed(1)}B`;
    if (revenue >= 1_000_000) return `$${(revenue / 1_000_000).toFixed(1)}M`;
    if (revenue >= 1_000) return `$${(revenue / 1_000).toFixed(0)}K`;
    return `$${revenue.toLocaleString()}`;
  };

  const formatEmployees = (count: number | null) => {
    if (!count) return '-';
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toLocaleString();
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Companies</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage your business contacts and relationships</p>
        </div>
        <Link
          href={`/${orgSlug}/crm/companies/new`}
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus size={16} />
          Add Company
        </Link>
      </div>

      {/* Search & Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearch} className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search companies..."
            className="w-full pl-10 pr-4 py-2 rounded-md border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </form>
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
              <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs">
                {activeFilterCount}
              </span>
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
              <button onClick={clearFilters} className="text-sm text-primary hover:underline">Clear all</button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => { setStatus(e.target.value); setPage(1); }}
                className="w-full px-3 py-2 rounded-md border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Industry</label>
              <select
                value={industry}
                onChange={(e) => { setIndustry(e.target.value); setPage(1); }}
                className="w-full px-3 py-2 rounded-md border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm"
              >
                <option value="">All Industries</option>
                {INDUSTRY_OPTIONS.filter(Boolean).map((ind) => (
                  <option key={ind} value={ind}>{ind}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Companies Table */}
      <div className="border border-gray-200 dark:border-zinc-800 rounded-lg overflow-hidden bg-white dark:bg-zinc-900">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : companies.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Building2 size={48} className="text-gray-300 dark:text-zinc-600 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">No companies found</h3>
            <p className="text-sm text-gray-500 mb-4">
              {search || status || industry
                ? 'Try adjusting your search or filters'
                : 'Get started by adding your first company'}
            </p>
            {!search && !status && !industry && (
              <Link
                href={`/${orgSlug}/crm/companies/new`}
                className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90"
              >
                <Plus size={16} />
                Add Company
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 dark:bg-zinc-800/50 border-b border-gray-200 dark:border-zinc-800">
                <tr>
                  <th className="px-6 py-3">
                    <button onClick={() => toggleSort('name')} className="inline-flex items-center gap-1 font-medium text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                      Company <ArrowUpDown size={14} />
                    </button>
                  </th>
                  <th className="px-6 py-3 font-medium text-gray-500">Industry</th>
                  <th className="px-6 py-3">
                    <button onClick={() => toggleSort('status')} className="inline-flex items-center gap-1 font-medium text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                      Status <ArrowUpDown size={14} />
                    </button>
                  </th>
                  <th className="px-6 py-3 font-medium text-gray-500">Location</th>
                  <th className="px-6 py-3">
                    <button onClick={() => toggleSort('numberOfEmployees')} className="inline-flex items-center gap-1 font-medium text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                      Employees <ArrowUpDown size={14} />
                    </button>
                  </th>
                  <th className="px-6 py-3">
                    <button onClick={() => toggleSort('annualRevenue')} className="inline-flex items-center gap-1 font-medium text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                      Revenue <ArrowUpDown size={14} />
                    </button>
                  </th>
                  <th className="px-6 py-3 font-medium text-gray-500">Assigned To</th>
                  <th className="px-6 py-3 font-medium text-gray-500 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {companies.map((company) => (
                  <tr
                    key={company.id}
                    className="border-b border-gray-200 dark:border-zinc-800 last:border-0 hover:bg-gray-50 dark:hover:bg-zinc-800/30 transition-colors cursor-pointer"
                    onClick={() => router.push(`/${orgSlug}/crm/companies/${company.id}`)}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                          {company.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{company.name}</p>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            {company.website && (
                              <span className="inline-flex items-center gap-1 truncate max-w-[150px]">
                                <Globe size={12} /> {company.website.replace(/^https?:\/\//, '')}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {company.industry ? (
                        <span className="text-gray-700 dark:text-gray-300">{company.industry}</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[company.status] || ''}`}>
                        {company.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {[company.city, company.country].filter(Boolean).join(', ') ? (
                        <span className="inline-flex items-center gap-1 text-gray-600 dark:text-gray-400">
                          <MapPin size={14} />
                          {[company.city, company.country].filter(Boolean).join(', ')}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                      {formatEmployees(company.numberOfEmployees)}
                    </td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                      {formatRevenue(company.annualRevenue)}
                    </td>
                    <td className="px-6 py-4">
                      {company.assignedTo ? (
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                            {company.assignedTo.firstName?.[0]}{company.assignedTo.lastName?.[0]}
                          </div>
                          <span className="text-sm text-gray-600 dark:text-gray-400 truncate max-w-[120px]">
                            {company.assignedTo.firstName} {company.assignedTo.lastName}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">Unassigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/${orgSlug}/crm/companies/${company.id}/edit`}
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
              Showing {((page - 1) * 15) + 1} to {Math.min(page * 15, total)} of {total} companies
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-md border border-gray-200 dark:border-zinc-700 disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-zinc-800"
              >
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (page <= 3) {
                  pageNum = i + 1;
                } else if (page >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = page - 2 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`w-8 h-8 rounded-md text-sm font-medium ${
                      page === pageNum
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-md border border-gray-200 dark:border-zinc-700 disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-zinc-800"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
