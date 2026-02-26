'use client';

import { useEffect, useState } from 'react';
import NewsCard from './NewsCard';
import { fetchArticles } from '@/lib/api';
import { Article, ArticleListResponse } from '@/types';

export default function NewsFeed() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadArticles = async (pageNum: number, reset = false) => {
    try {
      reset ? setLoading(true) : setLoadingMore(true);
      const data: ArticleListResponse = await fetchArticles({ page: pageNum });
      setArticles((prev) => (reset ? data.items : [...prev, ...data.items]));
      setHasNext(data.has_next);
      setPage(pageNum);
    } catch {
      setError('Failed to load articles. Please try again.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    loadArticles(1, true);
  }, []);

  // ── Error state ────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500 text-sm">{error}</p>
        <button
          onClick={() => { setError(null); loadArticles(1, true); }}
          className="mt-4 text-sm text-blue-600 hover:underline"
        >
          Retry
        </button>
      </div>
    );
  }

  // ── Initial loading skeleton ───────────────────────────────────────────────
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(9)].map((_, i) => (
          <div key={i} className="bg-white border border-gray-200 rounded-lg p-4 animate-pulse">
            <div className="h-3 bg-gray-200 rounded w-24 mb-3" />
            <div className="h-4 bg-gray-200 rounded w-full mb-2" />
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-3" />
            <div className="h-3 bg-gray-200 rounded w-full mb-1" />
            <div className="h-3 bg-gray-200 rounded w-5/6" />
          </div>
        ))}
      </div>
    );
  }

  // ── Empty state ────────────────────────────────────────────────────────────
  if (articles.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-400 text-sm">No articles yet. Check back soon.</p>
      </div>
    );
  }

  // ── Main feed ──────────────────────────────────────────────────────────────
  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {articles.map((article) => (
          <NewsCard key={article.id} article={article} />
        ))}
      </div>

      {/* Load more */}
      {hasNext && (
        <div className="text-center mt-8">
          <button
            onClick={() => loadArticles(page + 1)}
            disabled={loadingMore}
            className="px-6 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 text-gray-700 disabled:opacity-50"
          >
            {loadingMore ? 'Loading…' : 'Load more'}
          </button>
        </div>
      )}
    </div>
  );
}
