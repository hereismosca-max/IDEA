'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useAuth } from '@/providers/AuthProvider';
import { useDisplay, type Theme, type FontSize, type Density } from '@/providers/DisplayProvider';
import { updateProfile, fetchUnreadCount } from '@/lib/api';

// ── Settings menu (gear ⚙) ────────────────────────────────────────────────────
// Visible to ALL users (guests + logged-in).
// List-style menu with expandable sub-sections for Account, Language, Display.
// Guests clicking Account or Notifications are redirected to /login.

type ExpandedSection = 'account' | 'language' | 'display' | null;
type DeleteState = 'idle' | 'confirm' | 'deleting';

// ── Small toggle-group component (shared across Display options) ───────────────
function ToggleGroup<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex gap-1">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`flex-1 py-1 text-xs font-medium rounded-md border transition-colors ${
            value === o.value
              ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 border-gray-900 dark:border-gray-100'
              : 'text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500 hover:text-gray-700 dark:hover:text-gray-200'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export default function SettingsMenu() {
  const { user, refreshUser, logout, deleteAccount } = useAuth();
  const { theme, fontSize, density, setTheme, setFontSize, setDensity } = useDisplay();
  const locale = useLocale();
  const router = useRouter();
  const t = useTranslations('settings');

  // ── Dropdown open/close ──────────────────────────────────────────────────
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<ExpandedSection>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  useEffect(() => { if (!open) setExpanded(null); }, [open]);

  // ── Account form state ───────────────────────────────────────────────────
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [pronouns, setPronouns] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [deleteState, setDeleteState] = useState<DeleteState>('idle');

  // ── Unread notification count ────────────────────────────────────────────
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    fetchUnreadCount()
      .then((data) => setUnreadCount(data.count))
      .catch(() => { /* silent */ });
  }, [user]);

  useEffect(() => {
    if (expanded !== 'account') { setDeleteState('idle'); return; }
    if (!user) return;
    setDisplayName(user.display_name);
    setBio(user.bio ?? '');
    setPronouns(user.pronouns ?? '');
    setSaveStatus('idle');
  }, [expanded, user]);

  const handleSaveAccount = useCallback(async () => {
    if (saveStatus === 'saving') return;
    setSaveStatus('saving');
    try {
      await updateProfile({ display_name: displayName.trim() || undefined, bio, pronouns });
      await refreshUser();
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2500);
    } catch {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  }, [saveStatus, displayName, bio, pronouns, refreshUser]);

  const handleDeleteAccount = useCallback(async () => {
    if (deleteState !== 'confirm') return;
    setDeleteState('deleting');
    try {
      await deleteAccount();
      setOpen(false);
      router.push(`/${locale}`);
    } catch {
      setDeleteState('confirm');
    }
  }, [deleteState, deleteAccount, router, locale]);

  const handleLangChange = useCallback(async (newLang: string) => {
    if (user) {
      try {
        await updateProfile({ preferred_lang: newLang });
        await refreshUser();
      } catch { /* silent */ }
    }
    if (newLang !== locale) router.push(`/${newLang}`);
    setOpen(false);
  }, [user, locale, router, refreshUser]);

  // ── Derived ──────────────────────────────────────────────────────────────
  const LANG_BADGES: Record<string, string> = {
    en: 'EN', zh: '中文', 'zh-TW': '繁中', es: 'ES', fr: 'FR', ko: '한', ja: '日',
  };
  const langBadge = LANG_BADGES[locale] ?? 'EN';

  const saveLabel =
    saveStatus === 'saving' ? t('saving') :
    saveStatus === 'saved'  ? t('saved') :
    saveStatus === 'error'  ? t('saveError') :
    t('save');

  const toggleSection = (section: ExpandedSection) =>
    setExpanded((prev) => (prev === section ? null : section));

  return (
    <div ref={menuRef} className="relative">
      {/* Settings toggle button */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={t('title')}
        title={t('title')}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border transition-all text-xs font-medium ${
          open
            ? 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100'
            : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800'
        }`}
      >
        <svg className="w-3.5 h-3.5 flex-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <span className="hidden sm:inline">{t('title')}</span>
      </button>

      {/* ── Dropdown panel ──────────────────────────────────────────────────── */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-72 max-w-[calc(100vw-1rem)] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden py-1">

          {/* ── Account ──────────────────────────────────────────────────────── */}
          <button
            onClick={() => {
              if (!user) { router.push(`/${locale}/login`); setOpen(false); return; }
              toggleSection('account');
            }}
            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
          >
            <svg className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="flex-1 text-sm font-medium text-gray-700 dark:text-gray-200">{t('account')}</span>
            {user ? (
              <svg className={`w-3.5 h-3.5 text-gray-400 dark:text-gray-500 transition-transform flex-none ${expanded === 'account' ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600 flex-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            )}
          </button>

          {expanded === 'account' && user && (
            <div className="px-4 pb-3 bg-gray-50/60 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-700">
              <div className="mb-2.5">
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('displayName')}</label>
                <input value={displayName} onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
              </div>
              <div className="mb-2.5">
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('email')}</label>
                <input value={user.email} readOnly tabIndex={-1}
                  className="w-full px-2.5 py-1.5 text-sm border border-gray-100 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-default select-all" />
              </div>
              <div className="mb-2.5">
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('bio')}</label>
                <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={2} placeholder="…"
                  className="w-full px-2.5 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
              </div>
              <div className="mb-3">
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('pronouns')}</label>
                <input value={pronouns} onChange={(e) => setPronouns(e.target.value)} placeholder={t('pronounsPlaceholder')}
                  className="w-full px-2.5 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
              </div>
              <button onClick={handleSaveAccount} disabled={saveStatus === 'saving'}
                className={`w-full py-1.5 text-sm font-semibold rounded-md transition-colors disabled:opacity-50 ${
                  saveStatus === 'saved' ? 'bg-emerald-600 text-white' :
                  saveStatus === 'error' ? 'bg-red-500 text-white' :
                  'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 hover:bg-gray-700 dark:hover:bg-gray-300'
                }`}>{saveLabel}</button>

              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                {deleteState === 'idle' && (
                  <button onClick={() => setDeleteState('confirm')}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium text-red-400 hover:text-red-600 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                    <svg className="w-3.5 h-3.5 flex-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    {t('deleteAccount')}
                  </button>
                )}
                {(deleteState === 'confirm' || deleteState === 'deleting') && (
                  <div className="rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-2.5">
                    <p className="text-xs text-red-700 dark:text-red-400 font-medium mb-2">{t('deleteConfirmText')}</p>
                    <div className="flex gap-2">
                      <button onClick={() => setDeleteState('idle')} disabled={deleteState === 'deleting'}
                        className="flex-1 py-1 text-xs font-medium border border-gray-300 dark:border-gray-600 rounded-md text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-700 transition-colors disabled:opacity-50">
                        {t('cancel')}
                      </button>
                      <button onClick={handleDeleteAccount} disabled={deleteState === 'deleting'}
                        className="flex-1 py-1 text-xs font-semibold bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50">
                        {deleteState === 'deleting' ? t('deleting') : t('deleteConfirmBtn')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Language ─────────────────────────────────────────────────────── */}
          <button onClick={() => toggleSection('language')}
            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left">
            <svg className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9" />
            </svg>
            <span className="flex-1 text-sm font-medium text-gray-700 dark:text-gray-200">{t('language')}</span>
            <div className="flex items-center gap-1.5 flex-none">
              <span className="text-xs font-semibold bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded-md">{langBadge}</span>
              <svg className={`w-3.5 h-3.5 text-gray-400 dark:text-gray-500 transition-transform ${expanded === 'language' ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </button>

          {expanded === 'language' && (
            <div className="px-4 pb-3 bg-gray-50/60 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-700">
              {([
                { value: 'en',    label: t('langEn')   },
                { value: 'zh',    label: t('langZh')   },
                { value: 'zh-TW', label: t('langZhTW') },
                { value: 'es',    label: t('langEs')   },
                { value: 'fr',    label: t('langFr')   },
                { value: 'ko',    label: t('langKo')   },
                { value: 'ja',    label: t('langJa')   },
              ]).map(({ value, label }) => (
                <button key={value} onClick={() => handleLangChange(value)}
                  className={`w-full text-left flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm transition-colors mb-0.5 ${
                    locale === value
                      ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 font-semibold'
                      : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-200'
                  }`}>
                  <span className={`w-3 h-3 rounded-full border-2 flex-none transition-colors ${
                    locale === value ? 'border-gray-900 dark:border-gray-100 bg-gray-900 dark:bg-gray-100' : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800'
                  }`} />
                  {label}
                </button>
              ))}
            </div>
          )}

          {/* ── Notifications ─────────────────────────────────────────────────── */}
          <button
            onClick={() => {
              if (!user) { router.push(`/${locale}/login`); setOpen(false); return; }
              router.push(`/${locale}/notifications`);
              setOpen(false);
            }}
            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
          >
            <svg className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <span className="flex-1 text-sm font-medium text-gray-700 dark:text-gray-200">{t('notifications')}</span>
            <div className="flex items-center gap-1.5 flex-none">
              {!user ? (
                <svg className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              ) : unreadCount > 0 ? (
                <span className="min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-blue-600 text-white text-[10px] font-bold px-1">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              ) : (
                <svg className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600 flex-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              )}
            </div>
          </button>

          {/* ── Display ───────────────────────────────────────────────────────── */}
          <button onClick={() => toggleSection('display')}
            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left">
            <svg className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <span className="flex-1 text-sm font-medium text-gray-700 dark:text-gray-200">{t('display')}</span>
            <svg className={`w-3.5 h-3.5 text-gray-400 dark:text-gray-500 transition-transform flex-none ${expanded === 'display' ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {expanded === 'display' && (
            <div className="px-4 pb-3 bg-gray-50/60 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-700 space-y-3">
              {/* Theme */}
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">{t('themeLabel')}</p>
                <ToggleGroup<Theme>
                  options={[
                    { value: 'light',  label: t('themeLight')  },
                    { value: 'dark',   label: t('themeDark')   },
                    { value: 'system', label: t('themeSystem') },
                  ]}
                  value={theme}
                  onChange={setTheme}
                />
              </div>
              {/* Font size */}
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">{t('fontSizeLabel')}</p>
                <ToggleGroup<FontSize>
                  options={[
                    { value: 'sm', label: t('fontSizeSm') },
                    { value: 'md', label: t('fontSizeMd') },
                    { value: 'lg', label: t('fontSizeLg') },
                  ]}
                  value={fontSize}
                  onChange={setFontSize}
                />
              </div>
              {/* Density */}
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">{t('densityLabel')}</p>
                <ToggleGroup<Density>
                  options={[
                    { value: 'default', label: t('densityDefault') },
                    { value: 'compact', label: t('densityCompact') },
                  ]}
                  value={density}
                  onChange={setDensity}
                />
              </div>
            </div>
          )}

          {/* ── Sign Out (logged-in only) ──────────────────────────────────────── */}
          {user && (
            <>
              <div className="border-t border-gray-100 dark:border-gray-800 my-1 mx-1" />
              <button onClick={() => { logout(); setOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-left">
                <svg className="w-4 h-4 text-red-400 flex-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span className="text-sm font-medium text-red-500">{t('signOut')}</span>
              </button>
            </>
          )}

        </div>
      )}
    </div>
  );
}
