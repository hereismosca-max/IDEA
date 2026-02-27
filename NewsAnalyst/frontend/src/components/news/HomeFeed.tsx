'use client';

import { useState } from 'react';
import DateNavigator from './DateNavigator';
import NewsFeed from './NewsFeed';

/** Format a Date object as "YYYY-MM-DD" (UTC) for the API */
function toUTCDateString(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function HomeFeed() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  return (
    <div>
      <DateNavigator selectedDate={selectedDate} onDateChange={setSelectedDate} />
      <NewsFeed date={toUTCDateString(selectedDate)} />
    </div>
  );
}
