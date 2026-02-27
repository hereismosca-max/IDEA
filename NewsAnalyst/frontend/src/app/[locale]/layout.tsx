import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import TopBar from '@/components/layout/TopBar';
import { AuthProvider } from '@/providers/AuthProvider';
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
    <html lang={locale}>
      <body className={`${inter.className} bg-gray-50 min-h-screen`}>
        <NextIntlClientProvider messages={messages}>
          <AuthProvider>
            <TopBar />
            <main className="max-w-7xl mx-auto px-4 py-6">{children}</main>
          </AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
