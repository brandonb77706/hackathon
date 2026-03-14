/**
 * Cookie helpers for the FastAPI JWT.
 * next-auth handles the Google OAuth UI; after that completes we store
 * the FastAPI JWT in an httpOnly-equivalent cookie on the client.
 */

export function setApiToken(token: string) {
  // SameSite=Strict, Secure in production; JS-accessible for SSR fetches
  document.cookie = `api_token=${encodeURIComponent(token)}; path=/; max-age=${60 * 60 * 72}`;
}

export function clearApiToken() {
  document.cookie = "api_token=; path=/; max-age=0";
}

export function getApiToken(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|;\s*)api_token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}
