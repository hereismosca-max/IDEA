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
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}
