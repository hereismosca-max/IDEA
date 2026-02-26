import { ArticleListResponse, TokenResponse } from '@/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// ── Core request helper ───────────────────────────────────────────────────────

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
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
}

export function fetchArticles(params: FetchArticlesParams = {}): Promise<ArticleListResponse> {
  const { page = 1, page_size = 20, language = 'en', category_slug } = params;
  const query = new URLSearchParams({
    page: String(page),
    page_size: String(page_size),
    language,
    ...(category_slug ? { category_slug } : {}),
  });
  return request(`/api/v1/articles?${query}`);
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

// ── Categories ────────────────────────────────────────────────────────────────

export function fetchCategories(language = 'en'): Promise<unknown> {
  return request(`/api/v1/categories?language=${language}`);
}
