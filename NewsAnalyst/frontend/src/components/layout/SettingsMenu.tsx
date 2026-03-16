'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useAuth } from '@/providers/AuthProvider';
import { updateProfile } from '@/lib/api';

// ── Settings menu (hamburger ≡) ────────────────────────────────────────────────
// Visible to ALL users (guests + logged-in).
// List-style menu with expandable sub-sections for Account and Language.
// Guests clicking Account or Notifications are redirected to /login.

type ExpandedSection = 'account' | 'language' | null;
type DeleteState = 'idle' | 'confirm' | 'deleting';

export default function SettingsMenu() {
  const { user, refreshUser, logout, deleteAccount } = useAuth();
  const locale = useLocale();
  const router = useRouter();
  const t = useTranslations('settings');

  // ── Dropdown open/close ──────────────────────────────────────────────────
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<ExpandedSection>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Reset expanded section when menu closes
  useEffect(() => {
    if (!open) setExpanded(null);
  }, [open]);

  // ── Account form state (only used when logged in) ────────────────────────
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [pronouns, setPronouns] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [deleteState, setDeleteState] = useState<DeleteState>('idle');

  // Sync form when Account section expands; reset delete state when it collapses
  useEffect(() => {
    if (expanded !== 'account') { setDeleteState('idle'); return; }
    if (!user) return;
    setDisplayName(user.display_name);
    setBio(user.bio ?? '');
    setPronouns(user.pronouns ?? '');
    setSaveStatus('idle');
  }, [expanded, user]);

  // ── Save account changes ─────────────────────────────────────────────────
  const handleSaveAccount = useCallback(async () => {
    if (saveStatus === 'saving') return;
    setSaveStatus('saving');
    try {
      await updateProfile({
        display_name: displayName.trim() || undefined,
        bio,
        pronouns,
      });
      await refreshUser();
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2500);
    } catch {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  }, [saveStatus, displayName, bio, pronouns, refreshUser]);

  // ── Delete account ───────────────────────────────────────────────────────
  const handleDeleteAccount = useCallback(async () => {
    if (deleteState !== 'confirm') return;
    setDeleteState('deleting');
    try {
      await deleteAccount();
      setOpen(false);
      router.push(`/${locale}`);
    } catch {
      setDeleteState('confirm'); // let user retry
    }
  }, [deleteState, deleteAccount, router, locale]);

  // ── Language change ──────────────────────────────────────────────────────
  const handleLangChange = useCallback(
    async (newLang: 'en' | 'zh') => {
      // Save to backend when logged in
      if (user) {
        try {
          await updateProfile({ preferred_lang: newLang });
          await refreshUser();
        } catch { /* silent */ }
      }

      // Navigate locale for everyone
      if (newLang === 'en' && locale !== 'en') router.push('/en');
      else if (newLang === 'zh' && locale !== 'zh') router.push('/zh');

      setOpen(false);
    },
    [user, locale, router, refreshUser]
  );

  // ── Derived values ───────────────────────────────────────────────────────
  const langBadge = locale === 'zh' ? '中文' : 'EN';

  const saveLabel =
    saveStatus === 'saving' ? t('saving') :
    saveStatus === 'saved'  ? t('saved') :
    saveStatus === 'error'  ? t('saveError') :
    t('save');

  const toggleSection = (section: ExpandedSection) =>
    setExpanded((prev) => (prev === section ? null : section));

  return (
    <div ref={menuRef} className="relative">
      {/* Settings toggle button — gear icon + label */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={t('title')}
        title={t('title')}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border transition-all text-xs font-medium ${
          open
            ? 'bg-gray-100 border-gray-300 text-gray-900'
            : 'border-gray-200 text-gray-500 hover:border-gray-400 hover:text-gray-700 hover:bg-gray-50'
        }`}
      >
        {/* Gear / cog icon */}
        <svg className="w-3.5 h-3.5 flex-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        {/* Text label — hidden on mobile to save space */}
        <span className="hidden sm:inline">{t('title')}</span>
      </button>

      {/* ── Dropdown panel ──────────────────────────────────────────────────── */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-72 max-w-[calc(100vw-1rem)] bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden py-1">

          {/* ── Account ──────────────────────────────────────────────────────── */}
          <button
            onClick={() => {
              if (!user) { router.push(`/${locale}/login`); setOpen(false); return; }
              toggleSection('account');
            }}
            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors text-left"
          >
            {/* Person icon */}
            <svg className="w-4 h-4 text-gray-400 flex-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="flex-1 text-sm font-medium text-gray-700">{t('account')}</span>
            {/* Right: chevron (logged-in) or lock (guest) */}
            {user ? (
              <svg
                className={`w-3.5 h-3.5 text-gray-400 transition-transform flex-none ${expanded === 'account' ? 'rotate-180' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5 text-gray-300 flex-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            )}
          </button>

          {/* Account expanded form */}
          {expanded === 'account' && user && (
            <div className="px-4 pb-3 bg-gray-50/60 border-b border-gray-100">
              {/* Display name */}
              <div className="mb-2.5">
                <label className="block text-xs text-gray-500 mb-1">{t('displayName')}</label>
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 bg-white"
                />
              </div>

              {/* Email (read-only) */}
              <div className="mb-2.5">
                <label className="block text-xs text-gray-500 mb-1">{t('email')}</label>
                <input
                  value={user.email}
                  readOnly
                  tabIndex={-1}
                  className="w-full px-2.5 py-1.5 text-sm border border-gray-100 rounded-md bg-gray-50 text-gray-400 cursor-default select-all"
                />
              </div>

              {/* Bio */}
              <div className="mb-2.5">
                <label className="block text-xs text-gray-500 mb-1">{t('bio')}</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={2}
                  placeholder="…"
                  className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 resize-none bg-white"
                />
              </div>

              {/* Pronouns */}
              <div className="mb-3">
                <label className="block text-xs text-gray-500 mb-1">{t('pronouns')}</label>
                <input
                  value={pronouns}
                  onChange={(e) => setPronouns(e.target.value)}
                  placeholder={t('pronounsPlaceholder')}
                  className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 bg-white"
                />
              </div>

              {/* Save button */}
              <button
                onClick={handleSaveAccount}
                disabled={saveStatus === 'saving'}
                className={`w-full py-1.5 text-sm font-semibold rounded-md transition-colors disabled:opacity-50 ${
                  saveStatus === 'saved'
                    ? 'bg-emerald-600 text-white'
                    : saveStatus === 'error'
                    ? 'bg-red-500 text-white'
                    : 'bg-gray-900 text-white hover:bg-gray-700'
                }`}
              >
                {saveLabel}
              </button>

              {/* ── Delete account ────────────────────────────────────────── */}
              <div className="mt-3 pt-3 border-t border-gray-200">
                {deleteState === 'idle' && (
                  <button
                    onClick={() => setDeleteState('confirm')}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium text-red-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5 flex-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    {t('deleteAccount')}
                  </button>
                )}

                {(deleteState === 'confirm' || deleteState === 'deleting') && (
                  <div className="rounded-md bg-red-50 border border-red-200 p-2.5">
                    <p className="text-xs text-red-700 font-medium mb-2">{t('deleteConfirmText')}</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setDeleteState('idle')}
                        disabled={deleteState === 'deleting'}
                        className="flex-1 py-1 text-xs font-medium border border-gray-300 rounded-md text-gray-600 hover:bg-white transition-colors disabled:opacity-50"
                      >
                        {t('cancel')}
                      </button>
                      <button
                        onClick={handleDeleteAccount}
                        disabled={deleteState === 'deleting'}
                        className="flex-1 py-1 text-xs font-semibold bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
                      >
                        {deleteState === 'deleting' ? t('deleting') : t('deleteConfirmBtn')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Language ─────────────────────────────────────────────────────── */}
          <button
            onClick={() => toggleSection('language')}
            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors text-left"
          >
            {/* Globe icon */}
            <svg className="w-4 h-4 text-gray-400 flex-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9" />
            </svg>
            <span className="flex-1 text-sm font-medium text-gray-700">{t('language')}</span>
            <div className="flex items-center gap-1.5 flex-none">
              {/* Current language badge */}
              <span className="text-xs font-semibold bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-md">
                {langBadge}
              </span>
              <svg
                className={`w-3.5 h-3.5 text-gray-400 transition-transform ${expanded === 'language' ? 'rotate-180' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </button>

          {/* Language picker (inline) */}
          {expanded === 'language' && (
            <div className="px-4 pb-3 bg-gray-50/60 border-b border-gray-100">
              {(
                [
                  { value: 'en' as const, label: t('langEn') },
                  { value: 'zh' as const, label: t('langZh') },
                ]
              ).map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => handleLangChange(value)}
                  className={`w-full text-left flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm transition-colors mb-0.5 ${
                    locale === value
                      ? 'bg-gray-100 text-gray-900 font-semibold'
                      : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                  }`}
                >
                  {/* Radio dot */}
                  <span
                    className={`w-3 h-3 rounded-full border-2 flex-none transition-colors ${
                      locale === value ? 'border-gray-900 bg-gray-900' : 'border-gray-300 bg-white'
                    }`}
                  />
                  {label}
                </button>
              ))}
            </div>
          )}

          {/* ── Notifications ─────────────────────────────────────────────────── */}
          <button
            onClick={() => {
              if (!user) { router.push(`/${locale}/login`); setOpen(false); }
              // Logged in: coming soon — no action yet
            }}
            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors text-left"
          >
            {/* Bell icon */}
            <svg className="w-4 h-4 text-gray-400 flex-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <span className="flex-1 text-sm font-medium text-gray-700">{t('notifications')}</span>
            <div className="flex items-center gap-1.5 flex-none">
              {!user && (
                <svg className="w-3.5 h-3.5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              )}
              <span className="text-xs font-semibold bg-amber-50 text-amber-600 border border-amber-200 px-1.5 py-0.5 rounded-md">
                {t('soon')}
              </span>
            </div>
          </button>

          {/* ── Display ───────────────────────────────────────────────────────── */}
          {/* Disabled — coming soon */}
          <div className="w-full flex items-center gap-3 px-4 py-2.5 opacity-40 cursor-not-allowed select-none">
            {/* Monitor icon */}
            <svg className="w-4 h-4 text-gray-400 flex-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <span className="flex-1 text-sm font-medium text-gray-700">{t('display')}</span>
            <span className="text-xs font-semibold bg-amber-50 text-amber-600 border border-amber-200 px-1.5 py-0.5 rounded-md flex-none">
              {t('soon')}
            </span>
          </div>

          {/* ── Sign Out (logged-in only) ──────────────────────────────────────── */}
          {user && (
            <>
              <div className="border-t border-gray-100 my-1 mx-1" />
              <button
                onClick={() => { logout(); setOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-red-50 transition-colors text-left"
              >
                {/* Logout icon */}
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
