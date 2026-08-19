'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import {
  Search, X, Building2, UserCircle, Zap, Target, CalendarCheck,
  FileSignature, ScrollText, FolderKanban, CheckSquare, BookOpen,
  FileText, Users, UsersRound, Clock, ArrowRight, CornerDownLeft, Trash2
} from 'lucide-react';

interface SearchResultItem {
  id: string;
  type: 'company' | 'contact' | 'lead' | 'opportunity' | 'meeting' | 'proposal' | 'contract' | 'project' | 'task' | 'knowledge' | 'document' | 'user' | 'team';
  title: string;
  subtitle?: string;
  description?: string;
  url: string;
  updatedAt?: string;
}

interface RecentSearchItem {
  id: string;
  query: string;
  createdAt: string;
}

const MODULE_TABS = [
  { id: 'all', label: 'All Results' },
  { id: 'crm', label: 'CRM' },
  { id: 'projects', label: 'Projects & Tasks' },
  { id: 'knowledge', label: 'Knowledge Base' },
  { id: 'documents', label: 'Documents' },
  { id: 'people', label: 'People & Teams' },
];

export function CommandPalette({
  isOpen,
  onClose,
  orgSlug
}: {
  isOpen: boolean;
  onClose: () => void;
  orgSlug?: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [recentSearches, setRecentSearches] = useState<RecentSearchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Load Recent Searches on Open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      loadRecentSearches();
    }
  }, [isOpen, orgSlug]);

  async function loadRecentSearches() {
    try {
      const orgRes = await apiFetch(`/organizations/${orgSlug || 'default'}`).catch(() => null);
      const orgId = orgRes?.id || orgSlug || 'default';
      const recent = await apiFetch(`/organizations/${orgId}/search/recent`).catch(() => []);
      if (Array.isArray(recent)) {
        setRecentSearches(recent);
      }
    } catch (e) {
      console.error('Error fetching recent searches:', e);
    }
  }

  // Live Debounced Search Query Execution
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    debounceTimer.current = setTimeout(async () => {
      try {
        const orgRes = await apiFetch(`/organizations/${orgSlug || 'default'}`).catch(() => null);
        const orgId = orgRes?.id || orgSlug || 'default';

        const modulesQuery = activeFilter !== 'all' ? `&modules=${activeFilter}` : '';
        const searchData = await apiFetch(
          `/organizations/${orgId}/search?q=${encodeURIComponent(query.trim())}${modulesQuery}`
        ).catch(() => null);

        if (searchData && Array.isArray(searchData.results)) {
          setResults(searchData.results);
          setSelectedIndex(0);
        } else {
          setResults([]);
        }
      } catch (err) {
        console.error('Error conducting global search:', err);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [query, activeFilter, orgSlug]);

  // Keyboard Shortcuts Navigation: Up, Down, Enter, Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (results.length > 0 ? (prev + 1) % results.length : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (results.length > 0 ? (prev - 1 + results.length) % results.length : 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (results.length > 0 && results[selectedIndex]) {
          navigateTo(results[selectedIndex].url);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex]);

  if (!isOpen) return null;

  const navigateTo = (url: string) => {
    const fullPath = url.startsWith('/') ? `/${orgSlug || 'organization'}${url.startsWith('/' + (orgSlug || 'organization')) ? '' : ''}${url}` : url;
    // Normalize URL
    const targetUrl = url.includes(`/${orgSlug}`) ? url : `/${orgSlug || 'organization'}${url}`;
    router.push(targetUrl);
    onClose();
  };

  const clearRecentSearches = async () => {
    try {
      const orgRes = await apiFetch(`/organizations/${orgSlug || 'default'}`).catch(() => null);
      const orgId = orgRes?.id || orgSlug || 'default';
      await apiFetch(`/organizations/${orgId}/search/recent`, { method: 'DELETE' });
      setRecentSearches([]);
    } catch (e) {
      setRecentSearches([]);
    }
  };

  const getEntityIcon = (type: string) => {
    switch (type) {
      case 'company':
        return <Building2 className="text-blue-500" size={18} />;
      case 'contact':
        return <UserCircle className="text-cyan-500" size={18} />;
      case 'lead':
        return <Zap className="text-amber-500" size={18} />;
      case 'opportunity':
        return <Target className="text-emerald-500" size={18} />;
      case 'meeting':
        return <CalendarCheck className="text-purple-500" size={18} />;
      case 'proposal':
        return <FileSignature className="text-indigo-500" size={18} />;
      case 'contract':
        return <ScrollText className="text-teal-500" size={18} />;
      case 'project':
        return <FolderKanban className="text-rose-500" size={18} />;
      case 'task':
        return <CheckSquare className="text-green-600" size={18} />;
      case 'knowledge':
        return <BookOpen className="text-violet-500" size={18} />;
      case 'document':
        return <FileText className="text-gray-500" size={18} />;
      case 'user':
        return <Users className="text-sky-500" size={18} />;
      case 'team':
        return <UsersRound className="text-orange-500" size={18} />;
      default:
        return <Search className="text-gray-400" size={18} />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Main Command Box */}
      <div className="relative w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white dark:bg-zinc-900 shadow-2xl border border-gray-200 dark:border-zinc-800 transition-all flex flex-col max-h-[80vh]">
        {/* Search Header Bar */}
        <div className="flex items-center border-b border-gray-200 dark:border-zinc-800 px-4 py-3 gap-3 shrink-0">
          <Search className="h-5 w-5 text-primary shrink-0" />
          <input
            autoFocus
            type="text"
            className="w-full bg-transparent border-0 text-base text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-0"
            placeholder="Search companies, projects, tasks, articles, documents..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-white rounded-md"
            >
              <X size={16} />
            </button>
          )}
          <button
            onClick={onClose}
            className="px-2 py-1 bg-gray-100 dark:bg-zinc-800 rounded text-xs text-gray-500 dark:text-zinc-400 font-mono"
          >
            ESC
          </button>
        </div>

        {/* Category Filter Tabs */}
        <div className="flex items-center gap-1.5 px-4 py-2 bg-gray-50/50 dark:bg-zinc-950/40 border-b border-gray-100 dark:border-zinc-800/80 overflow-x-auto scrollbar-hide shrink-0">
          {MODULE_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                activeFilter === tab.id
                  ? 'bg-primary text-white font-semibold'
                  : 'text-gray-600 dark:text-zinc-400 hover:bg-gray-200/60 dark:hover:bg-zinc-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Results Container */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-hide">
          {loading ? (
            <div className="p-8 text-center text-xs text-gray-400">Searching across modules...</div>
          ) : query.trim() ? (
            results.length === 0 ? (
              <div className="p-10 text-center text-sm text-gray-500 dark:text-zinc-400">
                No matching results found for "{query}".
              </div>
            ) : (
              <div className="space-y-1">
                {results.map((item, index) => {
                  const isSelected = index === selectedIndex;
                  return (
                    <div
                      key={`${item.type}-${item.id}`}
                      onClick={() => navigateTo(item.url)}
                      onMouseEnter={() => setSelectedIndex(index)}
                      className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-primary/10 dark:bg-primary/20 border border-primary/30'
                          : 'hover:bg-gray-100/80 dark:hover:bg-zinc-800/60 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="p-2 rounded-lg bg-gray-100 dark:bg-zinc-800 shrink-0">
                          {getEntityIcon(item.type)}
                        </div>
                        <div className="truncate">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                              {item.title}
                            </span>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded uppercase tracking-wider bg-gray-200 dark:bg-zinc-700 text-gray-700 dark:text-zinc-300">
                              {item.type}
                            </span>
                          </div>
                          {item.description && (
                            <p className="text-xs text-gray-500 dark:text-zinc-400 truncate mt-0.5">
                              {item.description}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 text-xs text-gray-400">
                        {isSelected && (
                          <span className="flex items-center gap-1 text-primary text-xs font-medium">
                            Open <CornerDownLeft size={12} />
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            /* Empty Query: Display Recent Searches */
            <div className="p-2 space-y-4">
              <div className="flex items-center justify-between px-2">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock size={14} /> Recent Searches
                </span>
                {recentSearches.length > 0 && (
                  <button
                    onClick={clearRecentSearches}
                    className="text-xs text-gray-400 hover:text-red-500 transition-colors flex items-center gap-1"
                  >
                    <Trash2 size={12} /> Clear
                  </button>
                )}
              </div>

              {recentSearches.length === 0 ? (
                <div className="p-6 text-center text-xs text-gray-400">
                  Type any keyword to search across Companies, Projects, Tasks, Knowledge Base, Documents, and Users.
                </div>
              ) : (
                <div className="flex flex-wrap gap-2 px-1">
                  {recentSearches.map((rec) => (
                    <button
                      key={rec.id}
                      onClick={() => setQuery(rec.query)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 rounded-lg text-xs text-gray-700 dark:text-zinc-300 transition-colors"
                    >
                      <Search size={12} className="text-gray-400" />
                      <span>{rec.query}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Shortcut Legend */}
        <div className="border-t border-gray-100 dark:border-zinc-800 px-4 py-2.5 bg-gray-50 dark:bg-zinc-950/60 flex items-center justify-between text-[11px] text-gray-400 shrink-0">
          <div className="flex items-center gap-3">
            <span><kbd className="px-1.5 py-0.5 rounded bg-gray-200 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300">↑</kbd> <kbd className="px-1.5 py-0.5 rounded bg-gray-200 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300">↓</kbd> Navigate</span>
            <span><kbd className="px-1.5 py-0.5 rounded bg-gray-200 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300">↵</kbd> Select</span>
            <span><kbd className="px-1.5 py-0.5 rounded bg-gray-200 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300">ESC</kbd> Close</span>
          </div>
          <span>Britsync Global Search</span>
        </div>
      </div>
    </div>
  );
}
