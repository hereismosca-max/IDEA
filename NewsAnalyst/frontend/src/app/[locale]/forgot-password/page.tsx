'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { forgotPassword } from '@/lib/api';

export default function ForgotPasswordPage() {
  const locale = useLocale();
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await forgotPassword(email);
    } catch {
      // Intentionally swallow errors — we show the same message regardless
    } finally {
      setIsSubmitting(false);
      setSubmitted(true); // always show success state for security
    }
  };

  // ── Success state ─────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="w-full max-w-sm text-center">
          <div className="text-4xl mb-4">📬</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Check your inbox</h1>
          <p className="text-sm text-gray-500 mb-6">
            If <span className="font-medium text-gray-700">{email}</span> is registered,
            you&apos;ll receive a password reset link shortly.
          </p>
          <p className="text-xs text-gray-400 mb-8">
            The link expires in 1 hour. Check your spam folder if you don&apos;t see it.
          </p>
          <Link
            href={`/${locale}/login`}
            className="text-sm text-gray-900 font-medium hover:underline"
          >
            ← Back to Sign In
          </Link>
        </div>
      </div>
    );
  }

  // ── Form ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-gray-900 mb-2 text-center">Forgot Password?</h1>
        <p className="text-sm text-gray-500 text-center mb-6">
          Enter your email and we&apos;ll send you a reset link.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
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

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-gray-900 text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Sending…' : 'Send reset link'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-500">
          Remembered it?{' '}
          <Link href={`/${locale}/login`} className="text-gray-900 font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
