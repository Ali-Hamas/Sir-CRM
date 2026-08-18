'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { useNotifications } from '@/providers/socket-provider';
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  Settings,
  RefreshCw,
  Search,
  CheckCircle2,
  ExternalLink,
  Sliders,
  Mail,
  Smartphone,
  Layers,
  Briefcase,
  Sparkles,
  Calendar,
  Shield,
  Save,
  AlertCircle,
  Clock,
  Filter,
} from 'lucide-react';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  category: string;
  priority?: string;
  linkUrl?: string;
  isRead: boolean;
  createdAt: string;
}

interface PreferencesState {
  emailEnabled: boolean;
  pushEnabled: boolean;
  inAppEnabled: boolean;
  categories: {
    TASKS: boolean;
    PROJECTS: boolean;
    CRM: boolean;
    MEETINGS: boolean;
    SYSTEM: boolean;
    SECURITY: boolean;
  };
}

const DEFAULT_PREFERENCES: PreferencesState = {
  emailEnabled: true,
  pushEnabled: true,
  inAppEnabled: true,
  categories: {
    TASKS: true,
    PROJECTS: true,
    CRM: true,
    MEETINGS: true,
    SYSTEM: true,
    SECURITY: true,
  },
};

function getCategoryIcon(category: string) {
  switch (category?.toUpperCase()) {
    case 'TASKS':
    case 'TASK':
      return <Layers size={16} className="text-blue-500" />;
    case 'PROJECTS':
    case 'PROJECT':
      return <Briefcase size={16} className="text-purple-500" />;
    case 'CRM':
    case 'LEAD':
    case 'DEAL':
      return <Sparkles size={16} className="text-emerald-500" />;
    case 'MEETINGS':
    case 'MEETING':
      return <Calendar size={16} className="text-amber-500" />;
    case 'SECURITY':
    case 'AUTH':
      return <Shield size={16} className="text-rose-500" />;
    default:
      return <Bell size={16} className="text-primary" />;
  }
}

function formatRelativeTime(dateString: string): string {
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return 'Recently';
    return d.toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return 'Recently';
  }
}

export default function NotificationsPage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = (params?.orgSlug as string) || '';

  const { fetchNotifications: refreshGlobalNotifications } = useNotifications();

  const [activeTab, setActiveTab] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Notification Preferences State
  const [preferences, setPreferences] = useState<PreferencesState>(DEFAULT_PREFERENCES);
  const [savingPrefs, setSavingPrefs] = useState<boolean>(false);
  const [prefsSuccessMsg, setPrefsSuccessMsg] = useState<string | null>(null);

  const fetchNotificationList = useCallback(async () => {
    if (!orgSlug) return;
    setLoading(true);
    setError(null);

    try {
      let endpoint = `/organizations/${orgSlug}/notifications?limit=100`;
      if (activeTab === 'UNREAD') {
        endpoint += `&isRead=false`;
      } else if (activeTab !== 'ALL' && activeTab !== 'PREFERENCES') {
        endpoint += `&category=${activeTab}`;
      }

      if (searchQuery.trim()) {
        endpoint += `&search=${encodeURIComponent(searchQuery.trim())}`;
      }

      const res = await apiFetch(endpoint);
      if (res && Array.isArray(res.items)) {
        setNotifications(res.items);
      } else {
        setNotifications([]);
      }
    } catch (err: any) {
      console.error('Failed to load notifications:', err);
      setError(err.message || 'Failed to load notifications from server');
    } finally {
      setLoading(false);
    }
  }, [orgSlug, activeTab, searchQuery]);

  const loadPreferences = useCallback(async () => {
    if (!orgSlug) return;
    try {
      const data = await apiFetch(`/organizations/${orgSlug}/notifications/preferences`);
      if (data) {
        let parsedCategories = DEFAULT_PREFERENCES.categories;
        if (data.categories) {
          try {
            parsedCategories =
              typeof data.categories === 'string' ? JSON.parse(data.categories) : data.categories;
          } catch {
            parsedCategories = DEFAULT_PREFERENCES.categories;
          }
        }
        setPreferences({
          emailEnabled: data.emailEnabled ?? true,
          pushEnabled: data.pushEnabled ?? true,
          inAppEnabled: data.inAppEnabled ?? true,
          categories: {
            ...DEFAULT_PREFERENCES.categories,
            ...parsedCategories,
          },
        });
      }
    } catch (err) {
      console.warn('Failed to load preferences:', err);
    }
  }, [orgSlug]);

  useEffect(() => {
    if (activeTab === 'PREFERENCES') {
      loadPreferences();
    } else {
      fetchNotificationList();
    }
  }, [activeTab, fetchNotificationList, loadPreferences]);

  const handleMarkAllRead = async () => {
    try {
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      await apiFetch(`/organizations/${orgSlug}/notifications/mark-all-read`, { method: 'PATCH' });
      refreshGlobalNotifications();
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const handleToggleRead = async (item: NotificationItem) => {
    const nextReadState = !item.isRead;
    setNotifications((prev) =>
      prev.map((n) => (n.id === item.id ? { ...n, isRead: nextReadState } : n))
    );

    try {
      await apiFetch(`/organizations/${orgSlug}/notifications/${item.id}/read`, { method: 'PATCH' });
      refreshGlobalNotifications();
    } catch (err) {
      console.error('Failed to update read state:', err);
    }
  };

  const handleDelete = async (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    try {
      await apiFetch(`/organizations/${orgSlug}/notifications/${id}`, { method: 'DELETE' });
      refreshGlobalNotifications();
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  };

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPrefs(true);
    setPrefsSuccessMsg(null);

    try {
      await apiFetch(`/organizations/${orgSlug}/notifications/preferences`, {
        method: 'PATCH',
        body: JSON.stringify({
          emailEnabled: preferences.emailEnabled,
          pushEnabled: preferences.pushEnabled,
          inAppEnabled: preferences.inAppEnabled,
          categories: preferences.categories,
        }),
      });
      setPrefsSuccessMsg('Notification preferences saved successfully.');
      setTimeout(() => setPrefsSuccessMsg(null), 4000);
    } catch (err: any) {
      console.error('Failed to save preferences:', err);
      alert(`Error saving preferences: ${err.message}`);
    } finally {
      setSavingPrefs(false);
    }
  };

  const unreadTotal = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-gray-900 dark:text-white flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Bell size={18} />
            </div>
            Notification Center
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {unreadTotal > 0
              ? `You have ${unreadTotal} unread notification${unreadTotal === 1 ? '' : 's'} across your workspace.`
              : 'All notifications are up to date.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab !== 'PREFERENCES' && (
            <>
              <button
                onClick={fetchNotificationList}
                disabled={loading}
                className="p-2 border border-gray-200 dark:border-zinc-800 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50 text-gray-700 dark:text-zinc-300"
                title="Refresh notifications"
              >
                <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
              </button>

              <button
                onClick={handleMarkAllRead}
                disabled={notifications.length === 0 || unreadTotal === 0}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
              >
                <CheckCheck size={14} />
                <span>Mark all as read</span>
              </button>
            </>
          )}

          <button
            onClick={() => setActiveTab(activeTab === 'PREFERENCES' ? 'ALL' : 'PREFERENCES')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
              activeTab === 'PREFERENCES'
                ? 'bg-primary text-white border-primary shadow-sm'
                : 'bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800 text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800'
            }`}
          >
            <Sliders size={14} />
            <span>Preferences</span>
          </button>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-zinc-800 overflow-x-auto pb-1 scrollbar-thin">
        {[
          { key: 'ALL', label: 'All Notifications' },
          { key: 'UNREAD', label: `Unread ${unreadTotal > 0 ? `(${unreadTotal})` : ''}` },
          { key: 'TASKS', label: 'Tasks' },
          { key: 'PROJECTS', label: 'Projects' },
          { key: 'CRM', label: 'CRM' },
          { key: 'MEETINGS', label: 'Meetings' },
          { key: 'SYSTEM', label: 'System' },
          { key: 'PREFERENCES', label: 'Settings & Channels' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`pb-2.5 px-2 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
              activeTab === tab.key
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Preferences Tab View */}
      {activeTab === 'PREFERENCES' ? (
        <form onSubmit={handleSavePreferences} className="space-y-6 animate-fade-in">
          {prefsSuccessMsg && (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 size={16} />
              {prefsSuccessMsg}
            </div>
          )}

          {/* Delivery Channels Card */}
          <div className="glass-card-premium p-6 rounded-2xl border border-gray-200 dark:border-zinc-800 space-y-5 bg-white dark:bg-zinc-900 shadow-sm">
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Bell size={16} className="text-primary" />
                Notification Delivery Channels
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Choose how and where you want to receive system updates.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              {/* In-App Notifications */}
              <div className="p-4 rounded-xl border border-gray-200/80 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-950/40 flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Bell size={16} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-900 dark:text-white">In-App Alerts</h4>
                    <p className="text-[11px] text-gray-500 dark:text-zinc-400 mt-0.5">
                      Top bar bell & real-time popup toasts.
                    </p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.inAppEnabled}
                  onChange={(e) =>
                    setPreferences({ ...preferences, inAppEnabled: e.target.checked })
                  }
                  className="w-4 h-4 accent-primary rounded cursor-pointer mt-1"
                />
              </div>

              {/* Email Notifications */}
              <div className="p-4 rounded-xl border border-gray-200/80 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-950/40 flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                    <Mail size={16} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-900 dark:text-white">Email Digest</h4>
                    <p className="text-[11px] text-gray-500 dark:text-zinc-400 mt-0.5">
                      Send important updates to your email.
                    </p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.emailEnabled}
                  onChange={(e) =>
                    setPreferences({ ...preferences, emailEnabled: e.target.checked })
                  }
                  className="w-4 h-4 accent-primary rounded cursor-pointer mt-1"
                />
              </div>

              {/* Push Notifications */}
              <div className="p-4 rounded-xl border border-gray-200/80 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-950/40 flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0">
                    <Smartphone size={16} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-900 dark:text-white">Browser Push</h4>
                    <p className="text-[11px] text-gray-500 dark:text-zinc-400 mt-0.5">
                      Instant browser notifications.
                    </p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.pushEnabled}
                  onChange={(e) =>
                    setPreferences({ ...preferences, pushEnabled: e.target.checked })
                  }
                  className="w-4 h-4 accent-primary rounded cursor-pointer mt-1"
                />
              </div>
            </div>
          </div>

          {/* Categories Card */}
          <div className="glass-card-premium p-6 rounded-2xl border border-gray-200 dark:border-zinc-800 space-y-5 bg-white dark:bg-zinc-900 shadow-sm">
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Sliders size={16} className="text-primary" />
                Category Preferences
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Enable or disable notifications for specific operational modules.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {[
                {
                  key: 'TASKS' as const,
                  title: 'Tasks & Assignments',
                  desc: 'When tasks are assigned, updated, or status changes.',
                  icon: <Layers size={15} className="text-blue-500" />,
                },
                {
                  key: 'PROJECTS' as const,
                  title: 'Projects & Milestones',
                  desc: 'Project creation, member assignments, milestone achievements.',
                  icon: <Briefcase size={15} className="text-purple-500" />,
                },
                {
                  key: 'CRM' as const,
                  title: 'CRM & Pipeline',
                  desc: 'Lead assignments, deal progression, new client notes.',
                  icon: <Sparkles size={15} className="text-emerald-500" />,
                },
                {
                  key: 'MEETINGS' as const,
                  title: 'Meetings & Calendars',
                  desc: 'Meeting invites, agenda updates, and action item deadlines.',
                  icon: <Calendar size={15} className="text-amber-500" />,
                },
                {
                  key: 'SYSTEM' as const,
                  title: 'System & Workflows',
                  desc: 'Automated workflow executions and background processes.',
                  icon: <Bell size={15} className="text-cyan-500" />,
                },
                {
                  key: 'SECURITY' as const,
                  title: 'Security & Access',
                  desc: 'Role changes, invitations, login alerts, and permissions.',
                  icon: <Shield size={15} className="text-rose-500" />,
                },
              ].map((cat) => (
                <label
                  key={cat.key}
                  className="flex items-start justify-between p-3.5 rounded-xl border border-gray-200/80 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-950/40 hover:bg-gray-100/60 dark:hover:bg-zinc-800/40 transition-colors cursor-pointer"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">{cat.icon}</div>
                    <div>
                      <span className="text-xs font-bold text-gray-900 dark:text-white block">
                        {cat.title}
                      </span>
                      <span className="text-[11px] text-gray-500 dark:text-zinc-400 mt-0.5 block">
                        {cat.desc}
                      </span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.categories[cat.key] ?? true}
                    onChange={(e) =>
                      setPreferences({
                        ...preferences,
                        categories: {
                          ...preferences.categories,
                          [cat.key]: e.target.checked,
                        },
                      })
                    }
                    className="w-4 h-4 accent-primary rounded cursor-pointer mt-1"
                  />
                </label>
              ))}
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                disabled={savingPrefs}
                className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 shadow-md shadow-primary/20"
              >
                <Save size={15} />
                <span>{savingPrefs ? 'Saving...' : 'Save Preferences'}</span>
              </button>
            </div>
          </div>
        </form>
      ) : (
        /* Notifications List View */
        <div className="space-y-4">
          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <input
                type="text"
                placeholder="Search notifications..."
                className="w-full pl-9 pr-4 py-2 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="text-xs text-gray-500 dark:text-zinc-400 ml-auto font-medium">
              Showing {notifications.length} notification{notifications.length === 1 ? '' : 's'}
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Notifications Card Container */}
          <div className="glass-card-premium overflow-hidden rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 divide-y divide-gray-100 dark:divide-zinc-800 shadow-sm">
            {loading ? (
              <div className="py-20 text-center space-y-3">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs text-gray-400 font-medium">Loading notifications from server...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-16 text-center text-gray-500 dark:text-zinc-400 space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-zinc-800 flex items-center justify-center mx-auto text-gray-400 dark:text-zinc-500 mb-3">
                  <CheckCircle2 size={24} />
                </div>
                <p className="font-bold text-sm text-gray-900 dark:text-white">
                  No notifications match your view
                </p>
                <p className="text-xs text-gray-400 max-w-sm mx-auto">
                  {searchQuery
                    ? `No notifications found matching "${searchQuery}".`
                    : 'You are completely up to date. New updates will appear here automatically.'}
                </p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`p-4 flex items-start gap-4 transition-colors group ${
                    !notif.isRead
                      ? 'bg-primary/4 dark:bg-primary/8 hover:bg-primary/8 dark:hover:bg-primary/12'
                      : 'hover:bg-gray-50/80 dark:hover:bg-zinc-800/50'
                  }`}
                >
                  {/* Category icon */}
                  <div className="mt-0.5 flex-shrink-0 w-9 h-9 rounded-xl bg-white dark:bg-zinc-800 flex items-center justify-center border border-gray-200/80 dark:border-zinc-700 shadow-2xs">
                    {getCategoryIcon(notif.category)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <div className="flex items-center gap-2">
                        <h4
                          className={`text-xs font-bold ${
                            !notif.isRead ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-zinc-300'
                          }`}
                        >
                          {notif.title}
                        </h4>
                        <span className="px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider rounded-md bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400">
                          {notif.category}
                        </span>
                        {!notif.isRead && (
                          <span className="inline-block w-2 h-2 rounded-full bg-primary" />
                        )}
                      </div>
                      <span className="text-[11px] text-gray-400 dark:text-zinc-500 whitespace-nowrap">
                        {formatRelativeTime(notif.createdAt)}
                      </span>
                    </div>

                    <p className="text-xs text-gray-600 dark:text-zinc-400 mt-1.5 leading-relaxed">
                      {notif.message}
                    </p>

                    {notif.linkUrl && (
                      <button
                        onClick={() => router.push(notif.linkUrl!)}
                        className="mt-2 text-[11px] font-semibold text-primary hover:underline inline-flex items-center gap-1"
                      >
                        <span>View resource</span>
                        <ExternalLink size={11} />
                      </button>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleToggleRead(notif)}
                      className="p-2 text-gray-400 hover:text-gray-700 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                      title={notif.isRead ? 'Mark as unread' : 'Mark as read'}
                    >
                      <Check size={15} className={notif.isRead ? 'text-emerald-500' : ''} />
                    </button>
                    <button
                      onClick={() => handleDelete(notif.id)}
                      className="p-2 text-gray-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                      title="Delete notification"
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
    </div>
  );
}
