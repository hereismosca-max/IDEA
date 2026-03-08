'use client';

import { useTranslations } from 'next-intl';

// Section slugs — aligned with backend SECTION_FILTERS in articles.py.
// Labels are resolved from i18n messages (menu.*) so they switch with the locale.
export const SECTION_SLUGS = [
  'all',
  'markets',
  'technology',
  'economy',
  'energy',
  'crypto',
] as const;

// Keep the old SECTIONS export for any code that still imports it
export const SECTIONS = SECTION_SLUGS.map((slug) => ({ slug }));

interface MenuBarProps {
  activeCategory: string;
  onCategoryChange: (slug: string) => void;
}

export default function MenuBar({ activeCategory, onCategoryChange }: MenuBarProps) {
  const t = useTranslations('menu');

  return (
    <nav className="border-b border-gray-200 bg-white">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center gap-0 overflow-x-auto scrollbar-none">
          {SECTION_SLUGS.map((slug) => (
            <button
              key={slug}
              onClick={() => onCategoryChange(slug)}
              className={`whitespace-nowrap px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeCategory === slug
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {t(slug)}
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
}
