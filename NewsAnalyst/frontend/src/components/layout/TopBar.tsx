'use client';

import Link from 'next/link';
import { useCallback, useEffect } from 'react';
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

// ── Language toggle button (A/文) ─────────────────────────────────────────────
// One-click switcher placed directly in the TopBar.  The active locale's
// character is rendered at full opacity; the target character is dimmed so the
// user can see at a glance which language they're currently in and what they'll
// switch to.
function LangToggleButton({ locale, onClick }: { locale: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title={locale === 'zh' ? 'Switch to English' : '切换为中文'}
      className="flex items-center gap-0.5 px-2 py-1.5 rounded-md border border-gray-200 hover:border-gray-400 hover:bg-gray-50 transition-all flex-none select-none"
    >
      {/* "A" represents Latin / English; "文" represents Chinese */}
      <span className={`text-xs font-bold leading-none ${locale === 'en' ? 'text-gray-900' : 'text-gray-400'}`}>A</span>
      <span className="text-[10px] text-gray-300 leading-none">/</span>
      <span className={`text-xs font-bold leading-none ${locale === 'zh' ? 'text-gray-900' : 'text-gray-400'}`}>文</span>
    </button>
  );
}

export default function TopBar() {
  const locale                          = useLocale();
  const router                          = useRouter();
  const { user, isLoading, refreshUser} = useAuth();
  const { board, setBoard }             = useBoard();
  const t                               = useTranslations('nav');

  const labels = BOARD_LABELS[board];

  // ── One-click language toggle ─────────────────────────────────────────────
  // Mirrors the logic inside SettingsMenu so users can switch without opening it.
  const handleLangToggle = useCallback(async () => {
    const next = locale === 'zh' ? 'en' : 'zh';
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
              <LangToggleButton locale={locale} onClick={handleLangToggle} />
              <SettingsMenu />
            </div>
          ) : (
            // Not logged in: Lang toggle + Settings + Sign In
            <div className="flex items-center gap-2">
              <LangToggleButton locale={locale} onClick={handleLangToggle} />
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
