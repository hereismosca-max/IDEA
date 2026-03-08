'use client';

import { useState } from 'react';
import DateNavigator from './DateNavigator';
import NewsFeed from './NewsFeed';
import SearchBar from './SearchBar';
import SortPicker from './SortPicker';
import MenuBar from '@/components/layout/MenuBar';

/** Format a Date object as "YYYY-MM-DD" (UTC) for the API */
function toUTCDateString(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function HomeFeed() {
  const [selectedDate, setSelectedDate]     = useState<Date>(new Date());
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [search, setSearch]                 = useState('');
  const [sort, setSort]                     = useState<'latest' | 'popular'>('latest');

  const isSearching = search.trim().length > 0;

  // When searching, don't pass a date so the API searches across all dates.
  const dateForFeed = isSearching ? undefined : toUTCDateString(selectedDate);

  return (
    <div>
      <MenuBar activeCategory={selectedCategory} onCategoryChange={setSelectedCategory} />

      {/* ── Navigation row: [SearchBar] [DateNavigator] [SortPicker] ── */}
      <div className="flex items-center gap-3 px-4 border-b border-gray-100">

        {/* Left: search input — flex-1 */}
        <div className="flex-1 py-2">
          <SearchBar value={search} onChange={setSearch} />
        </div>

        {/* Center: date navigator — flex-none; dimmed while searching */}
        <DateNavigator
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          disabled={isSearching}
        />

        {/* Right: sort picker — flex-1, right-aligned */}
        <div className="flex-1 flex justify-end py-2">
          <SortPicker value={sort} onChange={setSort} />
        </div>

      </div>

      {/* ── Article feed ── */}
      <NewsFeed
        date={dateForFeed}
        category={selectedCategory}
        search={isSearching ? search.trim() : undefined}
        sort={sort}
      />
    </div>
  );
}
