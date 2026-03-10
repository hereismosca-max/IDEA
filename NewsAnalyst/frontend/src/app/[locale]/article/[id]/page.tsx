import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
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

/** Fetch (and lazily cache) the Chinese translation for the article detail page. */
async function getTranslation(id: string): Promise<ArticleTranslation | null> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/articles/${id}/translate?lang=zh`, {
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

function formatDate(dateStr: string, locale: string): string {
  const intlLocale = locale === 'zh' ? 'zh-CN' : 'en-US';
  return new Intl.DateTimeFormat(intlLocale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(new Date(dateStr));
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return minutes <= 1 ? 'Just now' : `${minutes}m ago`;
  const hours = Math.floor(diff / 3600000);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
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
  const isZh = params.locale === 'zh';

  // Fetch article, related articles, and (when in Chinese locale) translation in parallel
  const [article, relatedArticles, translation] = await Promise.all([
    getArticle(params.id),
    getRelatedArticles(params.id),
    isZh ? getTranslation(params.id) : Promise.resolve(null),
  ]);

  if (!article) notFound();

  const tags = article.ai_tags;
  const bodyText = article.ai_summary || article.content_snippet;

  // Use translated text when available in Chinese locale
  const displayTitle   = (isZh && translation?.title_zh)      ? translation.title_zh    : article.title;
  const displaySummary = (isZh && translation?.ai_summary_zh) ? translation.ai_summary_zh : bodyText;

  return (
    <div className="max-w-3xl mx-auto">

      {/* Back button */}
      <div className="mb-6">
        <Link
          href={`/${params.locale}`}
          className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-700 transition-colors"
        >
          ← {isZh ? '返回' : 'Back'}
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
            {isZh && translation?.title_zh && (
              <p className="text-xs text-gray-400 -mt-4 mb-6 italic">
                原标题：{article.title}
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
                    {tags.topics?.map((t) => (
                      <span
                        key={t}
                        className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600"
                      >
                        {t.replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>
                )}

                {/* Entities + Locations as metadata rows */}
                <div className="text-xs text-gray-400 space-y-1">
                  {(tags.entities?.length ?? 0) > 0 && (
                    <p>
                      <span className="font-medium text-gray-500">
                        {isZh ? '相关方：' : 'Companies / People: '}
                      </span>
                      {tags.entities!.join(', ')}
                    </p>
                  )}
                  {(tags.locations?.length ?? 0) > 0 && (
                    <p>
                      <span className="font-medium text-gray-500">
                        {isZh ? '地区：' : 'Locations: '}
                      </span>
                      {tags.locations!.join(', ')}
                    </p>
                  )}
                  {tags.scale && (
                    <p>
                      <span className="font-medium text-gray-500">
                        {isZh ? '规模：' : 'Scale: '}
                      </span>
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
              <p className="text-sm text-gray-400 italic">
                {isZh ? '暂无摘要。' : 'No summary available for this article.'}
              </p>
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
                  {isZh ? '阅读原文' : 'Read original article'}
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
                {isZh ? '相关资讯' : 'Related Articles'}
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
                        {related.title}
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
