import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import type { Article } from '@/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// ── Data fetching ─────────────────────────────────────────────────────────────

async function getArticle(id: string): Promise<Article | null> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/articles/${id}`, {
      next: { revalidate: 300 }, // revalidate every 5 min
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
  params: { id: string };
}): Promise<Metadata> {
  const article = await getArticle(params.id);
  if (!article) return { title: 'Article not found — NewsAnalyst' };
  return {
    title: `${article.title} — NewsAnalyst`,
    description: article.ai_summary || article.content_snippet || undefined,
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat('en-US', {
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
  const article = await getArticle(params.id);
  if (!article) notFound();

  const tags = article.ai_tags;
  const bodyText = article.ai_summary || article.content_snippet;

  return (
    <div className="max-w-3xl mx-auto">

      {/* Back button */}
      <div className="mb-6">
        <Link
          href={`/${params.locale}`}
          className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-700 transition-colors"
        >
          ← Back
        </Link>
      </div>

      {/* Article header */}
      <article className="bg-white border border-gray-200 rounded-xl p-8">

        {/* Source + date */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs font-semibold text-blue-600 uppercase tracking-wide">
            {article.source.name}
          </span>
          <span className="text-gray-300">·</span>
          <span className="text-xs text-gray-400">{formatDate(article.published_at)}</span>
        </div>

        {/* Title */}
        <h1 className="text-xl font-bold text-gray-900 leading-snug mb-6">
          {article.title}
        </h1>

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
                  <span className="font-medium text-gray-500">Companies / People: </span>
                  {tags.entities!.join(', ')}
                </p>
              )}
              {(tags.locations?.length ?? 0) > 0 && (
                <p>
                  <span className="font-medium text-gray-500">Locations: </span>
                  {tags.locations!.join(', ')}
                </p>
              )}
              {tags.scale && (
                <p>
                  <span className="font-medium text-gray-500">Scale: </span>
                  {tags.scale}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Divider */}
        <hr className="border-gray-100 mb-6" />

        {/* Summary / Content */}
        {bodyText ? (
          <p className="text-sm text-gray-700 leading-relaxed">{bodyText}</p>
        ) : (
          <p className="text-sm text-gray-400 italic">No summary available for this article.</p>
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
              Read original article
            </p>
            <p className="text-xs text-gray-400 mt-0.5">{getDomain(article.url)}</p>
          </div>
          <span className="text-gray-400 group-hover:text-blue-500 transition-colors text-lg">→</span>
        </a>

      </article>
    </div>
  );
}
