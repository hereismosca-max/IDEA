'use client';

import { useState } from 'react';

export default function ShareButton() {
  const [state, setState] = useState<'idle' | 'copied'>('idle');

  const handleShare = async () => {
    const url = window.location.href;

    // Use native Web Share API on mobile if available
    if (navigator.share) {
      try {
        await navigator.share({ url });
        return;
      } catch {
        // User cancelled or not supported — fall through to clipboard
      }
    }

    // Fallback: copy to clipboard
    try {
      await navigator.clipboard.writeText(url);
      setState('copied');
      setTimeout(() => setState('idle'), 2000);
    } catch {
      // Clipboard blocked — do nothing
    }
  };

  return (
    <button
      onClick={handleShare}
      title="Share article"
      className={`
        flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all
        ${state === 'copied'
          ? 'bg-emerald-50 border-emerald-300 text-emerald-600'
          : 'border-gray-200 text-gray-500 hover:border-gray-400 hover:text-gray-700'
        }
      `}
    >
      {state === 'copied' ? (
        <>
          {/* Checkmark icon */}
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
            <path fillRule="evenodd" d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd" />
          </svg>
          Copied!
        </>
      ) : (
        <>
          {/* Link / share icon */}
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
            <path fillRule="evenodd" d="M8.914 6.025a.75.75 0 0 1 1.06 0 3.5 3.5 0 0 1 0 4.95l-2 2a3.5 3.5 0 0 1-4.95-4.95l1.5-1.5a.75.75 0 0 1 1.06 1.06l-1.5 1.5a2 2 0 0 0 2.83 2.83l2-2a2 2 0 0 0 0-2.83.75.75 0 0 1 0-1.06Zm-3.5-.025a.75.75 0 0 1 1.06 0A2 2 0 0 0 9.3 8.83l2-2a2 2 0 0 0-2.83-2.83l-1.5 1.5a.75.75 0 1 1-1.06-1.06l1.5-1.5a3.5 3.5 0 0 1 4.95 0 .75.75 0 0 1 0 1.06Z" clipRule="evenodd" />
          </svg>
          Share
        </>
      )}
    </button>
  );
}
