import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import type { Article, ArticleTranslation } from '@/types';
import VoteButtons from '@/components/article/VoteButtons';
import SaveButton from '@/components/article/SaveButton';
import ShareButton from '@/components/article/ShareButton';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// ── Data fetching ─────────────────────────────────────────────────────────────

async function getArticle(id: string): Promise<Article | null> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/articles/${id}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

async function getRelatedArticles(id: string): Promise<Article[]> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/articles/${id}/related?limit=5`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

/** Fetch (and lazily cache) the translation for the article detail page. */
async function getTranslation(id: string, lang: string): Promise<ArticleTranslation | null> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/articles/${id}/translate?lang=${encodeURIComponent(lang)}`, {
      next: { revalidate: 86400 }, // cache translation for 24 h
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

// ── SEO metadata ──────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: { id: string; locale: string };
}): Promise<Metadata> {
  const article = await getArticle(params.id);
  if (!article) return { title: 'Article not found — NewsAnalyst' };
  return {
    title: `${article.title} — NewsAnalyst`,
    description: article.ai_summary || article.content_snippet || undefined,
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const INTL_LOCALES: Record<string, string> = {
  en: 'en-US', zh: 'zh-CN', 'zh-TW': 'zh-TW',
  es: 'es-ES', fr: 'fr-FR', ko: 'ko-KR', ja: 'ja-JP',
};

function formatDate(dateStr: string, locale: string): string {
  const intlLocale = INTL_LOCALES[locale] ?? 'en-US';
  return new Intl.DateTimeFormat(intlLocale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(new Date(dateStr));
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return url;
  }
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function ArticlePage({
  params,
}: {
  params: { id: string; locale: string };
}) {
  const needsTranslation = params.locale !== 'en';

  // Fetch article data and translations in parallel
  const [article, relatedArticles, translation, t, tFeed] = await Promise.all([
    getArticle(params.id),
    getRelatedArticles(params.id),
    needsTranslation ? getTranslation(params.id, params.locale) : Promise.resolve(null),
    getTranslations('article'),
    getTranslations('feed'),
  ]);

  if (!article) notFound();

  // In non-English locales: build a title map for related articles via translate endpoint.
  const relatedTitleMap = new Map<string, string>();
  if (needsTranslation && relatedArticles.length > 0) {
    await Promise.all(
      relatedArticles.map(async (r) => {
        const trans = await getTranslation(r.id, params.locale).catch(() => null);
        if (trans?.title) relatedTitleMap.set(r.id, trans.title);
      })
    );
  }

  // Locale-aware relative time — uses the same feed translation keys as NewsCard
  const timeAgo = (dateStr: string): string => {
    const diff = Date.now() - new Date(dateStr).getTime();
    if (diff < 60_000) return tFeed('justNow');
    const m = Math.floor(diff / 60_000);
    if (m < 60) return tFeed('minutesAgo', { minutes: m });
    const h = Math.floor(diff / 3_600_000);
    if (h < 24) return tFeed('hoursAgo', { hours: h });
    const d = Math.floor(diff / 86_400_000);
    return tFeed('daysAgo', { days: d });
  };

  const tags = article.ai_tags;
  const bodyText = article.ai_summary || article.content_snippet;

  // Use translated text when available in non-English locales
  const displayTitle   = (needsTranslation && translation?.title)      ? translation.title      : article.title;
  const displaySummary = (needsTranslation && translation?.ai_summary) ? translation.ai_summary : bodyText;

  return (
    <div className="max-w-3xl mx-auto">

      {/* Back button */}
      <div className="mb-6">
        <Link
          href={`/${params.locale}`}
          className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-700 transition-colors"
        >
          ← {t('back')}
        </Link>
      </div>

      {/* Two-column layout on md+, single column on mobile */}
      {/* flex-col-reverse so on mobile: article renders first (top), sidebar second (bottom) */}
      <div className="flex flex-col-reverse md:flex-row gap-4 items-start">

        {/* ── Vote + Save sidebar ───────────────────────────────────────── */}
        {/* On mobile: horizontal row centred below article. On md+: vertical sticky column */}
        <div className="md:sticky md:top-20 flex-none flex flex-row md:flex-col items-center gap-4 md:gap-2 self-center md:self-start py-2 md:py-0">
          <VoteButtons
            articleId={article.id}
            initialUpvotes={article.upvotes ?? 0}
            initialDownvotes={article.downvotes ?? 0}
            initialUserVote={article.user_vote ?? null}
          />
          {/* Divider: vertical on mobile (between vote+save), horizontal on md+ */}
          <div className="w-px h-8 md:w-8 md:h-px bg-gray-200" />
          <SaveButton articleId={article.id} />
        </div>

        {/* ── Article content ──────────────────────────────────────────── */}
        <div className="flex-1 min-w-0 space-y-4">
          <article className="bg-white border border-gray-200 rounded-xl p-4 md:p-8">

            {/* Source + date + share */}
            <div className="flex items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-blue-600 uppercase tracking-wide">
                  {article.source.name}
                </span>
                <span className="text-gray-300">·</span>
                <span className="text-xs text-gray-400">{formatDate(article.published_at, params.locale)}</span>
              </div>
              <ShareButton />
            </div>

            {/* Title — translated when locale=zh */}
            <h1 className="text-xl font-bold text-gray-900 leading-snug mb-6">
              {displayTitle}
            </h1>

            {/* Translation notice — only shown when a translation was applied */}
            {needsTranslation && translation?.title && (
              <p className="text-xs text-gray-400 -mt-4 mb-6 italic">
                {article.title}
              </p>
            )}

            {/* Tags */}
            {tags && (
              <div className="mb-6 space-y-3">
                {/* Sectors + Topics as pills */}
                {((tags.sectors?.length ?? 0) > 0 || (tags.topics?.length ?? 0) > 0) && (
                  <div className="flex flex-wrap gap-2">
                    {tags.sectors?.map((s) => (
                      <span
                        key={s}
                        className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100"
                      >
                        {s}
                      </span>
                    ))}
                    {tags.topics?.map((topic) => (
                      <span
                        key={topic}
                        className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600"
                      >
                        {topic.replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>
                )}

                {/* Entities + Locations as metadata rows */}
                <div className="text-xs text-gray-400 space-y-1">
                  {(tags.entities?.length ?? 0) > 0 && (
                    <p>
                      <span className="font-medium text-gray-500">{t('companies')}</span>
                      {tags.entities!.join(', ')}
                    </p>
                  )}
                  {(tags.locations?.length ?? 0) > 0 && (
                    <p>
                      <span className="font-medium text-gray-500">{t('locations')}</span>
                      {tags.locations!.join(', ')}
                    </p>
                  )}
                  {tags.scale && (
                    <p>
                      <span className="font-medium text-gray-500">{t('scale')}</span>
                      {tags.scale}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Divider */}
            <hr className="border-gray-100 mb-6" />

            {/* Summary / Content — translated in zh locale */}
            {displaySummary ? (
              <p className="text-sm text-gray-700 leading-relaxed">{displaySummary}</p>
            ) : (
              <p className="text-sm text-gray-400 italic">{t('noSummary')}</p>
            )}

            {/* Divider */}
            <hr className="border-gray-100 mt-8 mb-6" />

            {/* Source link card */}
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all group"
            >
              <div>
                <p className="text-sm font-medium text-gray-800 group-hover:text-blue-700 transition-colors">
                  {t('readOriginal')}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">{getDomain(article.url)}</p>
              </div>
              <span className="text-gray-400 group-hover:text-blue-500 transition-colors text-lg">→</span>
            </a>

          </article>

          {/* ── Related Articles ─────────────────────────────────────────── */}
          {relatedArticles.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">
                {t('relatedArticles')}
              </h2>
              <div className="divide-y divide-gray-100">
                {relatedArticles.map((related) => (
                  <Link
                    key={related.id}
                    href={`/${params.locale}/article/${related.id}`}
                    className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0 group"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 line-clamp-2 group-hover:text-blue-700 transition-colors leading-snug">
                        {relatedTitleMap.get(related.id) ?? related.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-blue-500 font-medium">{related.source.name}</span>
                        <span className="text-gray-300">·</span>
                        <span className="text-xs text-gray-400">{timeAgo(related.published_at)}</span>
                      </div>
                    </div>
                    <span className="text-gray-300 group-hover:text-blue-400 transition-colors text-sm flex-none mt-1">→</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
