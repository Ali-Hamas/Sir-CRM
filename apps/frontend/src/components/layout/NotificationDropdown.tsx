'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useNotifications } from '@/providers/socket-provider';
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  ExternalLink,
  Settings,
  Sparkles,
  Layers,
  Calendar,
  Shield,
  Briefcase,
  AlertCircle,
  Clock,
  Radio,
} from 'lucide-react';

function getCategoryIcon(category: string) {
  switch (category?.toUpperCase()) {
    case 'TASKS':
    case 'TASK':
      return <Layers size={14} className="text-blue-500" />;
    case 'PROJECTS':
    case 'PROJECT':
      return <Briefcase size={14} className="text-purple-500" />;
    case 'CRM':
    case 'LEAD':
    case 'DEAL':
      return <Sparkles size={14} className="text-emerald-500" />;
    case 'MEETINGS':
    case 'MEETING':
      return <Calendar size={14} className="text-amber-500" />;
    case 'SECURITY':
    case 'AUTH':
      return <Shield size={14} className="text-rose-500" />;
    default:
      return <Bell size={14} className="text-primary" />;
  }
}

function formatRelativeTime(dateString: string): string {
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return 'Just now';
    const diff = (Date.now() - d.getTime()) / 1000;
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  } catch {
    return 'Recently';
  }
}

export function NotificationDropdown({ orgSlug }: { orgSlug: string }) {
  const router = useRouter();
  const {
    unreadCount,
    notifications,
    loading,
    isConnected,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications();

  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<'ALL' | 'UNREAD'>('ALL');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close when clicked outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const displayedNotifications = (notifications || []).filter((item) => {
    if (filter === 'UNREAD') return !item.isRead;
    return true;
  });

  const handleNotificationClick = (item: any) => {
    if (!item.isRead) {
      markAsRead(item.id);
    }
    if (item.linkUrl) {
      router.push(item.linkUrl);
      setIsOpen(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-900 transition-colors relative"
        title="Notifications"
        aria-label="Open notifications"
      >
        <Bell size={17} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-black text-white bg-primary rounded-full ring-2 ring-white dark:ring-zinc-950 animate-scale-in">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2.5 w-80 sm:w-96 rounded-2xl border border-gray-200/90 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-2xl shadow-2xl z-50 overflow-hidden animate-scale-in origin-top-right">
          {/* Header */}
          <div className="p-4 border-b border-gray-100 dark:border-zinc-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">Notifications</h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-primary/10 text-primary">
                  {unreadCount} new
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-primary hover:bg-primary/10 rounded-lg transition-colors"
                  title="Mark all as read"
                >
                  <CheckCheck size={13} />
                  <span>Mark all read</span>
                </button>
              )}
              <button
                onClick={() => {
                  setIsOpen(false);
                  router.push(`/${orgSlug}/notifications`);
                }}
                className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-zinc-200 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                title="Notification Settings"
              >
                <Settings size={14} />
              </button>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-100 dark:border-zinc-800/80 bg-gray-50/50 dark:bg-zinc-950/40 text-xs">
            <button
              onClick={() => setFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg font-semibold text-[11px] transition-all ${
                filter === 'ALL'
                  ? 'bg-white dark:bg-zinc-800 text-gray-900 dark:text-white shadow-2xs'
                  : 'text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('UNREAD')}
              className={`px-2.5 py-1 rounded-lg font-semibold text-[11px] transition-all ${
                filter === 'UNREAD'
                  ? 'bg-white dark:bg-zinc-800 text-primary shadow-2xs'
                  : 'text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Unread {unreadCount > 0 ? `(${unreadCount})` : ''}
            </button>
            <div className="ml-auto flex items-center gap-1 text-[10px] text-gray-400">
              <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              <span>{isConnected ? 'Real-time' : 'Syncing'}</span>
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-gray-100 dark:divide-zinc-800/60 scrollbar-thin">
            {loading && notifications.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs text-gray-400">Loading notifications...</p>
              </div>
            ) : displayedNotifications.length === 0 ? (
              <div className="py-12 px-6 text-center">
                <div className="w-11 h-11 rounded-2xl bg-gray-100 dark:bg-zinc-800 flex items-center justify-center mx-auto text-gray-400 dark:text-zinc-500 mb-2.5">
                  <Check size={20} />
                </div>
                <p className="text-xs font-bold text-gray-900 dark:text-white">All caught up!</p>
                <p className="text-[11px] text-gray-400 dark:text-zinc-500 mt-0.5">
                  {filter === 'UNREAD' ? 'No unread notifications' : 'No notifications yet'}
                </p>
              </div>
            ) : (
              displayedNotifications.slice(0, 10).map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleNotificationClick(item)}
                  className={`p-3.5 flex items-start gap-3 transition-colors cursor-pointer group relative ${
                    !item.isRead
                      ? 'bg-primary/4 dark:bg-primary/8 hover:bg-primary/8 dark:hover:bg-primary/12'
                      : 'hover:bg-gray-50 dark:hover:bg-zinc-800/50'
                  }`}
                >
                  {/* Category icon */}
                  <div className="mt-0.5 w-8 h-8 rounded-xl bg-white dark:bg-zinc-800 border border-gray-200/80 dark:border-zinc-700/80 flex items-center justify-center shrink-0 shadow-2xs">
                    {getCategoryIcon(item.category)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 pr-6">
                    <div className="flex items-center justify-between gap-1">
                      <p
                        className={`text-xs truncate ${
                          !item.isRead
                            ? 'font-bold text-gray-900 dark:text-white'
                            : 'font-medium text-gray-700 dark:text-zinc-300'
                        }`}
                      >
                        {item.title}
                      </p>
                    </div>
                    <p className="text-[11px] text-gray-500 dark:text-zinc-400 line-clamp-2 mt-0.5 leading-relaxed">
                      {item.message}
                    </p>
                    <span className="text-[10px] text-gray-400 dark:text-zinc-500 mt-1 block">
                      {formatRelativeTime(item.createdAt)}
                    </span>
                  </div>

                  {/* Unread indicator dot */}
                  {!item.isRead && (
                    <span className="absolute top-4 right-3.5 w-2 h-2 rounded-full bg-primary" />
                  )}

                  {/* Hover action buttons */}
                  <div className="absolute right-2 bottom-2 hidden group-hover:flex items-center gap-1 bg-white/90 dark:bg-zinc-900/90 rounded-lg p-0.5 shadow-xs border border-gray-200 dark:border-zinc-700">
                    {!item.isRead && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          markAsRead(item.id);
                        }}
                        className="p-1 text-gray-400 hover:text-emerald-500 rounded transition-colors"
                        title="Mark as read"
                      >
                        <Check size={13} />
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification(item.id);
                      }}
                      className="p-1 text-gray-400 hover:text-rose-500 rounded transition-colors"
                      title="Dismiss"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-2.5 border-t border-gray-100 dark:border-zinc-800/80 bg-gray-50/50 dark:bg-zinc-950/50 text-center">
            <button
              onClick={() => {
                setIsOpen(false);
                router.push(`/${orgSlug}/notifications`);
              }}
              className="w-full py-1.5 text-xs font-bold text-primary hover:text-primary/80 hover:bg-primary/5 rounded-xl transition-colors flex items-center justify-center gap-1.5"
            >
              <span>Open Notification Center</span>
              <ExternalLink size={12} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
