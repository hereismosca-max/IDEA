'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { useAuth } from '@/providers/AuthProvider';
import { toggleSave, getSaveStatus, resendVerification } from '@/lib/api';

interface SaveButtonProps {
  articleId: string;
  /** Optional compact mode for use inside NewsCard (icon-only, smaller) */
  compact?: boolean;
}

export default function SaveButton({ articleId, compact = false }: SaveButtonProps) {
  const locale = useLocale();
  const router = useRouter();
  const { user } = useAuth();

  const [isSaved, setIsSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showVerifyPrompt, setShowVerifyPrompt] = useState(false);
  const [resendState, setResendState] = useState<'idle' | 'sending' | 'sent'>('idle');

  // Fetch real save status on mount (Server Component can't pass auth token)
  useEffect(() => {
    if (!user) return;
    getSaveStatus(articleId)
      .then((res) => setIsSaved(res.is_saved))
      .catch(() => {/* silently ignore — starts as unsaved */});
  }, [articleId, user]);

  const handleSave = async (e: React.MouseEvent) => {
    // Prevent card-level Link navigation when used inside NewsCard
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      router.push(`/${locale}/login`);
      return;
    }
    if (isLoading) return;

    // Optimistic update
    const prev = isSaved;
    setIsSaved(!isSaved);
    setIsLoading(true);

    try {
      const result = await toggleSave(articleId);
      setIsSaved(result.is_saved);
    } catch (err: unknown) {
      const detail = err instanceof Error ? err.message : '';
      if (detail === 'email_not_verified') {
        setShowVerifyPrompt(true);
      }
      // Revert on error
      setIsSaved(prev);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setResendState('sending');
    try {
      await resendVerification();
      setResendState('sent');
    } catch {
      setResendState('idle');
    }
  };

  return (
    <div className={compact ? 'relative' : 'flex flex-col items-center gap-1.5'}>
      <button
        onClick={handleSave}
        disabled={isLoading}
        title={isSaved ? 'Saved' : 'Save article'}
        className={`
          flex items-center justify-center rounded-lg border transition-all
          ${compact ? 'w-7 h-7' : 'px-3 py-2 flex-col gap-0.5'}
          ${isSaved
            ? 'bg-amber-50 border-amber-400 text-amber-500'
            : 'border-gray-200 text-gray-400 hover:border-gray-400 hover:text-gray-600'
          }
          ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        {/* Bookmark icon — filled when saved, outline when not */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill={isSaved ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth={isSaved ? 0 : 1.5}
          className={compact ? 'w-4 h-4' : 'w-5 h-5'}
        >
          <path
            fillRule="evenodd"
            d="M5 3a2 2 0 00-2 2v12.586l7-3.5 7 3.5V5a2 2 0 00-2-2H5z"
            clipRule="evenodd"
          />
        </svg>
        {!compact && (
          <span className="text-xs font-semibold">{isSaved ? 'Saved' : 'Save'}</span>
        )}
      </button>

      {/* Email-not-verified prompt (detail page only) */}
      {!compact && showVerifyPrompt && (
        <div className="mt-2 w-28 p-2 rounded-lg bg-amber-50 border border-amber-200 text-center">
          <p className="text-[10px] text-amber-700 font-medium leading-tight mb-1.5">
            Verify your email to save
          </p>
          {resendState === 'sent' ? (
            <p className="text-[10px] text-emerald-600">Email sent!</p>
          ) : (
            <button
              onClick={handleResend}
              disabled={resendState === 'sending'}
              className="text-[10px] text-amber-600 font-semibold hover:text-amber-800 transition-colors underline underline-offset-1 disabled:opacity-50"
            >
              {resendState === 'sending' ? 'Sending…' : 'Resend email'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
