'use client';

import Link from 'next/link';
import { useLocale } from 'next-intl';
import { Article } from '@/types';
import SaveButton from '@/components/article/SaveButton';

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

  // 1–3 weeks (7–27 days) → "X weeks Y days Z h W min ago"
  // At 4 weeks (28 days) we switch to months.
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

  // 1–11 months (28–364 days) → "X months Y weeks Z days H h M min ago"
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

  // ≥ 1 year → "X years Y months Z weeks D days H h M min ago"
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

  // Show AI summary if available, otherwise fall back to raw snippet
  const displayText = article.ai_summary || article.content_snippet;

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

        {/* Title */}
        <h2 className="text-sm font-semibold text-gray-900 leading-snug mb-2 line-clamp-2 group-hover:text-blue-700 transition-colors">
          {article.title}
        </h2>

        {/* Summary / Snippet */}
        {displayText && (
          <p className="text-xs text-gray-500 leading-relaxed line-clamp-3">{displayText}</p>
        )}

        {/* AI score badge — visible only when score exists (Phase 3) */}
        {article.ai_score !== null && (
          <div className="mt-3 flex items-center gap-1">
            <span className="text-xs text-gray-400">Relevance</span>
            <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-400 rounded-full"
                style={{ width: `${Math.round(article.ai_score * 100)}%` }}
              />
            </div>
          </div>
        )}
      </Link>
    </div>
  );
}
