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
 * Return a Date set to LOCAL midnight (00:00:00) for the given date's local calendar day.
 * This is the correct unit for user-facing date navigation: "today" means today in the
 * user's timezone, not UTC. The resulting Date's .toISOString() gives the UTC equivalent
 * of that local midnight, which is what we pass to the backend as date_from/date_to.
 */
function toLocalMidnight(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export default function DateNavigator({ selectedDate, onDateChange, disabled = false }: DateNavigatorProps) {
  const locale = useLocale();
  const t      = useTranslations('nav');

  const [calendarOpen, setCalendarOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // All comparisons use local-timezone midnight dates so "today" and "yesterday"
  // match what the user sees on their device clock.
  const todayLocal    = toLocalMidnight(new Date());
  const selectedLocal = toLocalMidnight(selectedDate);
  const isToday       = selectedLocal.getTime() === todayLocal.getTime();

  // Map next-intl locale code → Intl locale string for date formatting
  const INTL_LOCALES: Record<string, string> = {
    en: 'en-US', zh: 'zh-CN', 'zh-TW': 'zh-TW',
    es: 'es-ES', fr: 'fr-FR', ko: 'ko-KR', ja: 'ja-JP',
  };
  const intlLocale = INTL_LOCALES[locale] ?? 'en-US';

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
    // Local-date arithmetic: new Date(year, month, day ± delta) handles month/year
    // rollovers correctly and stays in the user's local timezone.
    const next = new Date(
      selectedLocal.getFullYear(),
      selectedLocal.getMonth(),
      selectedLocal.getDate() + delta,
    );
    if (next.getTime() <= todayLocal.getTime()) {
      onDateChange(next);
      setCalendarOpen(false);
    }
  };

  const formatLabel = (date: Date): string => {
    const local    = toLocalMidnight(date);
    const diffDays = Math.round((todayLocal.getTime() - local.getTime()) / 86_400_000);
    // No timeZone override → uses browser local timezone so the label matches the
    // local date the user picked.
    const short = local.toLocaleDateString(intlLocale, { month: 'short', day: 'numeric' });
    if (diffDays === 0) return `${t('today')} · ${short}`;
    if (diffDays === 1) return `${t('yesterday')} · ${short}`;
    return local.toLocaleDateString(intlLocale, {
      weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
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
            selected={selectedLocal}
            defaultMonth={selectedLocal}
            disabled={{ after: todayLocal }}
            onSelect={(date) => {
              if (date) {
                // DayPicker returns a local-timezone Date. We normalise to local midnight
                // so the time component is always 00:00:00 (no partial-day drift).
                const localDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
                onDateChange(localDate);
                setCalendarOpen(false);
              }
            }}
          />
        </div>
      )}
    </div>
  );
}
