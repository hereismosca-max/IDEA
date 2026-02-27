'use client';

// Section definitions — aligned with backend SECTION_FILTERS in articles.py
export const SECTIONS = [
  { label: 'All',        slug: 'all'        },
  { label: 'Markets',    slug: 'markets'    },
  { label: 'Technology', slug: 'technology' },
  { label: 'Economy',    slug: 'economy'    },
  { label: 'Energy',     slug: 'energy'     },
  { label: 'Crypto',     slug: 'crypto'     },
];

interface MenuBarProps {
  activeCategory: string;
  onCategoryChange: (slug: string) => void;
}

export default function MenuBar({ activeCategory, onCategoryChange }: MenuBarProps) {
  return (
    <nav className="border-b border-gray-200 bg-white">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center gap-0 overflow-x-auto scrollbar-none">
          {SECTIONS.map((section) => (
            <button
              key={section.slug}
              onClick={() => onCategoryChange(section.slug)}
              className={`whitespace-nowrap px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeCategory === section.slug
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {section.label}
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
}
