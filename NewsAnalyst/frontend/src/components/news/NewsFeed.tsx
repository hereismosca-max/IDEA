'use client';

import { useEffect, useRef, useState } from 'react';
import NewsCard from './NewsCard';
import { fetchArticles } from '@/lib/api';
import { Article, ArticleListResponse } from '@/types';

interface NewsFeedProps {
  date?: string;      // "YYYY-MM-DD" — filter to one UTC day; omitted when search is active
  category?: string;  // section slug ("all" | "markets" | "technology" | ...)
  search?: string;    // free-text search across title + AI summary
  sort?: 'latest' | 'popular';
  language?: string;  // content language — 'en' (American board) | 'zh' (Chinese board)
}

export default function NewsFeed({ date, category, search, sort = 'latest', language = 'en' }: NewsFeedProps) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Monotonically-increasing counter: each new fetch call claims the latest id.
  // Any response that arrives with a stale id is silently discarded, preventing
  // race conditions when the user navigates dates quickly (e.g. 8→7→8).
  const reqIdRef = useRef(0);

  const isChinese = language === 'zh';

  const loadArticles = async (pageNum: number, reset = false) => {
    const thisId = ++reqIdRef.current;
    try {
      reset ? setLoading(true) : setLoadingMore(true);
      const data: ArticleListResponse = await fetchArticles({
        page: pageNum,
        language,
        date,
        category_slug: category && category !== 'all' ? category : undefined,
        search: search || undefined,
        sort,
      });
      // Discard if a newer request has already been issued
      if (thisId !== reqIdRef.current) return;
      setArticles((prev) => (reset ? data.items : [...prev, ...data.items]));
      setHasNext(data.has_next);
      setPage(pageNum);
    } catch {
      if (thisId !== reqIdRef.current) return;
      setError('Failed to load articles. Please try again.');
    } finally {
      // Only the latest request should touch loading state
      if (thisId === reqIdRef.current) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  };

  // Reset and reload from page 1 whenever any filter/sort/language changes
  useEffect(() => {
    setError(null);
    loadArticles(1, true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, category, search, sort, language]);

  // ── Error state ─────────────────────────────────────────────────────────────
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

  // ── Initial loading skeleton ─────────────────────────────────────────────────
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

  // ── Empty state ──────────────────────────────────────────────────────────────
  if (articles.length === 0) {
    // Chinese board — no sources connected yet
    if (isChinese && !search) {
      return (
        <div className="text-center py-20">
          <p className="text-gray-400 text-sm">暂无资讯</p>
          <p className="text-gray-300 text-xs mt-1">中文板块即将上线，敬请期待。</p>
        </div>
      );
    }

    return (
      <div className="text-center py-20">
        {search ? (
          <>
            <p className="text-gray-400 text-sm">No results for &ldquo;{search}&rdquo;.</p>
            <p className="text-gray-300 text-xs mt-1">Try different keywords or clear the search.</p>
          </>
        ) : (
          <>
            <p className="text-gray-400 text-sm">No articles found for this date.</p>
            <p className="text-gray-300 text-xs mt-1">Try navigating to another day.</p>
          </>
        )}
      </div>
    );
  }

  // ── Main feed ────────────────────────────────────────────────────────────────
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

      {/* End indicator */}
      {!hasNext && articles.length > 0 && (
        <div className="text-center mt-8 text-gray-300 text-xs">
          {search
            ? `— ${articles.length} result${articles.length !== 1 ? 's' : ''} —`
            : '— End of articles for this day —'}
        </div>
      )}
    </div>
  );
}
