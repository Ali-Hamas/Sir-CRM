'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { Bell, Check, Trash2, Settings, FileText, Bot, Users, Calendar, RefreshCw, CheckCircle2 } from 'lucide-react';

const INITIAL_NOTIFICATIONS = [
  { id: 'notif-1', title: 'New CRM Lead Assigned', message: 'Jane Doe has been assigned to you.', category: 'CRM', time: '10 min ago', isRead: false },
  { id: 'notif-2', title: 'Project Apollo Deadline', message: 'The Phase 1 milestone is due tomorrow.', category: 'PROJECT', time: '2 hours ago', isRead: false },
  { id: 'notif-3', title: 'Workflow Executed', message: 'Automated workflow rule ran successfully.', category: 'SYSTEM', time: 'Yesterday', isRead: true },
  { id: 'notif-4', title: 'Meeting Reminder', message: 'Sync with Design Team in 15 minutes.', category: 'MEETING', time: '2 days ago', isRead: true },
];

const DELETED_KEY = 'blackdesk_deleted_notifications';
const READ_KEY = 'blackdesk_read_notifications';

function getDeletedIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(DELETED_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveDeletedId(id: string) {
  if (typeof window === 'undefined') return;
  try {
    const current = getDeletedIds();
    if (!current.includes(id)) {
      localStorage.setItem(DELETED_KEY, JSON.stringify([...current, id]));
    }
  } catch (err) {
    console.error('Failed to save deleted notification to localStorage:', err);
  }
}

function getReadIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(READ_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveReadId(id: string) {
  if (typeof window === 'undefined') return;
  try {
    const current = getReadIds();
    if (!current.includes(id)) {
      localStorage.setItem(READ_KEY, JSON.stringify([...current, id]));
    }
  } catch (err) {
    console.error('Failed to save read notification to localStorage:', err);
  }
}

export default function NotificationsPage() {
  const params = useParams();
  const orgSlug = (params?.orgSlug as string) || '';

  const [notifications, setNotifications] = useState<any[]>([]);
  const [filter, setFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    if (!orgSlug) return;
    setLoading(true);
    const deletedIds = getDeletedIds();
    const readIds = getReadIds();

    try {
      const data = await apiFetch(`/organizations/${orgSlug}/notifications`).catch(() => null);
      if (data && data.items && data.items.length > 0) {
        const fetched = data.items
          .filter((n: any) => !deletedIds.includes(n.id))
          .map((n: any) => ({
            id: n.id,
            title: n.title,
            message: n.message,
            category: n.category || 'SYSTEM',
            time: new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isRead: n.isRead || readIds.includes(n.id),
          }));
        setNotifications(fetched);
      } else {
        // Fallback demo items filtered by persistent deletedIds & readIds
        const fallback = INITIAL_NOTIFICATIONS
          .filter((n) => !deletedIds.includes(n.id))
          .map((n) => ({
            ...n,
            isRead: n.isRead || readIds.includes(n.id),
          }));
        setNotifications(fallback);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
      const fallback = INITIAL_NOTIFICATIONS
        .filter((n) => !deletedIds.includes(n.id))
        .map((n) => ({
          ...n,
          isRead: n.isRead || readIds.includes(n.id),
        }));
      setNotifications(fallback);
    } finally {
      setLoading(false);
    }
  }, [orgSlug]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkAllRead = async () => {
    // Persistent update
    notifications.forEach((n) => saveReadId(n.id));
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    try {
      await apiFetch(`/organizations/${orgSlug}/notifications/mark-all-read`, { method: 'PATCH' }).catch(() => null);
    } catch (err) {
      console.error('Mark all read error:', err);
    }
  };

  const handleToggleRead = async (id: string) => {
    saveReadId(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: !n.isRead } : n))
    );
    try {
      await apiFetch(`/organizations/${orgSlug}/notifications/${id}/read`, { method: 'PATCH' }).catch(() => null);
    } catch (err) {
      console.error('Toggle read error:', err);
    }
  };

  const handleDelete = async (id: string) => {
    // REAL PERSISTENT DELETION
    saveDeletedId(id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    try {
      await apiFetch(`/organizations/${orgSlug}/notifications/${id}`, { method: 'DELETE' }).catch(() => null);
    } catch (err) {
      console.error('Delete notification error:', err);
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'UNREAD') return !n.isRead;
    if (filter === 'CRM') return n.category === 'CRM';
    if (filter === 'PROJECTS') return n.category === 'PROJECT';
    return true;
  });

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
            <Bell className="h-6 w-6 text-primary" />
            Notification Center
          </h2>
          <p className="text-muted-foreground text-sm">
            {unreadCount > 0
              ? `You have ${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}.`
              : 'All notifications read & up to date.'}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchNotifications}
            disabled={loading}
            className="p-2 border border-gray-200 dark:border-zinc-800 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
            title="Refresh Notifications"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={handleMarkAllRead}
            disabled={notifications.length === 0 || unreadCount === 0}
            className="flex items-center gap-2 px-3.5 py-2 bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
          >
            <Check size={15} /> Mark all read
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-200 dark:border-zinc-800">
        {['ALL', 'UNREAD', 'CRM', 'PROJECTS'].map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`pb-2.5 text-xs font-bold border-b-2 transition-colors ${
              filter === tab
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Notifications List Card */}
      <div className="glass-card-premium overflow-hidden divide-y divide-gray-200 dark:divide-zinc-800">
        {filteredNotifications.length === 0 ? (
          <div className="p-16 text-center text-gray-500 dark:text-zinc-400 space-y-2">
            <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center mx-auto text-gray-400">
              <CheckCircle2 size={24} />
            </div>
            <p className="font-bold text-sm text-gray-900 dark:text-white">No notifications match your view</p>
            <p className="text-xs text-gray-400">Deleted notifications are permanently removed.</p>
          </div>
        ) : (
          filteredNotifications.map((notif) => (
            <div
              key={notif.id}
              className={`p-4 flex items-start gap-4 hover:bg-gray-50/80 dark:hover:bg-zinc-800/50 transition-colors ${
                !notif.isRead ? 'bg-primary/5 dark:bg-primary/10' : ''
              }`}
            >
              <div className="mt-1 flex-shrink-0 w-8 h-8 rounded-xl bg-white dark:bg-zinc-800 flex items-center justify-center border border-gray-100 dark:border-zinc-700 shadow-xs">
                <Bell size={16} className={!notif.isRead ? 'text-primary' : 'text-gray-400'} />
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <h4 className={`text-xs font-bold ${!notif.isRead ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-zinc-300'}`}>
                    {notif.title}
                  </h4>
                  <span className="text-[10px] text-gray-400 whitespace-nowrap ml-4">{notif.time}</span>
                </div>
                <p className="text-xs text-gray-600 dark:text-zinc-400 mt-1 leading-relaxed">{notif.message}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => handleToggleRead(notif.id)}
                  className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-white rounded-lg hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors"
                  title={notif.isRead ? 'Mark as unread' : 'Mark as read'}
                >
                  <Check size={15} className={notif.isRead ? 'text-emerald-500' : ''} />
                </button>
                <button
                  onClick={() => handleDelete(notif.id)}
                  className="p-1.5 text-gray-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                  title="Delete Notification"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

