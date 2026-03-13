'use client';

import { useState, useRef, useEffect, FormEvent } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile';
import { useAuth } from '@/providers/AuthProvider';
import { resendVerification } from '@/lib/api';

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? '';

export default function RegisterPage() {
  const locale = useLocale();
  const { register } = useAuth();
  const t = useTranslations('auth');

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [captchaToken, setCaptchaToken] = useState('');
  const [captchaUnavailable, setCaptchaUnavailable] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [resendState, setResendState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  const turnstileRef = useRef<TurnstileInstance>(null);
  // Track whether the widget has settled (success or error) to drive the timeout fallback
  const captchaResolvedRef = useRef(false);

  // Domain-mismatch silently blanks the iframe without firing onError.
  // If the widget hasn't resolved after 8 s, treat it as unavailable so
  // rate-limiting remains the only backstop and the button stays usable.
  useEffect(() => {
    if (!SITE_KEY) return;
    const id = setTimeout(() => {
      if (!captchaResolvedRef.current) setCaptchaUnavailable(true);
    }, 8000);
    return () => clearTimeout(id);
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) {
      setError(t('passwordTooShort'));
      return;
    }
    // SITE_KEY set but no token yet and widget loaded OK → reject
    if (SITE_KEY && !captchaToken && !captchaUnavailable) {
      setError(t('captchaRequired'));
      return;
    }
    setIsSubmitting(true);
    try {
      await register(email, password, displayName, captchaToken);
      setRegistered(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '';
      if (message === 'Email already registered') {
        setError(t('emailAlreadyTaken'));
      } else if (message.includes('CAPTCHA')) {
        setError(t('captchaFailed'));
      } else {
        setError(t('registrationFailed'));
      }
      // Reset CAPTCHA so user can retry
      if (!captchaUnavailable) {
        turnstileRef.current?.reset();
        setCaptchaToken('');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Resend handler ─────────────────────────────────────────────────────────
  const handleResend = async () => {
    setResendState('sending');
    try {
      await resendVerification();
      setResendState('sent');
    } catch {
      setResendState('error');
    }
  };

  // ── Success state ─────────────────────────────────────────────────────────
  if (registered) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="w-full max-w-sm text-center">
          <div className="text-4xl mb-4">✉️</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">{t('checkInboxTitle')}</h1>
          <p className="text-sm text-gray-500 mb-1">{t('verificationSentTo')}</p>
          <p className="text-sm font-semibold text-gray-800 mb-6 break-all">{email}</p>
          <p className="text-xs text-gray-400 mb-8">{t('verificationExpiry')}</p>
          <Link
            href={`/${locale}`}
            className="inline-block bg-gray-900 text-white py-2 px-6 rounded-md text-sm font-medium hover:bg-gray-700 transition-colors"
          >
            {t('continueBrowsing')}
          </Link>

          {/* Resend verification email */}
          <div className="mt-6">
            {resendState === 'sent' ? (
              <p className="text-sm text-green-600">{t('resendSent')}</p>
            ) : resendState === 'error' ? (
              <p className="text-sm text-red-500">{t('resendError')}</p>
            ) : (
              <button
                onClick={handleResend}
                disabled={resendState === 'sending'}
                className="text-sm text-gray-400 hover:text-gray-600 underline underline-offset-2 transition-colors disabled:opacity-50"
              >
                {resendState === 'sending' ? t('resending') : t('resendEmail')}
              </button>
            )}
          </div>

          <p className="mt-3 text-xs text-gray-400">{t('checkSpam')}</p>
        </div>
      </div>
    );
  }

  const canSubmit = (!SITE_KEY || !!captchaToken || captchaUnavailable) && !isSubmitting;

  // ── Registration form ─────────────────────────────────────────────────────
  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">{t('createAccount')}</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('displayName')}
            </label>
            <input
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              placeholder={t('namePlaceholder')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('email')}
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('password')}
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              placeholder={t('passwordPlaceholder')}
            />
          </div>

          {/* Cloudflare Turnstile — invisible mode: no visual widget, silent background check */}
          {SITE_KEY && !captchaUnavailable && (
            <Turnstile
              ref={turnstileRef}
              siteKey={SITE_KEY}
              onSuccess={(token) => { captchaResolvedRef.current = true; setCaptchaToken(token); setCaptchaUnavailable(false); }}
              onError={() => { captchaResolvedRef.current = true; setCaptchaToken(''); setCaptchaUnavailable(true); }}
              onExpire={() => { setCaptchaToken(''); }}
              options={{ size: 'invisible' }}
            />
          )}

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full bg-gray-900 text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? t('creatingAccount') : t('createAccount')}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-500">
          {t('alreadyHaveAccount')}{' '}
          <Link href={`/${locale}/login`} className="text-gray-900 font-medium hover:underline">
            {t('signInLink')}
          </Link>
        </p>
      </div>
    </div>
  );
}
