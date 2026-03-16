// ── Core domain types ─────────────────────────────────────────────────────────

export interface Source {
  id: string;
  name: string;
  base_url: string;
  language: string;
}

export interface AiTags {
  entities?: string[];
  locations?: string[];
  sectors?: string[];
  topics?: string[];
  scale?: string | null;
}

export interface Article {
  id: string;
  title: string;
  url: string;
  content_snippet: string | null;
  published_at: string;
  fetched_at: string;
  language: string;
  source: Source;
  ai_summary: string | null;
  ai_tags: AiTags | null;
  ai_score: number | null;
  // Vote counts — present on single-article responses
  upvotes?: number;
  downvotes?: number;
  user_vote?: 1 | -1 | null;
}

export interface ArticleTranslation {
  article_id: string;
  lang: string;
  title: string | null;
  ai_summary: string | null;
}

export interface VoteCounts {
  upvotes: number;
  downvotes: number;
  user_vote: 1 | -1 | null;
}

export interface ArticleListResponse {
  items: Article[];
  total: number;
  page: number;
  page_size: number;
  has_next: boolean;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  language: string;
  display_order: number;
}

export interface User {
  id: string;
  email: string;
  display_name: string;
  preferred_lang: string;
  is_active: boolean;
  email_verified: boolean;
  created_at: string;
  bio?: string | null;
  pronouns?: string | null;
}

export interface SaveStatus {
  is_saved: boolean;
}

// ── Market data ───────────────────────────────────────────────────────────────

export interface MarketIndicator {
  symbol:     string;
  label:      string;
  price:      number | null;
  change:     number | null;
  change_pct: number | null;
}

export interface MarketSnapshot {
  indicators: MarketIndicator[];
  cached_at:  string | null;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  is_read: boolean;
  created_at: string;
}

export interface UnreadCount {
  count: number;
}

export interface MessageResponse {
  message: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}
