import { Article } from '@/types';

interface NewsCardProps {
  article: Article;
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

export default function NewsCard({ article }: NewsCardProps) {
  // Show AI summary if available, otherwise fall back to raw snippet
  const displayText = article.ai_summary || article.content_snippet;

  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-400 hover:shadow-sm transition-all group"
    >
      {/* Source + Time */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-semibold text-blue-600 uppercase tracking-wide">
          {article.source.name}
        </span>
        <span className="text-gray-300">·</span>
        <span className="text-xs text-gray-400">{timeAgo(article.published_at)}</span>
      </div>

      {/* Title */}
      <h2 className="text-sm font-semibold text-gray-900 leading-snug mb-2 line-clamp-2 group-hover:text-blue-700 transition-colors">
        {article.title}
      </h2>

      {/* Summary / Snippet */}
      {displayText && (
        <p className="text-xs text-gray-500 leading-relaxed line-clamp-3">{displayText}</p>
      )}

      {/* AI score badge — visible only when score exists (Phase 3) */}
      {article.ai_score !== null && (
        <div className="mt-3 flex items-center gap-1">
          <span className="text-xs text-gray-400">Relevance</span>
          <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-400 rounded-full"
              style={{ width: `${Math.round(article.ai_score * 100)}%` }}
            />
          </div>
        </div>
      )}
    </a>
  );
}
