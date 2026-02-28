'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { useAuth } from '@/providers/AuthProvider';
import { fetchSavedArticles } from '@/lib/api';
import NewsCard from '@/components/news/NewsCard';
import type { Article } from '@/types';

export default function SavedPage() {
  const locale = useLocale();
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  const [articles, setArticles] = useState<Article[]>([]);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState('');

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push(`/${locale}/login`);
    }
  }, [user, authLoading, locale, router]);

  const loadArticles = useCallback(async (pageNum: number, replace: boolean) => {
    if (replace) setIsFetching(true);
    else setIsLoadingMore(true);

    try {
      const data = await fetchSavedArticles({ page: pageNum, page_size: 20 });
      setArticles((prev) => replace ? data.items : [...prev, ...data.items]);
      setHasNext(data.has_next);
      setPage(pageNum);
    } catch {
      setError('Failed to load saved articles.');
    } finally {
      setIsFetching(false);
      setIsLoadingMore(false);
    }
  }, []);

  // Initial load once user is confirmed
  useEffect(() => {
    if (user) {
      loadArticles(1, true);
    }
  }, [user, loadArticles]);

  // Don't render content while auth is resolving
  if (authLoading || (!user && !authLoading)) {
    return null;
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Saved Articles</h1>
        <p className="text-sm text-gray-500 mt-1">Articles you&apos;ve bookmarked for later</p>
      </div>

      {/* Loading skeleton */}
      {isFetching && (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-lg p-4 animate-pulse">
              <div className="h-3 bg-gray-100 rounded w-24 mb-3" />
              <div className="h-4 bg-gray-100 rounded w-full mb-2" />
              <div className="h-4 bg-gray-100 rounded w-3/4 mb-3" />
              <div className="h-3 bg-gray-100 rounded w-full" />
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
      {!isFetching && !error && articles.length === 0 && (
        <div className="text-center py-20">
          <div className="text-4xl mb-4">🔖</div>
          <h2 className="text-base font-semibold text-gray-700 mb-2">No saved articles yet</h2>
          <p className="text-sm text-gray-400 mb-6">
            Bookmark articles you want to read later and they&apos;ll appear here.
          </p>
          <Link
            href={`/${locale}`}
            className="inline-block bg-gray-900 text-white py-2 px-5 rounded-md text-sm font-medium hover:bg-gray-700 transition-colors"
          >
            Browse articles →
          </Link>
        </div>
      )}

      {/* Article list */}
      {!isFetching && articles.length > 0 && (
        <div className="space-y-3">
          {articles.map((article) => (
            <NewsCard key={article.id} article={article} />
          ))}
        </div>
      )}

      {/* Load more */}
      {hasNext && !isFetching && (
        <div className="mt-6 flex justify-center">
          <button
            onClick={() => loadArticles(page + 1, false)}
            disabled={isLoadingMore}
            className="px-5 py-2 rounded-md border border-gray-300 text-sm text-gray-600 hover:border-gray-500 hover:text-gray-900 transition-colors disabled:opacity-50"
          >
            {isLoadingMore ? 'Loading…' : 'Load more'}
          </button>
        </div>
      )}

      {/* End of list */}
      {!hasNext && !isFetching && articles.length > 0 && (
        <p className="mt-8 text-center text-xs text-gray-300">— End of saved articles —</p>
      )}
    </div>
  );
}
