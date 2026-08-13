'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import {
  BookOpen,
  ChevronRight,
  ArrowLeft,
  Edit,
  Trash2,
  Calendar,
  User,
  Clock,
  CheckCircle2,
  Globe,
  Users,
  Lock,
  Tag,
  Share2,
  FileText,
  Star,
  MessageSquare,
  History,
  Paperclip,
  Activity as ActivityIcon,
  RotateCcw,
  Plus,
  UploadCloud,
  File,
  FileSpreadsheet,
  FileCode,
  Image as ImageIcon,
  Archive,
  Send,
  CornerDownRight
} from 'lucide-react';

interface Category {
  id: string;
  name: string;
  slug: string;
  color?: string;
}

interface Article {
  id: string;
  title: string;
  slug: string;
  summary?: string;
  content: string;
  status: string;
  visibility: string;
  featuredImageUrl?: string;
  isFavorite?: boolean;
  createdAt: string;
  updatedAt: string;
  category?: Category;
  author?: { firstName?: string; lastName?: string; email?: string };
}

interface Revision {
  id: string;
  revisionNum: number;
  title: string;
  content: string;
  summary?: string;
  changeSummary?: string;
  createdAt: string;
  updatedBy?: { firstName?: string; lastName?: string; email?: string };
}

interface CommentItem {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  author?: { id?: string; firstName?: string; lastName?: string; profilePictureUrl?: string; email?: string };
}

interface AttachmentItem {
  id: string;
  name: string;
  originalName: string;
  mimeType: string;
  size: number;
  storagePath: string;
  createdAt: string;
  uploadedBy?: { firstName?: string; lastName?: string };
}

interface ActivityLogItem {
  id: string;
  action: string;
  createdAt: string;
  user?: { firstName?: string; lastName?: string };
  metadata?: any;
}

export default function ArticleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = params?.orgSlug as string;
  const articleId = params?.id as string;

  const [article, setArticle] = useState<Article | null>({
    id: articleId,
    title: 'Engineering Onboarding & System Setup Guide',
    slug: 'engineering-onboarding-guide',
    summary: 'Complete guide for new software engineers joining the engineering department, covering local environment setup, architecture guidelines, and deployment workflows.',
    content: `
# Welcome to BlackDesk Engineering

Congratulations on joining the engineering team! This guide will walk you through setting up your developer environment, acquiring necessary permissions, and understanding our system architecture.

---

## 1. Prerequisites & Access

Before you begin setting up your workstation, make sure you have received invites to the following services:

- **GitHub / GitLab Enterprise**: Access to the core repositories
- **1Password / Vault**: Team credential store
- **Linear / Jira**: Issue tracking and sprint planning
- **Slack / Teams**: Core engineering communication channels

---

## 2. Local Environment Setup

Clone the repository to your local development directory:

\`\`\`bash
git clone https://github.com/blackdesk/blackdesk-os.git
cd blackdesk-os
pnpm install
\`\`\`

### Environment Configuration

Copy the example environment file to generate your local settings:

\`\`\`bash
cp .env.example .env.local
\`\`\`

Ensure your local PostgreSQL / SQLite database URL is configured in \`.env.local\`.

---

## 3. Core Architecture & Standards

Our application is built as an Enterprise Monorepo:

1. **Frontend**: Next.js App Router, Tailwind CSS, shadcn/ui components.
2. **Backend**: NestJS, Prisma ORM, JWT Authentication.
3. **Database**: Relational SQLite / PostgreSQL with Prisma migrations.
    `,
    status: 'PUBLISHED',
    visibility: 'ORGANIZATION',
    isFavorite: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    category: { id: '3', name: 'Technical Docs', slug: 'technical-docs', color: '#8b5cf6' },
    author: { firstName: 'Alex', lastName: 'Morgan', email: 'alex@blackdesk.io' },
  });

  const [activeTab, setActiveTab] = useState<'overview' | 'comments' | 'revisions' | 'attachments' | 'activity'>('overview');
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);

  // Collaboration State
  const [comments, setComments] = useState<CommentItem[]>([
    {
      id: 'c-1',
      content: 'Great guide! Make sure everyone installs pnpm v9 or higher.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      author: { id: 'u-1', firstName: 'Sarah', lastName: 'Connor' },
    },
  ]);
  const [newCommentText, setNewCommentText] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentText, setEditCommentText] = useState('');

  const [revisions, setRevisions] = useState<Revision[]>([
    {
      id: 'rev-2',
      revisionNum: 2,
      title: 'Engineering Onboarding & System Setup Guide',
      content: 'Updated prerequisites with 1Password Vault and pnpm setup guidelines.',
      changeSummary: 'Added pnpm dependency notes and Vault environment setup',
      createdAt: new Date().toISOString(),
      updatedBy: { firstName: 'Alex', lastName: 'Morgan' },
    },
    {
      id: 'rev-1',
      revisionNum: 1,
      title: 'Engineering Onboarding & System Setup Guide',
      content: 'Initial documentation publication.',
      changeSummary: 'Initial article creation',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      updatedBy: { firstName: 'Alex', lastName: 'Morgan' },
    },
  ]);

  const [attachments, setAttachments] = useState<AttachmentItem[]>([
    {
      id: 'att-1',
      name: 'BlackDesk_Architecture_Diagram.pdf',
      originalName: 'BlackDesk_Architecture_Diagram.pdf',
      mimeType: 'application/pdf',
      size: 1450000,
      storagePath: 'diagram.pdf',
      createdAt: new Date().toISOString(),
      uploadedBy: { firstName: 'Alex', lastName: 'Morgan' },
    },
  ]);

  const [activities, setActivities] = useState<ActivityLogItem[]>([
    {
      id: 'act-1',
      action: 'KNOWLEDGE_ARTICLE_UPDATED',
      createdAt: new Date().toISOString(),
      user: { firstName: 'Alex', lastName: 'Morgan' },
      metadata: { revisionNum: 2 },
    },
    {
      id: 'act-2',
      action: 'KNOWLEDGE_ARTICLE_CREATED',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      user: { firstName: 'Alex', lastName: 'Morgan' },
    },
  ]);

  const [uploading, setUploading] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [restoringRevId, setRestoringRevId] = useState<string | null>(null);

  useEffect(() => {
    async function loadAllData() {
      try {
        setLoading(true);
        const orgRes = await apiFetch(`/organizations/${orgSlug}`).catch(() => null);
        const orgId = orgRes?.id || orgSlug;

        const [artData, comData, revData, attData] = await Promise.all([
          apiFetch(`/organizations/${orgId}/knowledge/articles/${articleId}`).catch(() => null),
          apiFetch(`/organizations/${orgId}/knowledge/articles/${articleId}/comments`).catch(() => null),
          apiFetch(`/organizations/${orgId}/knowledge/articles/${articleId}/revisions`).catch(() => null),
          apiFetch(`/organizations/${orgId}/knowledge/articles/${articleId}/attachments`).catch(() => null),
        ]);

        if (artData && artData.id) {
          setArticle(artData);
          setIsFavorite(!!artData.isFavorite);
        }
        if (comData && Array.isArray(comData)) setComments(comData);
        if (revData && Array.isArray(revData)) setRevisions(revData);
        if (attData && Array.isArray(attData)) setAttachments(attData);
      } catch (err) {
        console.error('Error fetching article detail data:', err);
      } finally {
        setLoading(false);
      }
    }

    if (articleId) loadAllData();
  }, [orgSlug, articleId]);

  // Favorite Toggle
  const handleToggleFavorite = async () => {
    try {
      const orgRes = await apiFetch(`/organizations/${orgSlug}`).catch(() => null);
      const orgId = orgRes?.id || orgSlug;

      if (isFavorite) {
        await apiFetch(`/organizations/${orgId}/knowledge/articles/${articleId}/favorite`, { method: 'DELETE' });
        setIsFavorite(false);
      } else {
        await apiFetch(`/organizations/${orgId}/knowledge/articles/${articleId}/favorite`, { method: 'POST' });
        setIsFavorite(true);
      }
    } catch (err) {
      console.error('Error toggling favorite:', err);
    }
  };

  // Add Comment
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;

    try {
      const orgRes = await apiFetch(`/organizations/${orgSlug}`).catch(() => null);
      const orgId = orgRes?.id || orgSlug;

      const created = await apiFetch(`/organizations/${orgId}/knowledge/articles/${articleId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ content: newCommentText }),
      });

      setComments([...comments, created]);
      setNewCommentText('');
    } catch (err: any) {
      console.error('Error posting comment:', err);
      alert('Failed to post comment');
    }
  };

  // Edit Comment
  const handleUpdateComment = async (commentId: string) => {
    if (!editCommentText.trim()) return;

    try {
      const orgRes = await apiFetch(`/organizations/${orgSlug}`).catch(() => null);
      const orgId = orgRes?.id || orgSlug;

      const updated = await apiFetch(`/organizations/${orgId}/knowledge/comments/${commentId}`, {
        method: 'PATCH',
        body: JSON.stringify({ content: editCommentText }),
      });

      setComments(comments.map((c) => (c.id === commentId ? updated : c)));
      setEditingCommentId(null);
    } catch (err) {
      console.error('Error editing comment:', err);
      alert('Failed to edit comment');
    }
  };

  // Delete Comment
  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Are you sure you want to delete this comment?')) return;

    try {
      const orgRes = await apiFetch(`/organizations/${orgSlug}`).catch(() => null);
      const orgId = orgRes?.id || orgSlug;

      await apiFetch(`/organizations/${orgId}/knowledge/comments/${commentId}`, {
        method: 'DELETE',
      });

      setComments(comments.filter((c) => c.id !== commentId));
    } catch (err) {
      console.error('Error deleting comment:', err);
      alert('Failed to delete comment');
    }
  };

  // Restore Revision
  const handleRestoreRevision = async (revId: string) => {
    if (!confirm('Are you sure you want to restore this revision snapshot?')) return;

    try {
      setRestoringRevId(revId);
      const orgRes = await apiFetch(`/organizations/${orgSlug}`).catch(() => null);
      const orgId = orgRes?.id || orgSlug;

      const updatedArticle = await apiFetch(`/organizations/${orgId}/knowledge/articles/${articleId}/revisions/${revId}/restore`, {
        method: 'POST',
      });

      if (updatedArticle) setArticle(updatedArticle);

      // Refresh revisions list
      const freshRevs = await apiFetch(`/organizations/${orgId}/knowledge/articles/${articleId}/revisions`).catch(() => null);
      if (freshRevs && Array.isArray(freshRevs)) setRevisions(freshRevs);

      setActiveTab('overview');
    } catch (err) {
      console.error('Error restoring revision:', err);
      alert('Failed to restore revision');
    } finally {
      setRestoringRevId(null);
    }
  };

  // Upload Attachment
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const orgRes = await apiFetch(`/organizations/${orgSlug}`).catch(() => null);
      const orgId = orgRes?.id || orgSlug;

      const formData = new FormData();
      formData.append('file', file);

      const apiBase = process.env.NEXT_PUBLIC_API_URL || (typeof window !== 'undefined' ? '/api-proxy' : 'http://127.0.0.1:3001');
      const response = await fetch(`${apiBase}/organizations/${orgId}/knowledge/articles/${articleId}/attachments`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (response.ok) {
        const newAtt = await response.json();
        setAttachments([newAtt, ...attachments]);
      } else {
        alert('Failed to upload attachment');
      }
    } catch (err) {
      console.error('Error uploading attachment:', err);
      alert('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  // Delete Attachment
  const handleDeleteAttachment = async (attachmentId: string) => {
    if (!confirm('Are you sure you want to delete this attachment?')) return;

    try {
      const orgRes = await apiFetch(`/organizations/${orgSlug}`).catch(() => null);
      const orgId = orgRes?.id || orgSlug;

      await apiFetch(`/organizations/${orgId}/knowledge/attachments/${attachmentId}`, { method: 'DELETE' });
      setAttachments(attachments.filter((a) => a.id !== attachmentId));
    } catch (err) {
      console.error('Error deleting attachment:', err);
    }
  };

  // Article Delete
  const handleDeleteArticle = async () => {
    try {
      setDeleting(true);
      const orgRes = await apiFetch(`/organizations/${orgSlug}`).catch(() => null);
      const orgId = orgRes?.id || orgSlug;

      await apiFetch(`/organizations/${orgId}/knowledge/articles/${articleId}`, { method: 'DELETE' });
      router.push(`/${orgSlug}/knowledge/articles`);
    } catch (err) {
      console.error('Error deleting article:', err);
      alert('Failed to delete article');
    } finally {
      setDeleting(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileIcon = (mime: string) => {
    if (mime.includes('pdf')) return <FileText className="text-red-500" size={20} />;
    if (mime.includes('image')) return <ImageIcon className="text-blue-500" size={20} />;
    if (mime.includes('sheet') || mime.includes('excel')) return <FileSpreadsheet className="text-emerald-500" size={20} />;
    if (mime.includes('zip') || mime.includes('compressed')) return <Archive className="text-amber-500" size={20} />;
    return <File className="text-gray-500" size={20} />;
  };

  const getVisibilityBadge = (vis?: string) => {
    switch (vis) {
      case 'PRIVATE':
        return <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 font-medium"><Lock size={12} /> Private</span>;
      case 'TEAM':
        return <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-medium"><Users size={12} /> Team</span>;
      case 'ORGANIZATION':
      default:
        return <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 font-medium"><Globe size={12} /> Organization</span>;
    }
  };

  const getStatusBadge = (status?: string) => {
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

  if (!article) {
    return (
      <div className="p-12 text-center text-gray-500 dark:text-zinc-400">
        Article not found or has been deleted.
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Top Bar Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 dark:border-zinc-800 pb-4">
        <div className="flex items-center gap-2 text-sm">
          <Link href={`/${orgSlug}/knowledge`} className="text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">
            Knowledge
          </Link>
          <ChevronRight size={14} className="text-gray-400" />
          <Link href={`/${orgSlug}/knowledge/articles`} className="text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">
            Articles
          </Link>
          <ChevronRight size={14} className="text-gray-400" />
          <span className="font-medium text-gray-900 dark:text-white truncate max-w-xs">{article.title}</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Favorite Toggle Button */}
          <button
            onClick={handleToggleFavorite}
            className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-xs font-medium transition-colors shadow-sm ${
              isFavorite
                ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 text-amber-600 dark:text-amber-400'
                : 'bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800 text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800'
            }`}
          >
            <Star size={14} className={isFavorite ? 'fill-amber-400 text-amber-500' : ''} />
            <span>{isFavorite ? 'Favorited' : 'Favorite'}</span>
          </button>

          <Link
            href={`/${orgSlug}/knowledge/articles/${article.id}/edit`}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg text-xs font-medium text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors shadow-sm"
          >
            <Edit size={14} /> Edit
          </Link>
          <button
            onClick={() => setDeleteModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
          >
            <Trash2 size={14} /> Delete
          </button>
        </div>
      </div>

      {/* Article Title & Metadata Banner */}
      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-6 sm:p-8 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          {article.category && (
            <span
              className="text-xs font-semibold px-3 py-1 rounded text-white"
              style={{ backgroundColor: article.category.color || '#3b82f6' }}
            >
              {article.category.name}
            </span>
          )}
          {getStatusBadge(article.status)}
          {getVisibilityBadge(article.visibility)}
        </div>

        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white leading-tight">
          {article.title}
        </h1>

        <div className="flex flex-wrap items-center gap-6 pt-3 border-t border-gray-100 dark:border-zinc-800 text-xs text-gray-500 dark:text-zinc-400">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs">
              {article.author?.firstName ? article.author.firstName[0] : 'A'}
            </div>
            <span className="font-medium text-gray-700 dark:text-zinc-300">
              {article.author ? `${article.author.firstName || ''} ${article.author.lastName || ''}` : 'Author'}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <Calendar size={14} />
            <span>Updated {new Date(article.updatedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
          </div>
        </div>

        {article.summary && (
          <div className="p-4 bg-gray-50 dark:bg-zinc-800/60 border-l-4 border-primary rounded-r-lg text-sm text-gray-700 dark:text-zinc-300 italic">
            {article.summary}
          </div>
        )}
      </div>

      {/* Collaboration Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 dark:border-zinc-800 overflow-x-auto scrollbar-hide">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'overview'
              ? 'border-primary text-primary'
              : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <BookOpen size={15} /> Overview
        </button>

        <button
          onClick={() => setActiveTab('comments')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'comments'
              ? 'border-primary text-primary'
              : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <MessageSquare size={15} /> Comments ({comments.length})
        </button>

        <button
          onClick={() => setActiveTab('revisions')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'revisions'
              ? 'border-primary text-primary'
              : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <History size={15} /> Revision History ({revisions.length})
        </button>

        <button
          onClick={() => setActiveTab('attachments')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'attachments'
              ? 'border-primary text-primary'
              : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <Paperclip size={15} /> Attachments ({attachments.length})
        </button>

        <button
          onClick={() => setActiveTab('activity')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'activity'
              ? 'border-primary text-primary'
              : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <ActivityIcon size={15} /> Activity
        </button>
      </div>

      {/* TAB CONTENT AREAS */}

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-6 sm:p-10 shadow-sm space-y-6">
          {article.featuredImageUrl && (
            <div className="rounded-xl overflow-hidden mb-6 border border-gray-200 dark:border-zinc-800">
              <img src={article.featuredImageUrl} alt={article.title} className="w-full h-64 sm:h-80 object-cover" />
            </div>
          )}
          <article className="prose dark:prose-invert max-w-none text-gray-800 dark:text-zinc-200 text-sm leading-relaxed whitespace-pre-line">
            {article.content}
          </article>
        </div>
      )}

      {/* TAB 2: COMMENTS */}
      {activeTab === 'comments' && (
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-6 sm:p-8 shadow-sm space-y-6">
          <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <MessageSquare size={18} className="text-primary" /> Article Discussions ({comments.length})
          </h2>

          {/* New Comment Input Box */}
          <form onSubmit={handleAddComment} className="space-y-3 bg-gray-50 dark:bg-zinc-800/40 p-4 rounded-xl border border-gray-200 dark:border-zinc-800">
            <textarea
              rows={3}
              placeholder="Add a comment or mention team members using @user..."
              value={newCommentText}
              onChange={(e) => setNewCommentText(e.target.value)}
              className="w-full p-3 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
            <div className="flex justify-between items-center">
              <span className="text-[11px] text-gray-400">Supports markdown and mentions</span>
              <button
                type="submit"
                disabled={!newCommentText.trim()}
                className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-lg text-xs font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                <Send size={14} /> Post Comment
              </button>
            </div>
          </form>

          {/* Comments List */}
          <div className="space-y-4 divide-y divide-gray-100 dark:divide-zinc-800">
            {comments.length === 0 ? (
              <p className="text-center py-8 text-xs text-gray-500 dark:text-zinc-400">
                No comments yet. Start the discussion above!
              </p>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className="pt-4 first:pt-0 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs">
                        {comment.author?.firstName ? comment.author.firstName[0] : 'U'}
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-gray-900 dark:text-white">
                          {comment.author ? `${comment.author.firstName || ''} ${comment.author.lastName || ''}` : 'Team Member'}
                        </span>
                        <span className="text-[11px] text-gray-400 ml-2">
                          {new Date(comment.createdAt).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      <button
                        onClick={() => { setEditingCommentId(comment.id); setEditCommentText(comment.content); }}
                        className="text-gray-400 hover:text-gray-700 dark:hover:text-zinc-200"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteComment(comment.id)}
                        className="text-red-400 hover:text-red-600"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {editingCommentId === comment.id ? (
                    <div className="space-y-2 pl-9">
                      <textarea
                        rows={2}
                        value={editCommentText}
                        onChange={(e) => setEditCommentText(e.target.value)}
                        className="w-full p-2.5 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg text-xs text-gray-900 dark:text-white focus:outline-none"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleUpdateComment(comment.id)}
                          className="px-3 py-1 bg-primary text-white rounded text-xs font-medium"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingCommentId(null)}
                          className="px-3 py-1 bg-gray-200 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 rounded text-xs"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-700 dark:text-zinc-300 pl-9 leading-relaxed">
                      {comment.content}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 3: REVISION HISTORY */}
      {activeTab === 'revisions' && (
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-6 sm:p-8 shadow-sm space-y-6">
          <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <History size={18} className="text-primary" /> Article Revision History
          </h2>

          <div className="space-y-4 relative border-l-2 border-gray-200 dark:border-zinc-800 ml-4 pl-6">
            {revisions.map((rev, index) => (
              <div key={rev.id} className="relative group">
                <div className="absolute -left-[31px] top-1.5 w-3.5 h-3.5 rounded-full bg-primary border-2 border-white dark:border-zinc-900" />
                <div className="p-4 bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-800 rounded-xl space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-primary/10 text-primary">
                        Revision #{rev.revisionNum}
                      </span>
                      {index === 0 && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-700">
                          Current Version
                        </span>
                      )}
                    </div>

                    {index !== 0 && (
                      <button
                        onClick={() => handleRestoreRevision(rev.id)}
                        disabled={restoringRevId === rev.id}
                        className="flex items-center gap-1 px-3 py-1 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-lg text-xs font-medium text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors shadow-sm disabled:opacity-50"
                      >
                        <RotateCcw size={13} /> {restoringRevId === rev.id ? 'Restoring...' : 'Restore Revision'}
                      </button>
                    )}
                  </div>

                  <p className="text-xs font-medium text-gray-800 dark:text-zinc-200">
                    {rev.changeSummary || 'Article snapshot updated'}
                  </p>

                  <div className="flex items-center gap-4 text-[11px] text-gray-400 pt-1">
                    <span>By {rev.updatedBy ? `${rev.updatedBy.firstName || ''} ${rev.updatedBy.lastName || ''}` : 'User'}</span>
                    <span>{new Date(rev.createdAt).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: ATTACHMENTS */}
      {activeTab === 'attachments' && (
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-100 dark:border-zinc-800 pb-4">
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Paperclip size={18} className="text-primary" /> Article Attachments ({attachments.length})
              </h2>
              <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                Upload PDFs, Word docs, spreadsheets, diagrams, or ZIP files linked to this article.
              </p>
            </div>

            <label className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-xs font-semibold hover:bg-primary/90 transition-colors cursor-pointer shadow-sm">
              <UploadCloud size={16} /> {uploading ? 'Uploading...' : 'Upload Attachment'}
              <input
                type="file"
                className="hidden"
                onChange={handleFileUpload}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.zip"
                disabled={uploading}
              />
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {attachments.length === 0 ? (
              <div className="col-span-2 p-8 text-center text-xs text-gray-500 dark:text-zinc-400 border border-dashed border-gray-200 dark:border-zinc-800 rounded-xl">
                No attachments uploaded yet. Use the upload button above to add supporting files.
              </div>
            ) : (
              attachments.map((att) => (
                <div
                  key={att.id}
                  className="p-4 bg-gray-50 dark:bg-zinc-800/40 border border-gray-200 dark:border-zinc-800 rounded-xl flex items-center justify-between gap-3 hover:border-primary/50 transition-all"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    {getFileIcon(att.mimeType)}
                    <div className="truncate">
                      <div className="text-xs font-semibold text-gray-900 dark:text-white truncate">{att.originalName}</div>
                      <div className="text-[11px] text-gray-400">{formatFileSize(att.size)} • {new Date(att.createdAt).toLocaleDateString()}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleDeleteAttachment(att.id)}
                      className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/40 rounded text-red-500 transition-colors"
                      title="Delete Attachment"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 5: ACTIVITY */}
      {activeTab === 'activity' && (
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-6 sm:p-8 shadow-sm space-y-6">
          <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <ActivityIcon size={18} className="text-primary" /> Article Activity Stream
          </h2>

          <div className="space-y-4">
            {activities.map((act) => (
              <div key={act.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-zinc-800/40 rounded-lg text-xs">
                <ActivityIcon size={16} className="text-primary shrink-0" />
                <div className="flex-1">
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {act.user ? `${act.user.firstName || ''} ${act.user.lastName || ''}` : 'System User'}
                  </span>{' '}
                  <span className="text-gray-600 dark:text-zinc-400">
                    performed <code className="text-primary bg-primary/10 px-1 py-0.5 rounded">{act.action}</code>
                  </span>
                </div>
                <span className="text-gray-400 text-[11px]">{new Date(act.createdAt).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Delete Article Confirmation Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl max-w-md w-full p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Delete Article?</h3>
            <p className="text-xs text-gray-500 dark:text-zinc-400">
              Are you sure you want to soft-delete "{article.title}"?
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setDeleteModalOpen(false)}
                className="px-4 py-2 border border-gray-200 dark:border-zinc-800 rounded-lg text-xs font-medium text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteArticle}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete Article'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
