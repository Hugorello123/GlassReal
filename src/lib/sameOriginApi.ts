/**
 * Absolute API URL. Default: same origin as the page (works when Node serves both SPA + /api).
 * If a reverse proxy serves only static files on this port, set `VITE_API_ORIGIN` at build time
 * to the origin where Node actually handles `/api/*` (must allow CORS or be same-site).
 */
export function apiUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  if (typeof window === "undefined") return p;
  const base = import.meta.env.VITE_API_ORIGIN as string | undefined;
  if (base && String(base).trim()) {
    return String(base).replace(/\/+$/, "") + p;
  }
  return new URL(p, window.location.href).href;
}
