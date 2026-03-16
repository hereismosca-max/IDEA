import { Article, ArticleListResponse, ArticleTranslation, MarketSnapshot, MessageResponse, Notification, SaveStatus, TokenResponse, UnreadCount, User, VoteCounts } from '@/types';
import { getToken } from '@/lib/auth';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// ── Core request helper ───────────────────────────────────────────────────────

// Default timeout: 12 s for all API calls.
// Prevents the UI from hanging forever when the Railway backend is slow to wake
// or when a network request silently stalls (fetch() has no built-in timeout).
const REQUEST_TIMEOUT_MS = 12_000;

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken();

  // AbortController lets us cancel the request after REQUEST_TIMEOUT_MS.
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      // Spread caller options first so our signal wins (overrides any signal in options)
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options?.headers,
      },
      signal: controller.signal,
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
  } catch (e) {
    // Re-throw AbortError as a friendlier timeout error
    if (e instanceof Error && e.name === 'AbortError') {
      const err = new Error('Request timed out — please try again') as Error & { status: number };
      err.status = 408;
      throw err;
    }
    throw e;
  } finally {
    clearTimeout(timeoutId);
  }
}

// ── Articles ──────────────────────────────────────────────────────────────────

export interface FetchArticlesParams {
  page?: number;
  page_size?: number;
  language?: string;
  category_slug?: string;
  date?: string;      // "YYYY-MM-DD" UTC — legacy fallback; ignored when date_from/date_to are set
  date_from?: string; // ISO 8601 UTC — UTC timestamp of local-day start (preferred over `date`)
  date_to?: string;   // ISO 8601 UTC — UTC timestamp of local-day end   (preferred over `date`)
  search?: string;    // search in title + AI summary; when present, date filter is ignored
  sort?: 'latest' | 'popular' | 'impact';  // default: 'latest'
}

export function fetchArticles(params: FetchArticlesParams = {}): Promise<ArticleListResponse> {
  const { page = 1, page_size = 20, language = 'en', category_slug, date, date_from, date_to, search, sort } = params;
  const query = new URLSearchParams({
    page: String(page),
    page_size: String(page_size),
    language,
    ...(category_slug             ? { category_slug }  : {}),
    ...(date_from                 ? { date_from }       : {}),
    ...(date_to                   ? { date_to }         : {}),
    ...(!date_from && date        ? { date }            : {}),
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
  display_name: string,
  captcha_token: string = ''
): Promise<unknown> {
  return request('/api/v1/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, display_name, captcha_token }),
  });
}

// ── User ──────────────────────────────────────────────────────────────────────

export function getCurrentUser(): Promise<User> {
  return request('/api/v1/auth/me');
}

export function deleteAccount(): Promise<void> {
  return request('/api/v1/auth/me', { method: 'DELETE' });
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

// ── Translation ───────────────────────────────────────────────────────────────

/**
 * Fetch (and lazily cache) the Chinese translation of an article's title
 * and AI summary.  The backend translates on first call and returns cached
 * results on every subsequent call, so repeated calls are cheap.
 */
export function translateArticle(articleId: string, lang = 'zh'): Promise<ArticleTranslation> {
  return request(`/api/v1/articles/${articleId}/translate?lang=${lang}`);
}

// ── Notifications ─────────────────────────────────────────────────────────────

export function fetchNotifications(page = 1, page_size = 30): Promise<Notification[]> {
  return request(`/api/v1/notifications?page=${page}&page_size=${page_size}`);
}

export function fetchUnreadCount(): Promise<UnreadCount> {
  return request('/api/v1/notifications/unread-count');
}

export function markNotificationRead(id: string): Promise<unknown> {
  return request(`/api/v1/notifications/${id}/read`, { method: 'PATCH' });
}

export function markAllNotificationsRead(): Promise<unknown> {
  return request('/api/v1/notifications/read-all', { method: 'POST' });
}
