'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useAuth } from '@/providers/AuthProvider';
import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '@/lib/api';
import type { Notification } from '@/types';

// ── Notification type → icon map ───────────────────────────────────────────────
function NotificationIcon({ type }: { type: string }) {
  if (type === 'email_verified') {
    return (
      <svg className="w-5 h-5 text-emerald-500 flex-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    );
  }
  if (type === 'password_changed') {
    return (
      <svg className="w-5 h-5 text-amber-500 flex-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    );
  }
  return (
    <svg className="w-5 h-5 text-blue-400 flex-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  );
}

// ── Relative time (English only — notifications are account events) ────────────
function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  if (diff < 60_000) return 'just now';
  const m = Math.floor(diff / 60_000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(diff / 3_600_000);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(diff / 86_400_000);
  return `${d}d ago`;
}

export default function NotificationsPage() {
  const locale = useLocale();
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const t = useTranslations('notifications');

  const [items, setItems] = useState<Notification[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState('');

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push(`/${locale}/login`);
    }
  }, [user, authLoading, locale, router]);

  const load = useCallback(async () => {
    setIsFetching(true);
    try {
      const data = await fetchNotifications();
      setItems(data);
    } catch {
      setError(t('error'));
    } finally {
      setIsFetching(false);
    }
  }, [t]);

  useEffect(() => {
    if (user) load();
  }, [user, load]);

  const handleMarkRead = async (id: string) => {
    await markNotificationRead(id);
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsRead();
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  if (authLoading || (!user && !authLoading)) return null;

  const unreadCount = items.filter((n) => !n.is_read).length;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{t('title')}</h1>
          {unreadCount > 0 && (
            <p className="text-sm text-gray-500 mt-0.5">
              {unreadCount} {t('unread')}
            </p>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors"
          >
            {t('markAllRead')}
          </button>
        )}
      </div>

      {/* Loading skeleton */}
      {isFetching && (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-lg p-4 animate-pulse flex gap-3">
              <div className="w-5 h-5 bg-gray-100 rounded-full flex-none mt-0.5" />
              <div className="flex-1">
                <div className="h-3.5 bg-gray-100 rounded w-40 mb-2" />
                <div className="h-3 bg-gray-100 rounded w-full" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-4 py-3">
          {error}
        </p>
      )}

      {/* Empty state */}
      {!isFetching && !error && items.length === 0 && (
        <div className="text-center py-20">
          <svg className="w-10 h-10 text-gray-200 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <p className="text-sm text-gray-400">{t('empty')}</p>
        </div>
      )}

      {/* Notification list */}
      {!isFetching && items.length > 0 && (
        <div className="space-y-2">
          {items.map((n) => (
            <div
              key={n.id}
              className={`relative bg-white border rounded-lg p-4 flex gap-3 transition-colors ${
                n.is_read ? 'border-gray-100' : 'border-gray-200 bg-blue-50/30'
              }`}
            >
              {/* Unread dot */}
              {!n.is_read && (
                <span className="absolute top-4 right-4 w-2 h-2 rounded-full bg-blue-500" />
              )}

              <NotificationIcon type={n.type} />

              <div className="flex-1 min-w-0 pr-4">
                <p className={`text-sm font-medium leading-snug ${n.is_read ? 'text-gray-600' : 'text-gray-900'}`}>
                  {n.title}
                </p>
                {n.body && (
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{n.body}</p>
                )}
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-[10px] text-gray-400">{timeAgo(n.created_at)}</span>
                  {!n.is_read && (
                    <button
                      onClick={() => handleMarkRead(n.id)}
                      className="text-[10px] font-medium text-blue-500 hover:text-blue-700 transition-colors"
                    >
                      {t('markRead')}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
