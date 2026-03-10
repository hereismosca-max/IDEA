'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useAuth } from '@/providers/AuthProvider';
import { useBoard, Board } from '@/providers/BoardProvider';
import SettingsMenu from '@/components/layout/SettingsMenu';
import { updateProfile } from '@/lib/api';

// ── Board labels ──────────────────────────────────────────────────────────────
// Each board shows labels in its own language so the UI feels consistent:
//   en board → all English  ("U.S. News" | "Chinese News")
//   zh board → all Chinese  ("英文资讯"   | "中文资讯")

const BOARD_LABELS: Record<Board, { american: string; chinese: string }> = {
  en: { american: 'U.S. News',  chinese: 'Chinese News' },
  zh: { american: '英文资讯',   chinese: '中文资讯'     },
};

// ── Supported languages — add new entries here to extend the picker ───────────
const LANGUAGES = [
  { code: 'en', label: 'English', char: 'A'  },
  { code: 'zh', label: '中文',    char: '文' },
] as const;

type LangCode = (typeof LANGUAGES)[number]['code'];

// ── Language dropdown (Language ▾) ───────────────────────────────────────────
// Extensible language picker in the TopBar. Adding a new language only requires
// a new entry in the LANGUAGES array above — no component changes needed.
// The button label is translated via next-intl so it reads "Language" in EN
// and "语言" in ZH (and any future locale added to the messages files).
function LangDropdown({
  locale,
  onSelect,
}: {
  locale: string;
  onSelect: (code: LangCode) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const tS  = useTranslations('settings');

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} className="relative flex-none">
      {/* Trigger button: translated "Language" / "语言" label + chevron */}
      <button
        onClick={() => setOpen((o) => !o)}
        title={tS('language')}
        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md border text-xs font-medium transition-all select-none ${
          open
            ? 'bg-gray-100 border-gray-300 text-gray-900'
            : 'border-gray-200 text-gray-500 hover:border-gray-400 hover:text-gray-700 hover:bg-gray-50'
        }`}
      >
        {tS('language')}
        {/* Chevron */}
        <svg
          className={`w-3 h-3 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-36 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1 overflow-hidden">
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              onClick={() => { onSelect(l.code); setOpen(false); }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors text-left ${
                locale === l.code
                  ? 'bg-gray-50 text-gray-900 font-semibold'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              {/* Radio dot */}
              <span
                className={`w-2.5 h-2.5 rounded-full border-2 flex-none transition-colors ${
                  locale === l.code ? 'border-blue-600 bg-blue-600' : 'border-gray-300'
                }`}
              />
              <span className="font-mono text-xs text-gray-400 w-4 flex-none">{l.char}</span>
              {l.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function TopBar() {
  const locale                          = useLocale();
  const router                          = useRouter();
  const { user, isLoading, refreshUser} = useAuth();
  const { board, setBoard }             = useBoard();
  const t                               = useTranslations('nav');

  // Board labels depend on the UI locale (not the selected board) so the
  // switcher always reads in the current interface language.
  const labels = BOARD_LABELS[(locale as Board)] ?? BOARD_LABELS['en'];

  // ── Language change handler — used by LangDropdown ──────────────────────
  // Saves the preference when logged in, then navigates to the new locale.
  // Adding a new language only requires adding it to the LANGUAGES array above.
  const handleLangChange = useCallback(async (next: LangCode) => {
    if (next === locale) return; // already on this locale
    if (user) {
      try {
        await updateProfile({ preferred_lang: next });
        await refreshUser();
      } catch { /* silent — navigation still happens */ }
    }
    router.push(`/${next}`);
  }, [locale, user, router, refreshUser]);

  // ── Sync preferred_lang → URL locale on login ────────────────────────────
  // When a user logs in (user transitions from null → set) and they have a
  // saved language preference, navigate to the matching URL locale.
  useEffect(() => {
    if (isLoading || !user) return;
    if (user.preferred_lang === 'en' && locale !== 'en') router.push('/en');
    else if (user.preferred_lang === 'zh' && locale !== 'zh') router.push('/zh');
    // 'default' → no navigation; board drives the content language
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, isLoading]); // only re-run when the user identity changes

  return (
    <header className="border-b border-gray-200 bg-white sticky top-0 z-50">
      {/*
        3-column layout:
          [flex-1  Left: Logo]  [Center: Board switcher]  [flex-1  Right: User]
        The equal flex-1 wings keep the switcher visually centred.
      */}
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center">

        {/* ── Left: Logo ───────────────────────────────────────────────────── */}
        <div className="flex-1">
          <Link
            href={`/${locale}`}
            className="inline-flex flex-col leading-none hover:opacity-75 transition-opacity"
          >
            {/* Wordmark: "Fin" in charcoal, "Lens" in blue — highlights the lens metaphor */}
            <span className="text-xl font-black tracking-tight text-gray-900">
              Fin<span className="text-blue-600">Lens</span>
            </span>
            {/* Tagline: uppercase + wide tracking for a premium, editorial feel */}
            <span className="hidden sm:block text-[9px] font-medium tracking-[0.18em] text-gray-400 uppercase mt-0.5">
              Your scope to see the world
            </span>
          </Link>
        </div>

        {/* ── Center: Board (region) switcher ──────────────────────────────── */}
        <div className="flex items-center gap-0.5 rounded-lg border border-gray-200 bg-white p-0.5 select-none">
          {/* American board button */}
          <button
            onClick={() => setBoard('en')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
              board === 'en'
                ? 'bg-gray-900 text-white'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            {labels.american}
          </button>

          {/* Chinese board button */}
          <button
            onClick={() => setBoard('zh')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
              board === 'zh'
                ? 'bg-gray-900 text-white'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            {labels.chinese}
          </button>
        </div>

        {/* ── Right: User section ───────────────────────────────────────────── */}
        <div className="flex-1 flex justify-end min-w-0">
          {isLoading ? (
            // Skeleton while checking session
            <div className="h-8 w-20 bg-gray-100 rounded-md animate-pulse" />
          ) : user ? (
            // Logged in: Saved link + display name + Lang toggle + Settings
            <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
              <Link
                href={`/${locale}/saved`}
                className="text-sm text-gray-500 hover:text-gray-900 transition-colors flex-none"
              >
                {t('saved')}
              </Link>
              <span className="text-gray-300 hidden sm:inline">|</span>
              {/* Truncate long display names on small screens */}
              <span className="text-sm font-medium text-gray-700 truncate max-w-[60px] sm:max-w-[140px]">
                {user.display_name}
              </span>
              {/* Language toggle — A/文 one-click switcher */}
              <LangDropdown locale={locale} onSelect={handleLangChange} />
              <SettingsMenu />
            </div>
          ) : (
            // Not logged in: Lang toggle + Settings + Sign In
            <div className="flex items-center gap-2">
              <LangDropdown locale={locale} onSelect={handleLangChange} />
              <SettingsMenu />
              <Link
                href={`/${locale}/login`}
                className="text-sm text-gray-600 hover:text-gray-900 border border-gray-200 px-3 py-1.5 rounded-md transition-colors hover:border-gray-400"
              >
                {t('signIn')}
              </Link>
            </div>
          )}
        </div>

      </div>
    </header>
  );
}
