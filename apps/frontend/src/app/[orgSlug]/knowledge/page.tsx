'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import {
  BookOpen,
  Search,
  Plus,
  FolderPlus,
  FileText,
  CheckCircle2,
  Clock,
  Folders,
  ArrowRight,
  Sparkles,
  Eye,
  Globe,
  Users,
  Lock,
  Tag,
  Calendar,
  User,
  ChevronRight,
  Star,
  Bookmark
} from 'lucide-react';

interface Stats {
  totalArticles: number;
  publishedArticles: number;
  draftArticles: number;
  totalCategories: number;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  color?: string;
  _count?: { articles: number };
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

export default function KnowledgeDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = params?.orgSlug as string;

  const [stats, setStats] = useState<Stats>({
    totalArticles: 12,
    publishedArticles: 9,
    draftArticles: 3,
    totalCategories: 4,
  });

  const [categories, setCategories] = useState<Category[]>([
    { id: '1', name: 'SOPs & Guidelines', slug: 'sops-guidelines', description: 'Standard Operating Procedures for company workflows', color: '#3b82f6', _count: { articles: 5 } },
    { id: '2', name: 'Internal Policies', slug: 'internal-policies', description: 'HR, Security, and Workplace compliance policies', color: '#10b981', _count: { articles: 3 } },
    { id: '3', name: 'Technical Docs', slug: 'technical-docs', description: 'Architecture, APIs, and Engineering documentation', color: '#8b5cf6', _count: { articles: 4 } },
    { id: '4', name: 'Templates', slug: 'templates', description: 'Reusable document & project templates', color: '#f59e0b', _count: { articles: 2 } },
  ]);

  const [recentArticles, setRecentArticles] = useState<Article[]>([
    {
      id: 'art-1',
      title: 'Engineering Onboarding & System Setup Guide',
      slug: 'engineering-onboarding-guide',
      summary: 'Complete guide for new software engineers joining the engineering department.',
      status: 'PUBLISHED',
      visibility: 'ORGANIZATION',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      category: { id: '3', name: 'Technical Docs', slug: 'technical-docs', color: '#8b5cf6' },
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
      category: { id: '2', name: 'Internal Policies', slug: 'internal-policies', color: '#10b981' },
      author: { firstName: 'Sarah', lastName: 'Connor' },
    },
  ]);

  const [favorites, setFavorites] = useState<Article[]>([
    {
      id: 'art-1',
      title: 'Engineering Onboarding & System Setup Guide',
      slug: 'engineering-onboarding-guide',
      summary: 'Complete guide for new software engineers joining the engineering department.',
      status: 'PUBLISHED',
      visibility: 'ORGANIZATION',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      category: { id: '3', name: 'Technical Docs', slug: 'technical-docs', color: '#8b5cf6' },
      author: { firstName: 'Alex', lastName: 'Morgan' },
    },
  ]);

  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const orgRes = await apiFetch(`/organizations/${orgSlug}`).catch(() => null);
        const orgId = orgRes?.id || orgSlug;

        const [statsData, catData, artData, favData] = await Promise.all([
          apiFetch(`/organizations/${orgId}/knowledge/stats`).catch(() => null),
          apiFetch(`/organizations/${orgId}/knowledge/categories`).catch(() => null),
          apiFetch(`/organizations/${orgId}/knowledge/articles?limit=5`).catch(() => null),
          apiFetch(`/organizations/${orgId}/knowledge/favorites`).catch(() => null),
        ]);

        if (statsData) setStats(statsData);
        if (catData && Array.isArray(catData)) setCategories(catData);
        if (artData && artData.items) setRecentArticles(artData.items);
        if (favData && Array.isArray(favData)) setFavorites(favData);
      } catch (err) {
        console.error('Error loading Knowledge Dashboard:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [orgSlug]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/${orgSlug}/knowledge/articles?search=${encodeURIComponent(searchQuery)}`);
    } else {
      router.push(`/${orgSlug}/knowledge/articles`);
    }
  };

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
        return <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"><CheckCircle2 size={12} /> Published</span>;
      case 'DRAFT':
        return <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800"><Clock size={12} /> Draft</span>;
      case 'ARCHIVED':
        return <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 border border-gray-200 dark:border-zinc-700">Archived</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-200 dark:border-zinc-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="h-7 w-7 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Knowledge Hub</h1>
          </div>
          <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">
            Central repository for organization SOPs, policies, technical documentation, and reusable templates.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={`/${orgSlug}/knowledge/categories`}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors shadow-sm"
          >
            <FolderPlus size={16} /> Manage Categories
          </Link>
          <Link
            href={`/${orgSlug}/knowledge/articles/new`}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Plus size={16} /> Create Article
          </Link>
        </div>
      </div>

      {/* Hero Search Box */}
      <div className="relative rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-purple-500/10 border border-primary/20 p-8 text-center shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Search the Knowledge Base
        </h2>
        <p className="text-sm text-gray-600 dark:text-zinc-400 mb-6 max-w-xl mx-auto">
          Find documentation, procedures, tech specs, or company guidelines instantly.
        </p>
        <form onSubmit={handleSearchSubmit} className="max-w-2xl mx-auto relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search articles by title, keyword, or topic..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-28 py-3.5 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl text-sm shadow-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-gray-900 dark:text-white placeholder-gray-400"
          />
          <button
            type="submit"
            className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 bg-primary text-white rounded-lg text-xs font-semibold hover:bg-primary/90 transition-colors"
          >
            Search
          </button>
        </form>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="p-5 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-zinc-400 uppercase tracking-wider">Total Articles</p>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.totalArticles}</h3>
          </div>
          <div className="p-3 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-xl">
            <FileText size={22} />
          </div>
        </div>

        <div className="p-5 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-zinc-400 uppercase tracking-wider">Published</p>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.publishedArticles}</h3>
          </div>
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-xl">
            <CheckCircle2 size={22} />
          </div>
        </div>

        <div className="p-5 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-zinc-400 uppercase tracking-wider">Drafts</p>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.draftArticles}</h3>
          </div>
          <div className="p-3 bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 rounded-xl">
            <Clock size={22} />
          </div>
        </div>

        <div className="p-5 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-zinc-400 uppercase tracking-wider">Categories</p>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.totalCategories}</h3>
          </div>
          <div className="p-3 bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 rounded-xl">
            <Folders size={22} />
          </div>
        </div>
      </div>

      {/* My Favorites Section */}
      {favorites.length > 0 && (
        <div className="bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 rounded-xl p-5 space-y-3">
          <h2 className="text-base font-bold text-amber-900 dark:text-amber-400 flex items-center gap-2">
            <Star className="fill-amber-400 text-amber-500" size={18} /> My Favorites
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {favorites.map((art) => (
              <div
                key={art.id}
                onClick={() => router.push(`/${orgSlug}/knowledge/articles/${art.id}`)}
                className="p-4 bg-white dark:bg-zinc-900 border border-amber-200/50 dark:border-zinc-800 rounded-lg shadow-sm hover:shadow transition-all cursor-pointer flex flex-col justify-between"
              >
                <div className="space-y-1">
                  {art.category && (
                    <span
                      className="text-[10px] font-semibold px-2 py-0.5 rounded text-white inline-block"
                      style={{ backgroundColor: art.category.color || '#3b82f6' }}
                    >
                      {art.category.name}
                    </span>
                  )}
                  <h3 className="font-semibold text-sm text-gray-900 dark:text-white hover:text-primary transition-colors line-clamp-1">
                    {art.title}
                  </h3>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-gray-500 dark:text-zinc-400">
                  <span>{new Date(art.updatedAt).toLocaleDateString()}</span>
                  <ChevronRight size={14} className="text-amber-500" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Knowledge Categories Grid */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Folders size={18} className="text-primary" /> Documentation Categories
          </h2>
          <Link
            href={`/${orgSlug}/knowledge/categories`}
            className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
          >
            View All <ChevronRight size={14} />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/${orgSlug}/knowledge/articles?categoryId=${cat.id}`}
              className="group p-5 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl shadow-sm hover:shadow-md hover:border-primary/50 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: cat.color || '#3b82f6' }}
                  />
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400">
                    {cat._count?.articles ?? 0} articles
                  </span>
                </div>
                <h3 className="font-semibold text-base text-gray-900 dark:text-white group-hover:text-primary transition-colors">
                  {cat.name}
                </h3>
                <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1 line-clamp-2">
                  {cat.description || 'Category for organization articles and documentation.'}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-gray-100 dark:border-zinc-800/80 flex items-center justify-between text-xs text-primary font-medium group-hover:translate-x-1 transition-transform">
                <span>Browse Category</span>
                <ArrowRight size={14} />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Articles */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <FileText size={18} className="text-primary" /> Recent & Featured Articles
          </h2>
          <Link
            href={`/${orgSlug}/knowledge/articles`}
            className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
          >
            Explore All Articles <ChevronRight size={14} />
          </Link>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl shadow-sm overflow-hidden divide-y divide-gray-100 dark:divide-zinc-800">
          {recentArticles.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-zinc-400">
              No articles created yet. Click "Create Article" to publish your first documentation page.
            </div>
          ) : (
            recentArticles.map((art) => (
              <div
                key={art.id}
                onClick={() => router.push(`/${orgSlug}/knowledge/articles/${art.id}`)}
                className="p-5 hover:bg-gray-50/80 dark:hover:bg-zinc-800/40 transition-colors cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1">
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
                    <p className="text-xs text-gray-500 dark:text-zinc-400 line-clamp-2">
                      {art.summary}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-zinc-400 shrink-0">
                  <div className="flex items-center gap-1">
                    <User size={14} />
                    <span>{art.author ? `${art.author.firstName || ''} ${art.author.lastName || ''}` : 'Author'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar size={14} />
                    <span>{new Date(art.updatedAt).toLocaleDateString()}</span>
                  </div>
                  <ChevronRight size={16} className="text-gray-400" />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
