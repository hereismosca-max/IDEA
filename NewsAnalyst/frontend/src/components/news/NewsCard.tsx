'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { Article } from '@/types';
import SaveButton from '@/components/article/SaveButton';
import { translateArticle } from '@/lib/api';

interface NewsCardProps {
  article: Article;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  if (diff < 0) return 'Just now';

  const totalMins = Math.floor(diff / 60_000);
  const totalHrs  = Math.floor(diff / 3_600_000);
  const totalDays = Math.floor(diff / 86_400_000);

  // Helper: pluralise units ("day"→"days", "week"→"weeks", etc.)
  const pl = (n: number, unit: string) => `${n} ${unit}${n !== 1 ? 's' : ''}`;

  // < 1 min
  if (totalMins < 1) return 'Just now';

  // 1–59 min → "X min ago"
  if (totalMins < 60) return `${totalMins} min ago`;

  // 1–23 h → "X h Y min ago"  (e.g. "23 h 39 min ago")
  if (totalHrs < 24) {
    const h = totalHrs;
    const m = totalMins % 60;
    return m > 0 ? `${h} h ${m} min ago` : `${h} h ago`;
  }

  // 1–6 days → "X days Y h Z min ago"  (e.g. "5 days 10 h 38 min ago")
  if (totalDays < 7) {
    const d = totalDays;
    const h = totalHrs % 24;
    const m = totalMins % 60;
    let s = pl(d, 'day');
    if (h > 0) s += ` ${h} h`;
    if (m > 0) s += ` ${m} min`;
    return s + ' ago';
  }

  // 1–3 weeks (7–27 days)
  if (totalDays < 28) {
    const w = Math.floor(totalDays / 7);
    const d = totalDays % 7;
    const h = totalHrs % 24;
    const m = totalMins % 60;
    let s = pl(w, 'week');
    if (d > 0) s += ` ${pl(d, 'day')}`;
    if (h > 0) s += ` ${h} h`;
    if (m > 0) s += ` ${m} min`;
    return s + ' ago';
  }

  // 1–11 months (28–364 days)
  if (totalDays < 365) {
    const mo = Math.max(1, Math.floor(totalDays / 30));
    const remDays = Math.max(0, totalDays - mo * 30);
    const w = Math.floor(remDays / 7);
    const d = remDays % 7;
    const h = totalHrs % 24;
    const m = totalMins % 60;
    let s = pl(mo, 'month');
    if (w > 0) s += ` ${pl(w, 'week')}`;
    if (d > 0) s += ` ${pl(d, 'day')}`;
    if (h > 0) s += ` ${h} h`;
    if (m > 0) s += ` ${m} min`;
    return s + ' ago';
  }

  // ≥ 1 year
  const yr = Math.floor(totalDays / 365);
  const remAfterYears = totalDays % 365;
  const mo = Math.floor(remAfterYears / 30);
  const remAfterMonths = remAfterYears % 30;
  const w = Math.floor(remAfterMonths / 7);
  const d = remAfterMonths % 7;
  const h = totalHrs % 24;
  const m = totalMins % 60;
  let s = pl(yr, 'year');
  if (mo > 0) s += ` ${pl(mo, 'month')}`;
  if (w > 0) s += ` ${pl(w, 'week')}`;
  if (d > 0) s += ` ${pl(d, 'day')}`;
  if (h > 0) s += ` ${h} h`;
  if (m > 0) s += ` ${m} min`;
  return s + ' ago';
}

export default function NewsCard({ article }: NewsCardProps) {
  const locale = useLocale();
  const isZh = locale === 'zh';

  // Show AI summary if available, otherwise fall back to raw snippet
  const displayText = article.ai_summary || article.content_snippet;

  // ── Chinese translation state ──────────────────────────────────────────────
  // title_zh: auto-fetched in background when locale='zh'
  // summary_zh: fetched on demand when user clicks "查看中文摘要"
  const [titleZh, setTitleZh]     = useState<string | null>(article.title_zh ?? null);
  const [summaryZh, setSummaryZh] = useState<string | null>(article.ai_summary_zh ?? null);
  const [summaryOpen, setSummaryOpen]     = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);

  // Auto-translate title in the background when in Chinese locale.
  // Uses any cached title_zh from the server-side article response first.
  useEffect(() => {
    if (!isZh || titleZh) return; // already have it
    let cancelled = false;
    translateArticle(article.id, 'zh')
      .then((t) => {
        if (!cancelled) {
          setTitleZh(t.title_zh);
          setSummaryZh(t.ai_summary_zh); // cache summary too (no extra cost)
        }
      })
      .catch(() => { /* silent — fall back to English */ });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [article.id, isZh]);

  // Load (or reveal) the translated summary when the user expands it.
  const handleSummaryToggle = async () => {
    if (summaryOpen) { setSummaryOpen(false); return; }

    if (summaryZh) { setSummaryOpen(true); return; }

    // Fetch if not yet available
    setSummaryLoading(true);
    try {
      const t = await translateArticle(article.id, 'zh');
      setSummaryZh(t.ai_summary_zh);
    } catch { /* silent */ }
    finally {
      setSummaryLoading(false);
      setSummaryOpen(true);
    }
  };

  const displayTitle = (isZh && titleZh) ? titleZh : article.title;

  return (
    <div className="relative bg-white border border-gray-200 rounded-lg hover:border-gray-400 hover:shadow-sm transition-all group">
      {/* Bookmark button — absolute positioned, outside Link to avoid navigation */}
      <div className="absolute top-2 right-2 z-10">
        <SaveButton articleId={article.id} compact />
      </div>

      {/* Clickable content area */}
      <Link
        href={`/${locale}/article/${article.id}`}
        className="block p-4 pr-12"
      >
        {/* Source + Time */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-semibold text-blue-600 uppercase tracking-wide">
            {article.source.name}
          </span>
          <span className="text-gray-300">·</span>
          <span className="text-xs text-gray-400">{timeAgo(article.published_at)}</span>
        </div>

        {/* Title — shows translated version in zh locale once available */}
        <h2 className="text-sm font-semibold text-gray-900 leading-snug mb-2 line-clamp-2 group-hover:text-blue-700 transition-colors">
          {displayTitle}
        </h2>

        {/* Summary / Snippet (always English on the card) */}
        {displayText && (
          <p className="text-xs text-gray-500 leading-relaxed line-clamp-3">{displayText}</p>
        )}

        {/* AI impact score — visible only when score exists */}
        {article.ai_score !== null && article.ai_score !== undefined && (
          <div className="mt-3 flex items-center gap-1.5">
            <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wide flex-none">Impact</span>
            <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.round(article.ai_score * 100)}%`,
                  // Colour shifts: low→blue-300, mid→blue-500, high→indigo-600
                  backgroundColor: article.ai_score >= 0.7
                    ? '#4f46e5'   // indigo-600
                    : article.ai_score >= 0.4
                    ? '#3b82f6'   // blue-500
                    : '#93c5fd',  // blue-300
                }}
              />
            </div>
            <span className="text-[10px] tabular-nums text-gray-400 flex-none">
              {Math.round(article.ai_score * 100)}
            </span>
          </div>
        )}
      </Link>

      {/* ── Chinese summary expand (zh locale only) ────────────────────────── */}
      {isZh && displayText && (
        <div className="border-t border-gray-100 px-4 py-2">
          <button
            onClick={handleSummaryToggle}
            disabled={summaryLoading}
            className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700 transition-colors disabled:opacity-50"
          >
            {summaryLoading ? (
              <>
                <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                翻译中…
              </>
            ) : summaryOpen ? (
              <>
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                </svg>
                收起中文摘要
              </>
            ) : (
              <>
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
                查看中文摘要
              </>
            )}
          </button>

          {summaryOpen && summaryZh && (
            <p className="mt-2 text-xs text-gray-600 leading-relaxed">
              {summaryZh}
            </p>
          )}
          {summaryOpen && !summaryZh && !summaryLoading && (
            <p className="mt-2 text-xs text-gray-400 italic">暂无中文摘要。</p>
          )}
        </div>
      )}
    </div>
  );
}
