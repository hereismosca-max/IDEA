'use client';

import { useState } from 'react';
import DateNavigator from './DateNavigator';
import NewsFeed from './NewsFeed';
import MenuBar from '@/components/layout/MenuBar';

/** Format a Date object as "YYYY-MM-DD" (UTC) for the API */
function toUTCDateString(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function HomeFeed() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  return (
    <div>
      <MenuBar activeCategory={selectedCategory} onCategoryChange={setSelectedCategory} />
      <DateNavigator selectedDate={selectedDate} onDateChange={setSelectedDate} />
      <NewsFeed date={toUTCDateString(selectedDate)} category={selectedCategory} />
    </div>
  );
}
