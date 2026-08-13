'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import {
  BookOpen,
  ChevronRight,
  ArrowLeft,
  Save,
  Clock,
  Globe,
  Users,
  Lock,
  Tag,
  Image as ImageIcon,
  FileText
} from 'lucide-react';

interface Category {
  id: string;
  name: string;
}

export default function EditArticlePage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = params?.orgSlug as string;
  const articleId = params?.id as string;

  const [categories, setCategories] = useState<Category[]>([
    { id: '1', name: 'SOPs & Guidelines' },
    { id: '2', name: 'Internal Policies' },
    { id: '3', name: 'Technical Docs' },
    { id: '4', name: 'Templates' },
  ]);

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [summary, setSummary] = useState('');
  const [content, setContent] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [status, setStatus] = useState('DRAFT');
  const [visibility, setVisibility] = useState('ORGANIZATION');
  const [featuredImageUrl, setFeaturedImageUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const orgRes = await apiFetch(`/organizations/${orgSlug}`).catch(() => null);
        const orgId = orgRes?.id || orgSlug;

        const [catData, artData] = await Promise.all([
          apiFetch(`/organizations/${orgId}/knowledge/categories`).catch(() => null),
          apiFetch(`/organizations/${orgId}/knowledge/articles/${articleId}`).catch(() => null),
        ]);

        if (catData && Array.isArray(catData)) setCategories(catData);

        if (artData && artData.id) {
          setTitle(artData.title || '');
          setSlug(artData.slug || '');
          setSummary(artData.summary || '');
          setContent(artData.content || '');
          setCategoryId(artData.categoryId || '');
          setStatus(artData.status || 'DRAFT');
          setVisibility(artData.visibility || 'ORGANIZATION');
          setFeaturedImageUrl(artData.featuredImageUrl || '');
        }
      } catch (err) {
        console.error('Error fetching article for edit:', err);
      } finally {
        setLoading(false);
      }
    }

    if (articleId) loadData();
  }, [orgSlug, articleId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      alert('Please provide a title and content.');
      return;
    }

    try {
      setSubmitting(true);
      const orgRes = await apiFetch(`/organizations/${orgSlug}`).catch(() => null);
      const orgId = orgRes?.id || orgSlug;

      const updateData = {
        title,
        slug,
        summary,
        content,
        categoryId: categoryId || null,
        status,
        visibility,
        featuredImageUrl: featuredImageUrl || null,
      };

      await apiFetch(`/organizations/${orgId}/knowledge/articles/${articleId}`, {
        method: 'PATCH',
        body: JSON.stringify(updateData),
      });

      router.push(`/${orgSlug}/knowledge/articles/${articleId}`);
    } catch (err: any) {
      console.error('Error updating article:', err);
      alert(err.message || 'Failed to update article');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-200 dark:border-zinc-800 pb-4">
        <div>
          <div className="flex items-center gap-2 text-sm">
            <Link href={`/${orgSlug}/knowledge`} className="text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">
              Knowledge
            </Link>
            <ChevronRight size={14} className="text-gray-400" />
            <Link href={`/${orgSlug}/knowledge/articles`} className="text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">
              Articles
            </Link>
            <ChevronRight size={14} className="text-gray-400" />
            <span className="font-medium text-gray-900 dark:text-white">Edit Article</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white mt-1">
            Edit Article: {title}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/${orgSlug}/knowledge/articles/${articleId}`}
            className="flex items-center gap-1.5 px-4 py-2 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg text-xs font-medium text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors shadow-sm"
          >
            Cancel
          </Link>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-lg text-xs font-semibold hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50"
          >
            <Save size={14} /> {submitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Main Form Box */}
      <form onSubmit={handleSubmit} className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-6 sm:p-8 shadow-sm space-y-6">
        {/* Title */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 uppercase tracking-wider mb-2">
            Article Title *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-3 bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-700 rounded-xl text-base font-semibold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Slug, Category, & Status Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 uppercase tracking-wider mb-2">
              URL Slug
            </label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-700 rounded-lg text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 uppercase tracking-wider mb-2">
              Category
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-700 rounded-lg text-xs font-medium text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">No Category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 uppercase tracking-wider mb-2">
              Article Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-700 rounded-lg text-xs font-medium text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Published</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>
        </div>

        {/* Visibility & Featured Image Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 uppercase tracking-wider mb-2">
              Visibility Scope
            </label>
            <select
              value={visibility}
              onChange={(e) => setVisibility(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-700 rounded-lg text-xs font-medium text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="ORGANIZATION">Organization (Entire company)</option>
              <option value="TEAM">Team (Restricted to team members)</option>
              <option value="PRIVATE">Private (Only author)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 uppercase tracking-wider mb-2">
              Featured Image URL
            </label>
            <input
              type="text"
              placeholder="https://example.com/cover.jpg"
              value={featuredImageUrl}
              onChange={(e) => setFeaturedImageUrl(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-700 rounded-lg text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        {/* Summary */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 uppercase tracking-wider mb-2">
            Summary / Excerpt
          </label>
          <textarea
            rows={2}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            className="w-full px-3 py-2 bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-700 rounded-lg text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          />
        </div>

        {/* Content Body */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 uppercase tracking-wider mb-2">
            Article Content (Rich Text / Markdown) *
          </label>
          <textarea
            rows={14}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full px-4 py-3 bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm font-mono text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </form>
    </div>
  );
}
