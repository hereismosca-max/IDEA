'use client';

import { useState } from 'react';

// Placeholder categories — will be driven by API + AI tags in Phase 2/3
const CATEGORIES = [
  { label: 'All', slug: 'all' },
  { label: 'Markets', slug: 'markets' },
  { label: 'Economy', slug: 'economy' },
  { label: 'Policy & Central Banks', slug: 'policy' },
  { label: 'Stocks', slug: 'stocks' },
  { label: 'Commodities', slug: 'commodities' },
  { label: 'Crypto', slug: 'crypto' },
];

export default function MenuBar() {
  const [active, setActive] = useState('all');

  return (
    <nav className="border-b border-gray-200 bg-white">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center gap-0 overflow-x-auto">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.slug}
              onClick={() => setActive(cat.slug)}
              className={`whitespace-nowrap px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                active === cat.slug
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
}
