'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useLocale } from 'next-intl';
import { verifyEmail, resendVerification } from '@/lib/api';

type State = 'loading' | 'success' | 'error' | 'no_token';

export default function VerifyEmailPage() {
  const locale = useLocale();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [state, setState] = useState<State>(token ? 'loading' : 'no_token');
  const [resendState, setResendState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  useEffect(() => {
    if (!token) return;
    verifyEmail(token)
      .then(() => setState('success'))
      .catch(() => setState('error'));
  }, [token]);

  const handleResend = async () => {
    setResendState('sending');
    try {
      await resendVerification();
      setResendState('sent');
    } catch {
      setResendState('error');
    }
  };

  // ── No token in URL ───────────────────────────────────────────────────────
  if (state === 'no_token') {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="w-full max-w-sm text-center">
          <div className="text-4xl mb-4">🔗</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Invalid link</h1>
          <p className="text-sm text-gray-500 mb-6">
            This verification link is missing a token. Please use the link from your email.
          </p>
          <Link
            href={`/${locale}`}
            className="text-sm text-gray-900 font-medium hover:underline"
          >
            ← Back to home
          </Link>
        </div>
      </div>
    );
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (state === 'loading') {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-gray-900 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-gray-500">Verifying your email…</p>
        </div>
      </div>
    );
  }

  // ── Success ───────────────────────────────────────────────────────────────
  if (state === 'success') {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="w-full max-w-sm text-center">
          <div className="text-4xl mb-4">✅</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Email verified!</h1>
          <p className="text-sm text-gray-500 mb-8">
            Your email address has been confirmed. You now have full access to all features.
          </p>
          <Link
            href={`/${locale}`}
            className="inline-block bg-gray-900 text-white py-2 px-6 rounded-md text-sm font-medium hover:bg-gray-700 transition-colors"
          >
            Go to homepage →
          </Link>
        </div>
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <div className="w-full max-w-sm text-center">
        <div className="text-4xl mb-4">⏰</div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Link expired</h1>
        <p className="text-sm text-gray-500 mb-6">
          This verification link is invalid or has expired. Request a new one below.
        </p>

        {resendState === 'sent' ? (
          <p className="text-sm text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-md px-4 py-3 mb-4">
            New verification email sent! Check your inbox.
          </p>
        ) : (
          <button
            onClick={handleResend}
            disabled={resendState === 'sending'}
            className="w-full bg-gray-900 text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-3"
          >
            {resendState === 'sending' ? 'Sending…' : 'Resend verification email'}
          </button>
        )}

        {resendState === 'error' && (
          <p className="text-xs text-red-500 mb-3">
            Failed to resend. Please sign in first and try again.
          </p>
        )}

        <Link
          href={`/${locale}/login`}
          className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          ← Sign in
        </Link>
      </div>
    </div>
  );
}
