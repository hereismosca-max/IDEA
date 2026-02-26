'use client';

import Link from 'next/link';
import { useLocale } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';

export default function TopBar() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  const switchLocale = (newLocale: string) => {
    const newPath = pathname.replace(`/${locale}`, `/${newLocale}`);
    router.push(newPath);
  };

  return (
    <header className="border-b border-gray-200 bg-white sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">

        {/* Left: Logo / Site name */}
        <Link
          href={`/${locale}`}
          className="text-xl font-bold text-gray-900 tracking-tight hover:opacity-80 transition-opacity"
        >
          NewsAnalyst
        </Link>

        {/* Right: Language switcher + User */}
        <div className="flex items-center gap-4">

          {/* Language toggle */}
          <div className="flex items-center gap-1 text-sm">
            <button
              onClick={() => switchLocale('en')}
              className={`px-2 py-1 rounded text-sm font-medium transition-colors ${
                locale === 'en'
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              EN
            </button>
            <span className="text-gray-300">|</span>
            <button
              onClick={() => switchLocale('zh')}
              className={`px-2 py-1 rounded text-sm font-medium transition-colors ${
                locale === 'zh'
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              中文
            </button>
          </div>

          {/* User — placeholder for Phase 2 */}
          <button className="text-sm text-gray-600 hover:text-gray-900 border border-gray-200 px-3 py-1.5 rounded-md transition-colors hover:border-gray-400">
            Sign In
          </button>

        </div>
      </div>
    </header>
  );
}
