'use client';

import { useState, useCallback } from 'react';
import DateNavigator from './DateNavigator';
import NewsFeed from './NewsFeed';
import SearchBar from './SearchBar';
import MenuBar from '@/components/layout/MenuBar';
import MarketTicker from '@/components/layout/MarketTicker';
import { useBoard } from '@/providers/BoardProvider';

/** Format a Date object as "YYYY-MM-DD" (UTC) for the API */
function toUTCDateString(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Read the persisted date from sessionStorage (tab-scoped: survives F5,
 * cleared when the tab is closed so a fresh open always starts at today).
 */
function getInitialDate(): Date {
  if (typeof window !== 'undefined') {
    const iso = sessionStorage.getItem('newsanalyst_date');
    if (iso) {
      const d = new Date(iso);
      // Validate: real date, not in the future
      if (!isNaN(d.getTime()) && d <= new Date()) return d;
    }
  }
  return new Date();
}

export default function HomeFeed() {
  const { board }                                = useBoard();
  // Initialise from sessionStorage so F5 preserves the selected day;
  // a new tab or re-open always lands on today (sessionStorage cleared on close).
  const [selectedDate, setSelectedDate]         = useState<Date>(getInitialDate);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [search, setSearch]                     = useState('');

  const isSearching = search.trim().length > 0;

  // When searching, don't pass a date so the API searches across all dates.
  const dateForFeed = isSearching ? undefined : toUTCDateString(selectedDate);

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
        date={dateForFeed}
        category={selectedCategory}
        search={isSearching ? search.trim() : undefined}
        language={board}
      />
    </div>
  );
}
