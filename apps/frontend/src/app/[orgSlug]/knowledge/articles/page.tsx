'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import {
  BookOpen,
  Search,
  Plus,
  Filter,
  FileText,
  CheckCircle2,
  Clock,
  Globe,
  Users,
  Lock,
  ChevronRight,
  ChevronLeft,
  SlidersHorizontal,
  LayoutGrid,
  List as ListIcon,
  Trash2,
  Edit,
  Folder
} from 'lucide-react';

interface Category {
  id: string;
  name: string;
  color?: string;
}

interface Article {
  id: string;
  title: string;
  slug: string;
  summary?: string;
  status: string;
  visibility: string;
  createdAt: string;
  updatedAt: string;
  category?: Category;
  author?: { firstName?: string; lastName?: string; email?: string };
}

export default function ArticleListPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const orgSlug = params?.orgSlug as string;

  const [articles, setArticles] = useState<Article[]>([
    {
      id: 'art-1',
      title: 'Engineering Onboarding & System Setup Guide',
      slug: 'engineering-onboarding-guide',
      summary: 'Complete guide for new software engineers joining the engineering department.',
      status: 'PUBLISHED',
      visibility: 'ORGANIZATION',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      category: { id: '3', name: 'Technical Docs', color: '#8b5cf6' },
      author: { firstName: 'Alex', lastName: 'Morgan' },
    },
    {
      id: 'art-2',
      title: 'Information Security & Data Protection SOP',
      slug: 'info-security-sop',
      summary: 'Mandatory guidelines regarding credential management, data encryption, and access control.',
      status: 'PUBLISHED',
      visibility: 'ORGANIZATION',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 86400000).toISOString(),
      category: { id: '2', name: 'Internal Policies', color: '#10b981' },
      author: { firstName: 'Sarah', lastName: 'Connor' },
    },
    {
      id: 'art-3',
      title: 'Client Project Proposal & Scope Template',
      slug: 'client-proposal-template',
      summary: 'Standardized template for constructing enterprise client proposals and scope documents.',
      status: 'DRAFT',
      visibility: 'TEAM',
      createdAt: new Date(Date.now() - 172800000).toISOString(),
      updatedAt: new Date(Date.now() - 172800000).toISOString(),
      category: { id: '4', name: 'Templates', color: '#f59e0b' },
      author: { firstName: 'John', lastName: 'Doe' },
    },
  ]);

  const [categories, setCategories] = useState<Category[]>([
    { id: '1', name: 'SOPs & Guidelines', color: '#3b82f6' },
    { id: '2', name: 'Internal Policies', color: '#10b981' },
    { id: '3', name: 'Technical Docs', color: '#8b5cf6' },
    { id: '4', name: 'Templates', color: '#f59e0b' },
  ]);

  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

  // Filters & Pagination State
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('categoryId') || '');
  const [selectedStatus, setSelectedStatus] = useState(searchParams.get('status') || '');
  const [selectedVisibility, setSelectedVisibility] = useState(searchParams.get('visibility') || '');
  const [sortBy, setSortBy] = useState('createdAt');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(3);

  useEffect(() => {
    async function loadArticles() {
      try {
        setLoading(true);
        const orgRes = await apiFetch(`/organizations/${orgSlug}`).catch(() => null);
        const orgId = orgRes?.id || orgSlug;

        const catData = await apiFetch(`/organizations/${orgId}/knowledge/categories`).catch(() => null);
        if (catData && Array.isArray(catData)) setCategories(catData);

        const queryParams = new URLSearchParams();
        if (search) queryParams.set('search', search);
        if (selectedCategory) queryParams.set('categoryId', selectedCategory);
        if (selectedStatus) queryParams.set('status', selectedStatus);
        if (selectedVisibility) queryParams.set('visibility', selectedVisibility);
        if (sortBy) queryParams.set('sortBy', sortBy);
        queryParams.set('page', String(page));
        queryParams.set('limit', '10');

        const artData = await apiFetch(`/organizations/${orgId}/knowledge/articles?${queryParams.toString()}`).catch(() => null);

        if (artData && artData.items) {
          setArticles(artData.items);
          setTotalPages(artData.totalPages || 1);
          setTotalCount(artData.total || 0);
        }
      } catch (err) {
        console.error('Error fetching articles:', err);
      } finally {
        setLoading(false);
      }
    }

    loadArticles();
  }, [orgSlug, search, selectedCategory, selectedStatus, selectedVisibility, sortBy, page]);

  const getVisibilityBadge = (vis: string) => {
    switch (vis) {
      case 'PRIVATE':
        return <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300"><Lock size={12} /> Private</span>;
      case 'TEAM':
        return <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400"><Users size={12} /> Team</span>;
      case 'ORGANIZATION':
      default:
        return <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400"><Globe size={12} /> Organization</span>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PUBLISHED':
        return <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"><CheckCircle2 size={12} /> Published</span>;
      case 'DRAFT':
        return <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800"><Clock size={12} /> Draft</span>;
      case 'ARCHIVED':
        return <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 border border-gray-200 dark:border-zinc-700">Archived</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Link href={`/${orgSlug}/knowledge`} className="text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">
              Knowledge
            </Link>
            <ChevronRight size={16} className="text-gray-400" />
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">All Articles</h1>
          </div>
          <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">
            Browse, search, and manage organization documentation and SOPs.
          </p>
        </div>
        <Link
          href={`/${orgSlug}/knowledge/articles/new`}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm"
        >
          <Plus size={16} /> Create Article
        </Link>
      </div>

      {/* Filter & Toolbar */}
      <div className="p-4 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row gap-3 items-center justify-between">
          {/* Search Input */}
          <div className="relative w-full lg:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search title or content..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary text-gray-900 dark:text-white"
            />
          </div>

          {/* Filters dropdowns */}
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => { setSelectedCategory(e.target.value); setPage(1); }}
              className="px-3 py-2 bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-700 rounded-lg text-xs font-medium text-gray-700 dark:text-zinc-300 focus:outline-none"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => { setSelectedStatus(e.target.value); setPage(1); }}
              className="px-3 py-2 bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-700 rounded-lg text-xs font-medium text-gray-700 dark:text-zinc-300 focus:outline-none"
            >
              <option value="">All Statuses</option>
              <option value="PUBLISHED">Published</option>
              <option value="DRAFT">Draft</option>
              <option value="ARCHIVED">Archived</option>
            </select>

            {/* Visibility Filter */}
            <select
              value={selectedVisibility}
              onChange={(e) => { setSelectedVisibility(e.target.value); setPage(1); }}
              className="px-3 py-2 bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-700 rounded-lg text-xs font-medium text-gray-700 dark:text-zinc-300 focus:outline-none"
            >
              <option value="">All Visibilities</option>
              <option value="ORGANIZATION">Organization</option>
              <option value="TEAM">Team</option>
              <option value="PRIVATE">Private</option>
            </select>

            {/* Sort Filter */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-700 rounded-lg text-xs font-medium text-gray-700 dark:text-zinc-300 focus:outline-none"
            >
              <option value="createdAt">Newest First</option>
              <option value="updatedAt">Recently Updated</option>
              <option value="title">Title (A-Z)</option>
            </select>

            {/* View Mode Toggle */}
            <div className="flex items-center border border-gray-200 dark:border-zinc-700 rounded-lg overflow-hidden ml-auto">
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 transition-colors ${viewMode === 'list' ? 'bg-primary/10 text-primary' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-zinc-800'}`}
              >
                <ListIcon size={16} />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 transition-colors ${viewMode === 'grid' ? 'bg-primary/10 text-primary' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-zinc-800'}`}
              >
                <LayoutGrid size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Articles Rendering */}
      {viewMode === 'list' ? (
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl shadow-sm overflow-hidden divide-y divide-gray-100 dark:divide-zinc-800">
          {articles.length === 0 ? (
            <div className="p-12 text-center text-gray-500 dark:text-zinc-400">
              No articles match the specified filters.
            </div>
          ) : (
            articles.map((art) => (
              <div
                key={art.id}
                className="p-5 hover:bg-gray-50/80 dark:hover:bg-zinc-800/40 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1 flex-1 cursor-pointer" onClick={() => router.push(`/${orgSlug}/knowledge/articles/${art.id}`)}>
                  <div className="flex flex-wrap items-center gap-2">
                    {art.category && (
                      <span
                        className="text-xs font-medium px-2 py-0.5 rounded text-white"
                        style={{ backgroundColor: art.category.color || '#3b82f6' }}
                      >
                        {art.category.name}
                      </span>
                    )}
                    {getStatusBadge(art.status)}
                    {getVisibilityBadge(art.visibility)}
                  </div>
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white hover:text-primary transition-colors">
                    {art.title}
                  </h3>
                  {art.summary && (
                    <p className="text-xs text-gray-500 dark:text-zinc-400 line-clamp-1">
                      {art.summary}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-zinc-400 shrink-0">
                  <span>Author: {art.author ? `${art.author.firstName || ''} ${art.author.lastName || ''}` : 'User'}</span>
                  <span>Updated: {new Date(art.updatedAt).toLocaleDateString()}</span>

                  <div className="flex items-center gap-1 border-l border-gray-200 dark:border-zinc-800 pl-3">
                    <button
                      onClick={() => router.push(`/${orgSlug}/knowledge/articles/${art.id}/edit`)}
                      className="p-1.5 hover:bg-gray-200 dark:hover:bg-zinc-700 rounded text-gray-600 dark:text-zinc-300 transition-colors"
                      title="Edit Article"
                    >
                      <Edit size={15} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {articles.map((art) => (
            <div
              key={art.id}
              className="p-5 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  {art.category ? (
                    <span
                      className="text-xs font-medium px-2 py-0.5 rounded text-white"
                      style={{ backgroundColor: art.category.color || '#3b82f6' }}
                    >
                      {art.category.name}
                    </span>
                  ) : <span />}
                  {getStatusBadge(art.status)}
                </div>

                <h3
                  onClick={() => router.push(`/${orgSlug}/knowledge/articles/${art.id}`)}
                  className="text-base font-semibold text-gray-900 dark:text-white hover:text-primary transition-colors cursor-pointer line-clamp-2"
                >
                  {art.title}
                </h3>

                {art.summary && (
                  <p className="text-xs text-gray-500 dark:text-zinc-400 line-clamp-3">
                    {art.summary}
                  </p>
                )}
              </div>

              <div className="mt-5 pt-3 border-t border-gray-100 dark:border-zinc-800 flex items-center justify-between text-xs text-gray-500 dark:text-zinc-400">
                {getVisibilityBadge(art.visibility)}
                <span>{new Date(art.updatedAt).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination Footer */}
      <div className="flex items-center justify-between p-4 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl">
        <p className="text-xs text-gray-500 dark:text-zinc-400">
          Showing page <span className="font-semibold text-gray-900 dark:text-white">{page}</span> of{' '}
          <span className="font-semibold text-gray-900 dark:text-white">{totalPages}</span> ({totalCount} total articles)
        </p>

        <div className="flex items-center gap-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
            className="p-2 border border-gray-200 dark:border-zinc-800 rounded-lg text-xs font-medium text-gray-600 dark:text-zinc-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-zinc-800"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
            className="p-2 border border-gray-200 dark:border-zinc-800 rounded-lg text-xs font-medium text-gray-600 dark:text-zinc-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-zinc-800"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
