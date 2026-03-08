'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { useAuth } from '@/providers/AuthProvider';
import { useBoard, Board } from '@/providers/BoardProvider';
import SettingsMenu from '@/components/layout/SettingsMenu';

// ── Board labels ──────────────────────────────────────────────────────────────
// Labels are bilingual: when the Chinese board is active, the toggle flips to Chinese characters.

const BOARD_LABELS: Record<Board, { american: string; chinese: string }> = {
  en: { american: 'American', chinese: 'Chinese'  },
  zh: { american: '英文板块', chinese: '中文板块' },
};

export default function TopBar() {
  const locale               = useLocale();
  const router               = useRouter();
  const { user, logout, isLoading } = useAuth();
  const { board, setBoard }  = useBoard();

  const labels = BOARD_LABELS[board];

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
            className="text-xl font-bold text-gray-900 tracking-tight hover:opacity-80 transition-opacity"
          >
            NewsAnalyst
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
        <div className="flex-1 flex justify-end">
          {isLoading ? (
            // Skeleton while checking session
            <div className="h-8 w-20 bg-gray-100 rounded-md animate-pulse" />
          ) : user ? (
            // Logged in: Saved link + display name + Settings + Sign Out
            <div className="flex items-center gap-3">
              <Link
                href={`/${locale}/saved`}
                className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
              >
                Saved
              </Link>
              <span className="text-gray-300">|</span>
              <span className="text-sm font-medium text-gray-700">
                {user.display_name}
              </span>
              {/* Settings hamburger menu */}
              <SettingsMenu />
              <button
                onClick={logout}
                className="text-sm text-gray-500 hover:text-gray-900 border border-gray-200 px-3 py-1.5 rounded-md transition-colors hover:border-gray-400"
              >
                Sign Out
              </button>
            </div>
          ) : (
            // Not logged in
            <Link
              href={`/${locale}/login`}
              className="text-sm text-gray-600 hover:text-gray-900 border border-gray-200 px-3 py-1.5 rounded-md transition-colors hover:border-gray-400"
            >
              Sign In
            </Link>
          )}
        </div>

      </div>
    </header>
  );
}
