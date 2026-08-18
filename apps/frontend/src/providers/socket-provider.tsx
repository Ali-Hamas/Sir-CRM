'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { getSocket, disconnectSocket } from '@/lib/socket';
import { apiFetch } from '@/lib/api';
import { useParams, useRouter } from 'next/navigation';
import { Bell, CheckCircle2, Info, AlertTriangle, X } from 'lucide-react';

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

interface SocketContextValue {
  unreadCount: number;
  notifications: NotificationItem[];
  latestNotification: NotificationItem | null;
  loading: boolean;
  isConnected: boolean;
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
}

const SocketContext = createContext<SocketContextValue | null>(null);

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((state) => state.user);
  const params = useParams();
  const router = useRouter();
  const orgSlug = (params?.orgSlug as string) || '';

  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [latestNotification, setLatestNotification] = useState<NotificationItem | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [activeToast, setActiveToast] = useState<NotificationItem | null>(null);

  const fetchNotifications = useCallback(async () => {
    if (!orgSlug || !user?.id) return;
    setLoading(true);
    try {
      const [notifData, countData] = await Promise.all([
        apiFetch(`/organizations/${orgSlug}/notifications?limit=25`).catch(() => null),
        apiFetch(`/organizations/${orgSlug}/notifications/unread-count`).catch(() => null),
      ]);

      if (notifData && Array.isArray(notifData.items)) {
        setNotifications(notifData.items);
      }
      if (countData && typeof countData.count === 'number') {
        setUnreadCount(countData.count);
      }
    } catch (err) {
      console.warn('[SocketProvider] Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [orgSlug, user?.id]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Connect to WebSocket
  useEffect(() => {
    if (!user?.id) return;

    const socket = getSocket(user.id);
    if (!socket) return;

    const onConnect = () => {
      setIsConnected(true);
    };

    const onDisconnect = () => {
      setIsConnected(false);
    };

    const onNewNotification = (notification: NotificationItem) => {
      console.log('[WebSocket] Received new notification:', notification);
      setNotifications((prev) => [notification, ...prev.filter((n) => n.id !== notification.id)]);
      setUnreadCount((prev) => prev + 1);
      setLatestNotification(notification);
      setActiveToast(notification);

      // Auto dismiss toast after 6 seconds
      setTimeout(() => {
        setActiveToast((current) => (current?.id === notification.id ? null : current));
      }, 6000);
    };

    const onUnreadCount = (data: { count: number }) => {
      if (typeof data?.count === 'number') {
        setUnreadCount(data.count);
      }
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('new_notification', onNewNotification);
    socket.on('unread_count', onUnreadCount);

    if (socket.connected) {
      setIsConnected(true);
    }

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('new_notification', onNewNotification);
      socket.off('unread_count', onUnreadCount);
    };
  }, [user?.id]);

  const markAsRead = async (id: string) => {
    if (!orgSlug) return;
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));

    try {
      await apiFetch(`/organizations/${orgSlug}/notifications/${id}/read`, { method: 'PATCH' });
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  };

  const markAllAsRead = async () => {
    if (!orgSlug) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);

    try {
      await apiFetch(`/organizations/${orgSlug}/notifications/mark-all-read`, { method: 'PATCH' });
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const deleteNotification = async (id: string) => {
    if (!orgSlug) return;
    const target = notifications.find((n) => n.id === id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    if (target && !target.isRead) {
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }

    try {
      await apiFetch(`/organizations/${orgSlug}/notifications/${id}`, { method: 'DELETE' });
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  };

  return (
    <SocketContext.Provider
      value={{
        unreadCount,
        notifications,
        latestNotification,
        loading,
        isConnected,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
        deleteNotification,
      }}
    >
      {children}

      {/* Real-Time Notification Toast */}
      {activeToast && (
        <div className="fixed bottom-5 right-5 z-50 max-w-sm w-full bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-4 animate-slide-up transition-all backdrop-blur-xl">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
              <Bell size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                  {activeToast.category || 'Notification'}
                </span>
                <button
                  onClick={() => setActiveToast(null)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-zinc-200 p-0.5"
                >
                  <X size={14} />
                </button>
              </div>
              <h4 className="text-xs font-bold text-gray-900 dark:text-white truncate mt-0.5">
                {activeToast.title}
              </h4>
              <p className="text-xs text-gray-600 dark:text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                {activeToast.message}
              </p>
              {activeToast.linkUrl && (
                <button
                  onClick={() => {
                    setActiveToast(null);
                    router.push(activeToast.linkUrl!);
                  }}
                  className="mt-2 text-[11px] font-semibold text-primary hover:underline block"
                >
                  View details →
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </SocketContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(SocketContext);
  if (!context) {
    return {
      unreadCount: 0,
      notifications: [],
      latestNotification: null,
      loading: false,
      isConnected: false,
      fetchNotifications: async () => {},
      markAsRead: async () => {},
      markAllAsRead: async () => {},
      deleteNotification: async () => {},
    };
  }
  return context;
}
