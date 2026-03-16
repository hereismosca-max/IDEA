'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { Article } from '@/types';
import SaveButton from '@/components/article/SaveButton';
import { translateArticle } from '@/lib/api';
import { useDisplay } from '@/providers/DisplayProvider';

interface NewsCardProps {
  article: Article;
}

export default function NewsCard({ article }: NewsCardProps) {
  const locale           = useLocale();
  const needsTranslation = locale !== 'en';
  const tFeed            = useTranslations('feed');
  const { density }      = useDisplay();
  const compact          = density === 'compact';

  // Locale-aware relative time using the existing feed translation keys.
  // Shows only the most significant unit — clean and readable in any language.
  const timeAgo = (dateStr: string): string => {
    const diff = Date.now() - new Date(dateStr).getTime();
    if (diff < 60_000) return tFeed('justNow');
    const m = Math.floor(diff / 60_000);
    if (m < 60)        return tFeed('minutesAgo', { minutes: m });
    const h = Math.floor(diff / 3_600_000);
    if (h < 24)        return tFeed('hoursAgo', { hours: h });
    const d = Math.floor(diff / 86_400_000);
    return tFeed('daysAgo', { days: d });
  };

  // English summary / snippet shown in modal
  const displayText = article.ai_summary || article.content_snippet;

  // ── Translation state ──────────────────────────────────────────────────────
  const [translatedTitle, setTranslatedTitle]     = useState<string | null>(null);
  const [translatedSummary, setTranslatedSummary] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading]       = useState(false);
  const [modalOpen, setModalOpen]                 = useState(false);

  // Auto-translate title in the background when not in English locale.
  useEffect(() => {
    if (!needsTranslation || translatedTitle) return;
    let cancelled = false;
    translateArticle(article.id, locale)
      .then((t) => {
        if (!cancelled) {
          setTranslatedTitle(t.title);
          setTranslatedSummary(t.ai_summary); // cache summary at no extra cost
        }
      })
      .catch(() => { /* silent — fall back to English */ });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [article.id, locale]);

  // Close modal on Escape key
  useEffect(() => {
    if (!modalOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setModalOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [modalOpen]);

  // Open the summary modal — fetch translation if not yet available
  const handleOpenModal = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (needsTranslation && !translatedSummary) {
      setSummaryLoading(true);
      try {
        const t = await translateArticle(article.id, locale);
        setTranslatedSummary(t.ai_summary);
        if (!translatedTitle) setTranslatedTitle(t.title);
      } catch { /* silent */ }
      finally { setSummaryLoading(false); }
    }

    setModalOpen(true);
  };

  const displayTitle = (needsTranslation && translatedTitle) ? translatedTitle : article.title;
  // Modal shows translated summary when available (falls back to EN)
  const modalSummary = needsTranslation ? (translatedSummary || displayText) : displayText;

  return (
    <>
      {/* ── Card ─────────────────────────────────────────────────────────── */}
      <div className={`relative bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-gray-400 dark:hover:border-gray-500 hover:shadow-sm transition-all group flex flex-col`}>

        {/* Bookmark button — absolute positioned, outside Link to avoid navigation */}
        <div className="absolute top-2 right-2 z-10">
          <SaveButton articleId={article.id} compact />
        </div>

        {/* Clickable content area — flex column so impact bar pins to bottom */}
        <Link
          href={`/${locale}/article/${article.id}`}
          className={`flex flex-col flex-1 pr-12 ${compact ? 'p-3' : 'p-4'}`}
        >
          {/* Content grows to fill space, pushing impact bar down */}
          <div className="flex-1">
            {/* Source + Time */}
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-semibold text-blue-600 uppercase tracking-wide">
                {article.source.name}
              </span>
              <span className="text-gray-300 dark:text-gray-600">·</span>
              <span className="text-xs text-gray-400 dark:text-gray-500">{timeAgo(article.published_at)}</span>
            </div>

            {/* Full title — no line-clamp; translated in zh locale once ready */}
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 leading-snug group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors">
              {displayTitle}
            </h2>
          </div>

          {/* AI impact score — always at the bottom of the card */}
          {article.ai_score !== null && article.ai_score !== undefined && (
            <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center gap-1.5">
              <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide flex-none">{tFeed('sortImpact')}</span>
              <div className="flex-1 h-1 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.round(article.ai_score * 100)}%`,
                    backgroundColor: article.ai_score >= 0.7
                      ? '#4f46e5'   // indigo-600
                      : article.ai_score >= 0.4
                      ? '#3b82f6'   // blue-500
                      : '#93c5fd',  // blue-300
                  }}
                />
              </div>
              <span className="text-[10px] tabular-nums text-gray-400 dark:text-gray-500 flex-none">
                {Math.round(article.ai_score * 100)}
              </span>
            </div>
          )}
        </Link>

        {/* View Summary button — shown only when summary content exists */}
        {displayText && (
          <div className={`border-t border-gray-100 dark:border-gray-800 py-2 ${compact ? 'px-3' : 'px-4'}`}>
            <button
              onClick={handleOpenModal}
              disabled={summaryLoading}
              className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700 transition-colors disabled:opacity-50"
            >
              {summaryLoading ? (
                <>
                  <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  {tFeed('translating')}
                </>
              ) : (
                <>
                  {/* Document / summary icon */}
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  {tFeed('viewSummary')}
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* ── Summary modal popup ───────────────────────────────────────────── */}
      {modalOpen && (
        // Backdrop: dimmed + blurred — click outside to close
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setModalOpen(false)}
        >
          {/* Modal card — stop clicks from bubbling to backdrop */}
          <div
            className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-6 max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto border border-gray-100 dark:border-gray-700"
            onClick={(e) => e.stopPropagation()}
          >
            {/* ✕ Close button */}
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Source + time */}
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-semibold text-blue-600 uppercase tracking-wide">
                {article.source.name}
              </span>
              <span className="text-gray-300 dark:text-gray-600">·</span>
              <span className="text-xs text-gray-400 dark:text-gray-500">{timeAgo(article.published_at)}</span>
            </div>

            {/* Title */}
            <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 leading-snug mb-4 pr-6">
              {displayTitle}
            </h2>

            <div className="border-t border-gray-100 dark:border-gray-800 mb-4" />

            {/* Summary content */}
            {modalSummary ? (
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{modalSummary}</p>
            ) : (
              <p className="text-sm text-gray-400 dark:text-gray-500 italic">{tFeed('noSummary')}</p>
            )}

            {/* Link to full article */}
            <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-800">
              <Link
                href={`/${locale}/article/${article.id}`}
                onClick={() => setModalOpen(false)}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 dark:hover:text-blue-400 transition-colors"
              >
                {tFeed('readFullArticle')} →
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
