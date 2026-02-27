'use client';

import { useState, useRef, useEffect } from 'react';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/style.css';

interface DateNavigatorProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
}

export default function DateNavigator({ selectedDate, onDateChange }: DateNavigatorProps) {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const selected = new Date(selectedDate);
  selected.setHours(0, 0, 0, 0);

  const isToday = selected.getTime() === today.getTime();

  // Close calendar when clicking outside
  useEffect(() => {
    if (!calendarOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setCalendarOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [calendarOpen]);

  const navigate = (delta: number) => {
    const next = new Date(selected);
    next.setDate(next.getDate() + delta);
    if (next <= today) {
      onDateChange(next);
      setCalendarOpen(false);
    }
  };

  const formatLabel = (date: Date): string => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const diffDays = Math.round((today.getTime() - d.getTime()) / 86_400_000);
    const short = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    if (diffDays === 0) return `Today · ${short}`;
    if (diffDays === 1) return `Yesterday · ${short}`;
    return date.toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
    });
  };

  return (
    <div className="relative flex items-center justify-center gap-2 py-3 select-none">

      {/* ← Previous day */}
      <button
        onClick={() => navigate(-1)}
        className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-colors"
        aria-label="Previous day"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {/* Date label — click to open calendar */}
      <button
        onClick={() => setCalendarOpen((o) => !o)}
        className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg font-medium text-gray-800 hover:bg-gray-100 transition-colors text-sm"
        aria-label="Open date picker"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span>{formatLabel(selectedDate)}</span>
        <svg xmlns="http://www.w3.org/2000/svg" className={`h-3 w-3 text-gray-400 transition-transform ${calendarOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* → Next day (disabled when viewing today) */}
      <button
        onClick={() => navigate(1)}
        disabled={isToday}
        className={`p-2 rounded-lg transition-colors ${
          isToday
            ? 'text-gray-300 cursor-not-allowed'
            : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'
        }`}
        aria-label="Next day"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* Calendar popup */}
      {calendarOpen && (
        <div
          ref={popoverRef}
          className="absolute top-full mt-1 z-50 bg-white rounded-xl shadow-xl border border-gray-100"
        >
          <DayPicker
            mode="single"
            selected={selectedDate}
            defaultMonth={selectedDate}
            disabled={{ after: today }}
            onSelect={(date) => {
              if (date) {
                onDateChange(date);
                setCalendarOpen(false);
              }
            }}
          />
        </div>
      )}
    </div>
  );
}
