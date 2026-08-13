'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import {
  BookOpen,
  ChevronRight,
  Plus,
  Edit,
  Trash2,
  FolderPlus,
  Folders,
  FileText,
  X,
  Save,
  Palette
} from 'lucide-react';

interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  color?: string;
  _count?: { articles: number };
}

export default function CategoryManagementPage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = params?.orgSlug as string;

  const [categories, setCategories] = useState<Category[]>([
    { id: '1', name: 'SOPs & Guidelines', slug: 'sops-guidelines', description: 'Standard Operating Procedures for company workflows', color: '#3b82f6', _count: { articles: 5 } },
    { id: '2', name: 'Internal Policies', slug: 'internal-policies', description: 'HR, Security, and Workplace compliance policies', color: '#10b981', _count: { articles: 3 } },
    { id: '3', name: 'Technical Docs', slug: 'technical-docs', description: 'Architecture, APIs, and Engineering documentation', color: '#8b5cf6', _count: { articles: 4 } },
    { id: '4', name: 'Templates', slug: 'templates', description: 'Reusable document & project templates', color: '#f59e0b', _count: { articles: 2 } },
  ]);

  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#3b82f6');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadCategories() {
      try {
        setLoading(true);
        const orgRes = await apiFetch(`/organizations/${orgSlug}`).catch(() => null);
        const orgId = orgRes?.id || orgSlug;

        const data = await apiFetch(`/organizations/${orgId}/knowledge/categories`).catch(() => null);
        if (data && Array.isArray(data)) {
          setCategories(data);
        }
      } catch (err) {
        console.error('Error fetching categories:', err);
      } finally {
        setLoading(false);
      }
    }

    loadCategories();
  }, [orgSlug]);

  const openCreateModal = () => {
    setEditingCategory(null);
    setName('');
    setSlug('');
    setDescription('');
    setColor('#3b82f6');
    setModalOpen(true);
  };

  const openEditModal = (cat: Category) => {
    setEditingCategory(cat);
    setName(cat.name);
    setSlug(cat.slug);
    setDescription(cat.description || '');
    setColor(cat.color || '#3b82f6');
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setSubmitting(true);
      const orgRes = await apiFetch(`/organizations/${orgSlug}`).catch(() => null);
      const orgId = orgRes?.id || orgSlug;

      if (editingCategory) {
        // Update
        const updated = await apiFetch(`/organizations/${orgId}/knowledge/categories/${editingCategory.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ name, slug, description, color }),
        });

        setCategories(categories.map((c) => (c.id === editingCategory.id ? { ...c, ...updated } : c)));
      } else {
        // Create
        const created = await apiFetch(`/organizations/${orgId}/knowledge/categories`, {
          method: 'POST',
          body: JSON.stringify({ name, slug, description, color }),
        });

        setCategories([...categories, created]);
      }

      setModalOpen(false);
    } catch (err: any) {
      console.error('Error saving category:', err);
      alert(err.message || 'Failed to save category');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, catName: string) => {
    if (!confirm(`Are you sure you want to delete category "${catName}"?`)) return;

    try {
      const orgRes = await apiFetch(`/organizations/${orgSlug}`).catch(() => null);
      const orgId = orgRes?.id || orgSlug;

      await apiFetch(`/organizations/${orgId}/knowledge/categories/${id}`, {
        method: 'DELETE',
      });

      setCategories(categories.filter((c) => c.id !== id));
    } catch (err) {
      console.error('Error deleting category:', err);
      alert('Failed to delete category');
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-200 dark:border-zinc-800 pb-4">
        <div>
          <div className="flex items-center gap-2 text-sm">
            <Link href={`/${orgSlug}/knowledge`} className="text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">
              Knowledge
            </Link>
            <ChevronRight size={14} className="text-gray-400" />
            <span className="font-medium text-gray-900 dark:text-white">Categories</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white mt-1">
            Category Management
          </h1>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm"
        >
          <Plus size={16} /> New Category
        </button>
      </div>

      {/* Category Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {categories.map((cat) => (
          <div
            key={cat.id}
            className="p-5 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span
                    className="w-3.5 h-3.5 rounded-full"
                    style={{ backgroundColor: cat.color || '#3b82f6' }}
                  />
                  <span className="text-xs font-mono text-gray-400">/{cat.slug}</span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditModal(cat)}
                    className="p-1.5 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
                  >
                    <Edit size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(cat.id, cat.name)}
                    className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/40 rounded text-red-500 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <h3 className="font-bold text-base text-gray-900 dark:text-white">
                {cat.name}
              </h3>
              <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1 line-clamp-2">
                {cat.description || 'No description specified for this category.'}
              </p>
            </div>

            <div className="mt-5 pt-3 border-t border-gray-100 dark:border-zinc-800 flex items-center justify-between">
              <span className="text-xs text-gray-500 dark:text-zinc-400 font-medium">
                {cat._count?.articles ?? 0} articles linked
              </span>
              <Link
                href={`/${orgSlug}/knowledge/articles?categoryId=${cat.id}`}
                className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
              >
                View Articles <ChevronRight size={12} />
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* Category Create/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <form
            onSubmit={handleSave}
            className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl max-w-lg w-full p-6 shadow-xl space-y-5"
          >
            <div className="flex justify-between items-center border-b border-gray-100 dark:border-zinc-800 pb-3">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                {editingCategory ? 'Edit Category' : 'Create Category'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 uppercase tracking-wider mb-1.5">
                Category Name *
              </label>
              <input
                type="text"
                placeholder="e.g. Standard Operating Procedures"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (!editingCategory) {
                    setSlug(e.target.value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''));
                  }
                }}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 uppercase tracking-wider mb-1.5">
                URL Slug
              </label>
              <input
                type="text"
                placeholder="e.g. sops-guidelines"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-700 rounded-lg text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 uppercase tracking-wider mb-1.5">
                Badge / Accent Color
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-10 h-10 rounded cursor-pointer border border-gray-200 dark:border-zinc-700"
                />
                <input
                  type="text"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="px-3 py-2 bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-700 rounded-lg text-xs text-gray-900 dark:text-white focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 uppercase tracking-wider mb-1.5">
                Description
              </label>
              <textarea
                rows={3}
                placeholder="Describe what kind of documentation belongs in this category..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-700 rounded-lg text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-gray-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 border border-gray-200 dark:border-zinc-800 rounded-lg text-xs font-medium text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-primary text-white rounded-lg text-xs font-medium hover:bg-primary/90 disabled:opacity-50"
              >
                {submitting ? 'Saving...' : 'Save Category'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
