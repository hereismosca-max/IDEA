'use client';

import { useEffect, useRef, useState } from 'react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function SearchBar({
  value,
  onChange,
  placeholder = 'Search articles…',
}: SearchBarProps) {
  const [localValue, setLocalValue] = useState(value);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Sync local state when parent clears the value
  useEffect(() => {
    if (value === '') setLocalValue('');
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setLocalValue(v);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => onChange(v), 350);
  };

  const handleClear = () => {
    setLocalValue('');
    clearTimeout(debounceRef.current);
    onChange('');
  };

  return (
    <div className="relative flex items-center w-full">
      {/* Search icon */}
      <svg
        className="absolute left-3 h-4 w-4 text-gray-400 pointer-events-none"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"
        />
      </svg>

      <input
        type="text"
        value={localValue}
        onChange={handleChange}
        placeholder={placeholder}
        className="w-full pl-9 pr-8 py-1.5 text-sm rounded-lg border border-gray-200 bg-white
                   text-gray-800 placeholder-gray-400
                   focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100
                   transition-colors"
      />

      {/* Clear button — visible only when there is text */}
      {localValue && (
        <button
          onClick={handleClear}
          className="absolute right-2 p-0.5 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Clear search"
        >
          <svg
            className="h-3.5 w-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}
