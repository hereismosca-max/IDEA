'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { fetchMarketSnapshot, fetchHeadlines, translateArticle } from '@/lib/api';
import { MarketIndicator, Article } from '@/types';
import { useBoard } from '@/providers/BoardProvider';

// ── Formatting helpers ────────────────────────────────────────────────────────

function formatPrice(price: number): string {
  if (price >= 1000) {
    return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 3 });
}

// ── Skeleton card ─────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="flex-none flex flex-col gap-1 px-3 py-2 rounded-lg bg-gray-50 min-w-[88px] animate-pulse">
      <div className="h-2.5 w-14 bg-gray-200 rounded" />
      <div className="h-4 w-16 bg-gray-200 rounded" />
      <div className="h-2.5 w-10 bg-gray-200 rounded" />
    </div>
  );
}

// ── Single indicator card ─────────────────────────────────────────────────────

function IndicatorCard({ ind }: { ind: MarketIndicator }) {
  const up   = ind.change !== null && ind.change >= 0;
  const down = ind.change !== null && ind.change < 0;

  const bg    = up ? 'bg-emerald-50'    : down ? 'bg-red-50'    : 'bg-gray-50';
  const color = up ? 'text-emerald-600' : down ? 'text-red-500' : 'text-gray-400';
  const sign  = up ? '▲' : down ? '▼' : '';

  return (
    <div className={`flex-none flex flex-col items-start px-3 py-2 rounded-lg ${bg} min-w-[88px]`}>
      {/* Label */}
      <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide leading-none mb-1">
        {ind.label}
      </span>
      {/* Price */}
      <span className="text-sm font-bold text-gray-900 leading-snug tabular-nums">
        {ind.price !== null ? formatPrice(ind.price) : '—'}
      </span>
      {/* Change % */}
      {ind.change_pct !== null ? (
        <span className={`text-[10px] font-semibold leading-none mt-0.5 ${color}`}>
          {sign} {Math.abs(ind.change_pct).toFixed(2)}%
        </span>
      ) : (
        <span className="text-[10px] text-gray-300 leading-none mt-0.5">—</span>
      )}
    </div>
  );
}

// ── Headline ticker (right side) ──────────────────────────────────────────────

function HeadlineTicker() {
  const locale                = useLocale();
  const { board }             = useBoard();
  const [items, setItems]     = useState<Article[]>([]);
  // Maps article.id → translated title (populated in background when locale != 'en')
  const [titleMap, setTitleMap] = useState<Record<string, string>>({});
  const [idx, setIdx]         = useState(0);
  const [visible, setVisible] = useState(true);

  const needsTranslation = locale !== 'en';

  // Fetch high-impact headlines whenever the board (language) changes.
  // Uses the /articles/headlines endpoint which prioritises global/national scale events.
  // When locale is non-English, also fetch title translations for all headlines in parallel.
  useEffect(() => {
    let cancelled = false; // cleanup flag prevents stale state updates after unmount/re-run
    setItems([]);
    setTitleMap({});
    setIdx(0);
    setVisible(true);
    fetchHeadlines(board, 5)
      .then(articles => {
        if (cancelled) return;
        setItems(articles);
        if (needsTranslation) {
          // Fire translate calls for every headline in parallel; update map as each resolves
          articles.forEach(a => {
            translateArticle(a.id, locale)
              .then(t => {
                if (!cancelled && t.title) {
                  setTitleMap(prev => ({ ...prev, [a.id]: t.title! }));
                }
              })
              .catch(() => {}); // silent fallback — English title stays
          });
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [board, locale]);

  // Auto-cycle: fade out → swap → fade in every 4.5 s
  useEffect(() => {
    if (items.length < 2) return;
    const id = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIdx(i => (i + 1) % items.length);
        setVisible(true);
      }, 380); // matches the CSS transition duration
    }, 4500);
    return () => clearInterval(id);
  }, [items.length]);

  // ── Skeleton while loading ──
  if (items.length === 0) {
    return (
      <div className="flex-1 min-w-0 md:pl-4 flex flex-col justify-center gap-1.5 py-1">
        <div className="h-2.5 bg-gray-100 rounded w-16 animate-pulse" />
        <div className="h-3 bg-gray-100 rounded w-full animate-pulse" />
        <div className="h-3 bg-gray-100 rounded w-4/5 animate-pulse" />
      </div>
    );
  }

  const article      = items[idx];
  // Use translated title if available (populated async); fall back to English
  const displayTitle = (needsTranslation && titleMap[article.id]) || article.title;

  return (
    <div className="flex-1 min-w-0 md:pl-4 overflow-hidden flex flex-col justify-center py-1">
      {/* Small label row: source + counter */}
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wide leading-none">
          {article.source.name}
        </span>
        <span className="text-[10px] text-gray-300 leading-none tabular-nums">
          {idx + 1} / {items.length}
        </span>
      </div>

      {/* Headline — fades + slides on cycle */}
      <Link
        href={`/${locale}/article/${article.id}`}
        className="group block"
        style={{
          opacity:    visible ? 1 : 0,
          transform:  visible ? 'translateY(0px)' : 'translateY(-7px)',
          transition: 'opacity 0.35s ease, transform 0.35s ease',
        }}
      >
        <p className="text-xs font-medium text-gray-800 line-clamp-2 leading-snug group-hover:text-blue-600 transition-colors">
          {displayTitle}
        </p>
      </Link>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function MarketTicker() {
  const [indicators, setIndicators] = useState<MarketIndicator[]>([]);
  const [loading,    setLoading]    = useState(true);

  const load = async () => {
    try {
      const data = await fetchMarketSnapshot();
      setIndicators(data.indicators);
    } catch {
      // Silently fail — a broken ticker shouldn't break the page
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 60_000); // 60 s polling — market data updates ~1 min; 15 s was excessive
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="border-b border-gray-100 bg-white">
      <div className="max-w-7xl mx-auto px-4 py-2">

        {/* ── Mobile-only: indicator cards row (horizontally scrollable) ── */}
        <div className="flex md:hidden items-center gap-2 overflow-x-auto scrollbar-none pb-2">
          {loading ? (
            [...Array(6)].map((_, i) => <SkeletonCard key={i} />)
          ) : (
            indicators.map(ind => <IndicatorCard key={ind.symbol} ind={ind} />)
          )}
        </div>

        {/* ── Main row: [desktop cards] [divider] [HeadlineTicker] ─────── */}
        <div className="flex items-center">

          {/* Desktop: market cards */}
          <div className="hidden md:flex items-center gap-2 flex-none overflow-x-auto scrollbar-none">
            {loading ? (
              [...Array(6)].map((_, i) => <SkeletonCard key={i} />)
            ) : (
              indicators.map(ind => <IndicatorCard key={ind.symbol} ind={ind} />)
            )}
          </div>

          {/* Divider — desktop only */}
          <div className="hidden md:block w-px self-stretch bg-gray-200 flex-none mx-4" />

          {/* Headline ticker — full width on mobile, right side on desktop */}
          <HeadlineTicker />

        </div>

      </div>
    </div>
  );
}
