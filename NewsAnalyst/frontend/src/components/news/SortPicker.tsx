'use client';

type SortOption = 'latest' | 'popular';

interface SortPickerProps {
  value: SortOption;
  onChange: (sort: SortOption) => void;
}

const OPTIONS: { label: string; value: SortOption }[] = [
  { label: 'Latest',  value: 'latest'  },
  { label: 'Popular', value: 'popular' },
];

export default function SortPicker({ value, onChange }: SortPickerProps) {
  return (
    <div className="flex items-center gap-0.5 rounded-lg border border-gray-200 bg-white p-0.5">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
            value === opt.value
              ? 'bg-gray-900 text-white'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
