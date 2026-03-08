'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useAuth } from '@/providers/AuthProvider';
import { updateProfile } from '@/lib/api';

// ── Settings menu (hamburger ≡) ────────────────────────────────────────────────
// Visible to ALL users (guests + logged-in).
// Language section: always available — guests navigate locale only; logged-in also saves to backend.
// Account section: only shown when logged in.

export default function SettingsMenu() {
  const { user, refreshUser } = useAuth();
  const locale = useLocale();
  const router = useRouter();
  const t = useTranslations('settings');

  // ── Dropdown open/close ──────────────────────────────────────────────────
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside the dropdown
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

  // ── Account form state (only used when logged in) ────────────────────────
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [pronouns, setPronouns] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // ── Language state ───────────────────────────────────────────────────────
  const [lang, setLang] = useState<'default' | 'en' | 'zh'>('default');

  // Sync state whenever the menu opens
  useEffect(() => {
    if (!open) return;
    if (user) {
      setDisplayName(user.display_name);
      setBio(user.bio ?? '');
      setPronouns(user.pronouns ?? '');
      setLang((user.preferred_lang as 'default' | 'en' | 'zh') ?? 'default');
      setSaveStatus('idle');
    } else {
      // Guest: reflect current URL locale so the right radio appears selected
      setLang(locale === 'en' ? 'en' : locale === 'zh' ? 'zh' : 'default');
    }
  }, [open, user, locale]);

  // ── Save account changes ─────────────────────────────────────────────────
  const handleSaveAccount = useCallback(async () => {
    if (saveStatus === 'saving') return;
    setSaveStatus('saving');
    try {
      await updateProfile({
        display_name: displayName.trim() || undefined,
        bio: bio,
        pronouns: pronouns,
      });
      await refreshUser();
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2500);
    } catch {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  }, [saveStatus, displayName, bio, pronouns, refreshUser]);

  // ── Language change ──────────────────────────────────────────────────────
  const handleLangChange = useCallback(
    async (newLang: 'default' | 'en' | 'zh') => {
      setLang(newLang);

      // Only save to backend when logged in
      if (user) {
        try {
          await updateProfile({ preferred_lang: newLang });
          await refreshUser();
        } catch { /* silent */ }
      }

      // Navigate locale for everyone
      if (newLang === 'en' && locale !== 'en') router.push('/en');
      else if (newLang === 'zh' && locale !== 'zh') router.push('/zh');
      // 'default' → no forced navigation; board drives content language

      setOpen(false);
    },
    [user, locale, router, refreshUser]
  );

  // ── Save button label ────────────────────────────────────────────────────
  const saveLabel =
    saveStatus === 'saving' ? t('saving') :
    saveStatus === 'saved'  ? t('saved') :
    saveStatus === 'error'  ? t('saveError') :
    t('save');

  return (
    <div ref={menuRef} className="relative">
      {/* Hamburger toggle button */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={t('title')}
        title={t('title')}
        className={`p-1.5 rounded-md transition-colors ${
          open
            ? 'bg-gray-100 text-gray-900'
            : 'text-gray-400 hover:bg-gray-100 hover:text-gray-700'
        }`}
      >
        {/* 3-line hamburger icon */}
        <svg width="17" height="17" viewBox="0 0 17 17" fill="none" aria-hidden="true">
          <rect y="3.5"  width="17" height="1.6" rx="0.8" fill="currentColor" />
          <rect y="7.7"  width="17" height="1.6" rx="0.8" fill="currentColor" />
          <rect y="11.9" width="17" height="1.6" rx="0.8" fill="currentColor" />
        </svg>
      </button>

      {/* ── Dropdown panel ──────────────────────────────────────────────────── */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden">

          {/* ── Account section — logged-in only ────────────────────────────── */}
          {user && (
            <>
              <div className="px-4 pt-4 pb-3">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">
                  {t('account')}
                </p>

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
                <div className="mb-4">
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
              </div>

              {/* Divider between Account and Language */}
              <div className="border-t border-gray-100" />
            </>
          )}

          {/* ── Language section ─────────────────────────────────────────────── */}
          <div className="px-4 pt-3 pb-4">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2.5">
              {t('language')}
            </p>

            {(
              [
                { value: 'default', label: t('langDefault') },
                { value: 'en',      label: t('langEn')      },
                { value: 'zh',      label: t('langZh')      },
              ] as const
            ).map(({ value, label }) => (
              <button
                key={value}
                onClick={() => handleLangChange(value)}
                className={`w-full text-left flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm transition-colors mb-0.5 ${
                  lang === value
                    ? 'bg-gray-100 text-gray-900 font-semibold'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                }`}
              >
                {/* Radio dot */}
                <span
                  className={`w-3 h-3 rounded-full border-2 flex-none transition-colors ${
                    lang === value ? 'border-gray-900 bg-gray-900' : 'border-gray-300 bg-white'
                  }`}
                />
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
