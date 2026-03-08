'use client';

import { useEffect, useState } from 'react';
import { fetchMarketSnapshot } from '@/lib/api';
import { MarketIndicator } from '@/types';

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

  const bg    = up ? 'bg-emerald-50'   : down ? 'bg-red-50'    : 'bg-gray-50';
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
    const id = setInterval(load, 60_000); // refresh every 60 s
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="border-b border-gray-100 bg-white">
      <div className="max-w-7xl mx-auto px-4 py-2 flex items-center gap-2 overflow-x-auto scrollbar-none">
        {loading ? (
          <>
            {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
          </>
        ) : indicators.length > 0 ? (
          <>
            {indicators.map((ind) => <IndicatorCard key={ind.symbol} ind={ind} />)}
          </>
        ) : null}
      </div>
    </div>
  );
}
