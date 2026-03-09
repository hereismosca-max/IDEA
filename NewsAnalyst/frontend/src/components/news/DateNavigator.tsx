'use client';

import { useState, useRef, useEffect } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/style.css';

interface DateNavigatorProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  /** When true, the navigator is visually dimmed and non-interactive (e.g. when search is active). */
  disabled?: boolean;
}

/**
 * Return a Date object set to UTC midnight for the given date's UTC calendar day.
 * This ensures all date comparisons and arithmetic happen in UTC, avoiding the
 * off-by-one timezone bug that occurs when local midnight ≠ UTC midnight (e.g. UTC+8).
 */
function toUTCMidnight(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export default function DateNavigator({ selectedDate, onDateChange, disabled = false }: DateNavigatorProps) {
  const locale = useLocale();
  const t      = useTranslations('nav');

  const [calendarOpen, setCalendarOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // All comparisons and navigation run in UTC to prevent timezone drift.
  // Example: UTC+8 local midnight = UTC "previous day" 16:00 — using local
  // arithmetic on a selectedDate causes the queried UTC date to shift by -1.
  const todayUTC    = toUTCMidnight(new Date());
  const selectedUTC = toUTCMidnight(selectedDate);
  const isToday     = selectedUTC.getTime() === todayUTC.getTime();

  // Map next-intl locale code → Intl locale string for date formatting
  const intlLocale = locale === 'zh' ? 'zh-CN' : 'en-US';

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
    // Date.UTC arithmetic stays in UTC — no local timezone shift possible.
    const next = new Date(Date.UTC(
      selectedUTC.getUTCFullYear(),
      selectedUTC.getUTCMonth(),
      selectedUTC.getUTCDate() + delta,
    ));
    if (next.getTime() <= todayUTC.getTime()) {
      onDateChange(next);
      setCalendarOpen(false);
    }
  };

  const formatLabel = (date: Date): string => {
    // Compare UTC dates so "today" / "yesterday" labels match what the feed queries.
    const utcDate  = toUTCMidnight(date);
    const diffDays = Math.round((todayUTC.getTime() - utcDate.getTime()) / 86_400_000);
    // Display the UTC date (timeZone:'UTC') so the label matches the feed content.
    const short = utcDate.toLocaleDateString(intlLocale, {
      month: 'short', day: 'numeric', timeZone: 'UTC',
    });
    if (diffDays === 0) return `${t('today')} · ${short}`;
    if (diffDays === 1) return `${t('yesterday')} · ${short}`;
    return utcDate.toLocaleDateString(intlLocale, {
      weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC',
    });
  };

  return (
    <div className={`relative flex items-center justify-center gap-2 py-3 select-none transition-opacity ${disabled ? 'opacity-40 pointer-events-none' : ''}`}>

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
            selected={selectedUTC}
            defaultMonth={selectedUTC}
            disabled={{ after: todayUTC }}
            onSelect={(date) => {
              if (date) {
                // DayPicker gives a local-timezone Date; convert to UTC midnight of
                // the same calendar date so we stay in UTC space consistently.
                const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
                onDateChange(utcDate);
                setCalendarOpen(false);
              }
            }}
          />
        </div>
      )}
    </div>
  );
}
