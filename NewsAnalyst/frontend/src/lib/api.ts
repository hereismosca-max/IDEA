import { Article, ArticleListResponse, MarketSnapshot, MessageResponse, SaveStatus, TokenResponse, User, VoteCounts } from '@/types';
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
    // Try to surface the backend's detail message
    let detail = res.statusText;
    try {
      const body = await res.json();
      if (body?.detail) detail = body.detail;
    } catch { /* ignore */ }
    const err = new Error(detail) as Error & { status: number };
    err.status = res.status;
    throw err;
  }

  return res.json();
}

// ── Articles ──────────────────────────────────────────────────────────────────

export interface FetchArticlesParams {
  page?: number;
  page_size?: number;
  language?: string;
  category_slug?: string;
  date?: string;    // "YYYY-MM-DD" — filter to a single UTC calendar day; ignored when search is set
  search?: string;  // search in title + AI summary; when present, date filter is ignored
  sort?: 'latest' | 'popular';  // default: 'latest'
}

export function fetchArticles(params: FetchArticlesParams = {}): Promise<ArticleListResponse> {
  const { page = 1, page_size = 20, language = 'en', category_slug, date, search, sort } = params;
  const query = new URLSearchParams({
    page: String(page),
    page_size: String(page_size),
    language,
    ...(category_slug             ? { category_slug }  : {}),
    ...(date                      ? { date }            : {}),
    ...(search                    ? { search }          : {}),
    ...(sort && sort !== 'latest' ? { sort }            : {}),
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

export interface UpdateProfilePayload {
  display_name?: string;
  bio?: string;
  pronouns?: string;
  preferred_lang?: string;  // 'default' | 'en' | 'zh'
}

export function updateProfile(payload: UpdateProfilePayload): Promise<User> {
  return request('/api/v1/auth/me', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
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

// ── Email verification + password reset ───────────────────────────────────────

export function verifyEmail(token: string): Promise<MessageResponse> {
  return request('/api/v1/auth/verify-email', {
    method: 'POST',
    body: JSON.stringify({ token }),
  });
}

export function resendVerification(): Promise<MessageResponse> {
  return request('/api/v1/auth/resend-verification', { method: 'POST' });
}

export function forgotPassword(email: string): Promise<MessageResponse> {
  return request('/api/v1/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export function resetPassword(
  token: string,
  new_password: string
): Promise<MessageResponse> {
  return request('/api/v1/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, new_password }),
  });
}

// ── Saves (bookmarks) ─────────────────────────────────────────────────────────

export function toggleSave(articleId: string): Promise<SaveStatus> {
  return request(`/api/v1/articles/${articleId}/save`, { method: 'POST' });
}

export function getSaveStatus(articleId: string): Promise<SaveStatus> {
  return request(`/api/v1/articles/${articleId}/save`);
}

export function fetchSavedArticles(params: { page?: number; page_size?: number } = {}): Promise<ArticleListResponse> {
  const { page = 1, page_size = 20 } = params;
  const query = new URLSearchParams({ page: String(page), page_size: String(page_size) });
  return request(`/api/v1/articles/saved?${query}`);
}

// ── Categories ────────────────────────────────────────────────────────────────

export function fetchCategories(language = 'en'): Promise<unknown> {
  return request(`/api/v1/categories?language=${language}`);
}

// ── Market data ───────────────────────────────────────────────────────────────

export function fetchMarketSnapshot(): Promise<MarketSnapshot> {
  return request('/api/v1/market/snapshot');
}

// ── Headlines (high-impact articles for the ticker) ───────────────────────────

export function fetchHeadlines(language = 'en', limit = 5): Promise<Article[]> {
  const query = new URLSearchParams({ language, limit: String(limit) });
  return request(`/api/v1/articles/headlines?${query}`);
}
