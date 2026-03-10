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

type SortMode = 'latest' | 'impact';

export default function HomeFeed() {
  const { board }                                = useBoard();
  // Initialise from sessionStorage so F5 preserves the selected day;
  // a new tab or re-open always lands on today (sessionStorage cleared on close).
  const [selectedDate, setSelectedDate]         = useState<Date>(getInitialDate);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [search, setSearch]                     = useState('');
  const [sort, setSort]                         = useState<SortMode>('latest');

  const isSearching = search.trim().length > 0;

  // When searching, don't pass date range so the API searches across all dates.
  // In Impact mode the date filter still applies — sort by impact within the selected day.
  const dateRange = isSearching ? undefined : toLocalDayRange(selectedDate);

  // Persist the chosen date within this tab session
  const handleDateChange = useCallback((date: Date) => {
    setSelectedDate(date);
    sessionStorage.setItem('newsanalyst_date', date.toISOString());
  }, []);

  // Segmented sort control — JSX node reused in both desktop and mobile slots
  const sortToggle = (
    <div className="flex items-center gap-0.5 bg-gray-100 rounded-full p-0.5">
      {(['latest', 'impact'] as const).map((s) => (
        <button
          key={s}
          onClick={() => setSort(s)}
          className={`px-3 py-1 text-xs font-medium rounded-full transition-all ${
            sort === s
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          {s === 'latest' ? 'Latest' : '⚡ Impact'}
        </button>
      ))}
    </div>
  );

  return (
    <div>
      {/* ── Market ticker — sits between TopBar and MenuBar ── */}
      <MarketTicker />

      <MenuBar activeCategory={selectedCategory} onCategoryChange={setSelectedCategory} />

      {/* ── Navigation row: [SearchBar] [DateNavigator] [SortToggle] ── */}
      {/* Mobile: SearchBar full-width top row, DateNavigator + SortToggle below. */}
      {/* md+: single flex row with right section holding the sort toggle.        */}
      <div className="border-b border-gray-100">
        <div className="px-4 flex flex-col md:flex-row md:items-center md:gap-3">

          {/* SearchBar — full width on mobile, flex-1 on md+ */}
          <div className="flex-1 py-2">
            <SearchBar value={search} onChange={setSearch} />
          </div>

          {/* DateNavigator — centred below search on mobile, inline on md+ */}
          <div className="flex justify-center pb-2 md:pb-0">
            <DateNavigator
              selectedDate={selectedDate}
              onDateChange={handleDateChange}
              disabled={isSearching}
            />
          </div>

          {/* Right section — sort toggle (desktop: right-aligned flex-1) */}
          <div className="hidden md:flex flex-1 justify-end items-center">
            {sortToggle}
          </div>

        </div>

        {/* Sort toggle — mobile only, sits below the date row */}
        <div className="flex justify-center pb-2 md:hidden">
          {sortToggle}
        </div>
      </div>

      {/* ── Article feed ── */}
      <NewsFeed
        dateFrom={dateRange?.dateFrom}
        dateTo={dateRange?.dateTo}
        category={selectedCategory}
        search={isSearching ? search.trim() : undefined}
        sort={sort}
        language={board}
      />
    </div>
  );
}
