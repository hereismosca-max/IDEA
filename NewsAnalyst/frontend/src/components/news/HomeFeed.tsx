'use client';

import { useState, useCallback } from 'react';
import DateNavigator from './DateNavigator';
import NewsFeed from './NewsFeed';
import SearchBar from './SearchBar';
import MenuBar from '@/components/layout/MenuBar';
import MarketTicker from '@/components/layout/MarketTicker';
import { useBoard } from '@/providers/BoardProvider';

/**
 * Compute the UTC ISO timestamps for the start and end of a LOCAL calendar day.
 *
 * Example (UTC-8 user selecting March 8):
 *   Local midnight March 8  = 2026-03-08T08:00:00Z  → date_from
 *   Local midnight March 9  = 2026-03-09T08:00:00Z  → date_to
 *
 * The backend filters: published_at >= date_from AND published_at < date_to,
 * which correctly includes all articles published on March 8 in the user's timezone.
 */
function toLocalDayRange(date: Date): { dateFrom: string; dateTo: string } {
  const y = date.getFullYear();
  const m = date.getMonth();
  const d = date.getDate();
  const dateFrom = new Date(y, m, d).toISOString();      // local midnight → UTC ISO
  const dateTo   = new Date(y, m, d + 1).toISOString();  // next local midnight → UTC ISO
  return { dateFrom, dateTo };
}

/**
 * Read the persisted date from sessionStorage (tab-scoped: survives F5,
 * cleared when the tab is closed so a fresh open always starts at today).
 * Returns a LOCAL midnight Date so DateNavigator comparisons stay in local time.
 */
function getInitialDate(): Date {
  const now = new Date();
  const todayLocal = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (typeof window !== 'undefined') {
    const iso = sessionStorage.getItem('newsanalyst_date');
    if (iso) {
      const d = new Date(iso);
      const dLocal = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      // Accept only valid dates that aren't in the future (local comparison)
      if (!isNaN(d.getTime()) && dLocal <= todayLocal) return dLocal;
    }
  }
  return todayLocal;
}

export default function HomeFeed() {
  const { board }                                = useBoard();
  // Initialise from sessionStorage so F5 preserves the selected day;
  // a new tab or re-open always lands on today (sessionStorage cleared on close).
  const [selectedDate, setSelectedDate]         = useState<Date>(getInitialDate);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [search, setSearch]                     = useState('');

  const isSearching = search.trim().length > 0;

  // When searching, don't pass date range so the API searches across all dates.
  const dateRange = isSearching ? undefined : toLocalDayRange(selectedDate);

  // Persist the chosen date within this tab session
  const handleDateChange = useCallback((date: Date) => {
    setSelectedDate(date);
    sessionStorage.setItem('newsanalyst_date', date.toISOString());
  }, []);

  return (
    <div>
      {/* ── Market ticker — sits between TopBar and MenuBar ── */}
      <MarketTicker />

      <MenuBar activeCategory={selectedCategory} onCategoryChange={setSelectedCategory} />

      {/* ── Navigation row: [SearchBar] [DateNavigator] ── */}
      {/* Right flex-1 spacer keeps DateNavigator visually centered */}
      <div className="flex items-center gap-3 px-4 border-b border-gray-100">

        {/* Left: search input — flex-1 */}
        <div className="flex-1 py-2">
          <SearchBar value={search} onChange={setSearch} />
        </div>

        {/* Center: date navigator — flex-none; dimmed while searching */}
        <DateNavigator
          selectedDate={selectedDate}
          onDateChange={handleDateChange}
          disabled={isSearching}
        />

        {/* Right spacer — keeps DateNavigator centered (mirrors left flex-1) */}
        <div className="flex-1" />

      </div>

      {/* ── Article feed ── */}
      <NewsFeed
        dateFrom={dateRange?.dateFrom}
        dateTo={dateRange?.dateTo}
        category={selectedCategory}
        search={isSearching ? search.trim() : undefined}
        language={board}
      />
    </div>
  );
}
