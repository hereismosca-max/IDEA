'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { useAuth } from '@/providers/AuthProvider';
import { castVote } from '@/lib/api';

interface VoteButtonsProps {
  articleId: string;
  initialUpvotes?: number;
  initialDownvotes?: number;
  initialUserVote?: 1 | -1 | null;
}

export default function VoteButtons({
  articleId,
  initialUpvotes = 0,
  initialDownvotes = 0,
  initialUserVote = null,
}: VoteButtonsProps) {
  const locale = useLocale();
  const router = useRouter();
  const { user } = useAuth();

  const [upvotes, setUpvotes] = useState(initialUpvotes);
  const [downvotes, setDownvotes] = useState(initialDownvotes);
  const [userVote, setUserVote] = useState<1 | -1 | null>(initialUserVote);
  const [isLoading, setIsLoading] = useState(false);

  const handleVote = async (value: 1 | -1) => {
    if (!user) {
      router.push(`/${locale}/login`);
      return;
    }
    if (isLoading) return;

    // Optimistic update
    const prevUpvotes = upvotes;
    const prevDownvotes = downvotes;
    const prevUserVote = userVote;

    if (userVote === value) {
      // Toggle off
      setUserVote(null);
      if (value === 1) setUpvotes((n) => n - 1);
      else setDownvotes((n) => n - 1);
    } else {
      // Switch or new vote
      if (userVote === 1) setUpvotes((n) => n - 1);
      if (userVote === -1) setDownvotes((n) => n - 1);
      setUserVote(value);
      if (value === 1) setUpvotes((n) => n + 1);
      else setDownvotes((n) => n + 1);
    }

    setIsLoading(true);
    try {
      const result = await castVote(articleId, value);
      // Sync with actual server counts
      setUpvotes(result.upvotes);
      setDownvotes(result.downvotes);
      setUserVote(result.user_vote);
    } catch {
      // Revert on error
      setUpvotes(prevUpvotes);
      setDownvotes(prevDownvotes);
      setUserVote(prevUserVote);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-1.5">
      {/* Upvote */}
      <button
        onClick={() => handleVote(1)}
        disabled={isLoading}
        title="Agree / Upvote"
        className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg border transition-all
          ${
            userVote === 1
              ? 'bg-emerald-50 border-emerald-400 text-emerald-600'
              : 'border-gray-200 text-gray-400 hover:border-gray-400 hover:text-gray-600'
          }
          ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="w-5 h-5"
        >
          <path
            fillRule="evenodd"
            d="M10 17a.75.75 0 01-.75-.75V5.612L5.29 9.77a.75.75 0 01-1.08-1.04l5.25-5.5a.75.75 0 011.08 0l5.25 5.5a.75.75 0 11-1.08 1.04l-3.96-4.158V16.25A.75.75 0 0110 17z"
            clipRule="evenodd"
          />
        </svg>
        <span className="text-xs font-semibold tabular-nums">{upvotes}</span>
      </button>

      {/* Downvote */}
      <button
        onClick={() => handleVote(-1)}
        disabled={isLoading}
        title="Disagree / Downvote"
        className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg border transition-all
          ${
            userVote === -1
              ? 'bg-red-50 border-red-400 text-red-500'
              : 'border-gray-200 text-gray-400 hover:border-gray-400 hover:text-gray-600'
          }
          ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        <span className="text-xs font-semibold tabular-nums">{downvotes}</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="w-5 h-5"
        >
          <path
            fillRule="evenodd"
            d="M10 3a.75.75 0 01.75.75v10.638l3.96-4.158a.75.75 0 111.08 1.04l-5.25 5.5a.75.75 0 01-1.08 0l-5.25-5.5a.75.75 0 111.08-1.04l3.96 4.158V3.75A.75.75 0 0110 3z"
            clipRule="evenodd"
          />
        </svg>
      </button>
    </div>
  );
}
