import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import TopBar from '@/components/layout/TopBar';
import { AuthProvider } from '@/providers/AuthProvider';
import { BoardProvider } from '@/providers/BoardProvider';
import { DisplayProvider, DISPLAY_FLASH_SCRIPT } from '@/providers/DisplayProvider';
import '../globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'NewsAnalyst',
  description: 'Economic & Financial News Aggregator and Analyst',
};

export default async function LocaleLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const messages = await getMessages();

  return (
    // suppressHydrationWarning prevents React warning about the `dark`/`compact`
    // classes that the inline flash-prevention script adds before hydration.
    <html lang={locale} suppressHydrationWarning>
      <head>
        {/* Runs synchronously before React hydrates — prevents dark-mode flash */}
        <script dangerouslySetInnerHTML={{ __html: DISPLAY_FLASH_SCRIPT }} />
      </head>
      <body className={`${inter.className} bg-gray-50 dark:bg-gray-950 min-h-screen transition-colors duration-200`}>
        <NextIntlClientProvider messages={messages}>
          <AuthProvider>
            <BoardProvider>
              <DisplayProvider>
                <TopBar />
                <main className="max-w-7xl mx-auto px-4 py-6">{children}</main>
              </DisplayProvider>
            </BoardProvider>
          </AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
