const TOKEN_KEY = 'newsanalyst_token';

/** Retrieve the stored JWT token (client-side only). */
export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

/** Persist a JWT token to localStorage. */
export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

/** Remove the stored JWT token (logout). */
export function removeToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

/** Check whether a user is currently logged in. */
export function isLoggedIn(): boolean {
  return !!getToken();
}
