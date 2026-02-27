import { Article, ArticleListResponse, TokenResponse, User, VoteCounts } from '@/types';
import { getToken } from '@/lib/auth';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// ── Core request helper ───────────────────────────────────────────────────────

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
    ...options,
  });

  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${res.statusText}`);
  }

  return res.json();
}

// ── Articles ──────────────────────────────────────────────────────────────────

export interface FetchArticlesParams {
  page?: number;
  page_size?: number;
  language?: string;
  category_slug?: string;
  date?: string;   // "YYYY-MM-DD" — filter to a single UTC calendar day
}

export function fetchArticles(params: FetchArticlesParams = {}): Promise<ArticleListResponse> {
  const { page = 1, page_size = 20, language = 'en', category_slug, date } = params;
  const query = new URLSearchParams({
    page: String(page),
    page_size: String(page_size),
    language,
    ...(category_slug ? { category_slug } : {}),
    ...(date        ? { date }           : {}),
  });
  return request(`/api/v1/articles?${query}`);
}

export function fetchArticle(id: string): Promise<Article> {
  return request(`/api/v1/articles/${id}`);
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export function loginUser(email: string, password: string): Promise<TokenResponse> {
  return request('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export function registerUser(
  email: string,
  password: string,
  display_name: string
): Promise<unknown> {
  return request('/api/v1/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, display_name }),
  });
}

// ── User ──────────────────────────────────────────────────────────────────────

export function getCurrentUser(): Promise<User> {
  return request('/api/v1/auth/me');
}

// ── Votes ─────────────────────────────────────────────────────────────────────

export function castVote(articleId: string, vote: 1 | -1): Promise<VoteCounts> {
  return request(`/api/v1/articles/${articleId}/vote`, {
    method: 'POST',
    body: JSON.stringify({ vote }),
  });
}

export function getVoteCounts(articleId: string): Promise<VoteCounts> {
  return request(`/api/v1/articles/${articleId}/votes`);
}

// ── Categories ────────────────────────────────────────────────────────────────

export function fetchCategories(language = 'en'): Promise<unknown> {
  return request(`/api/v1/categories?language=${language}`);
}
