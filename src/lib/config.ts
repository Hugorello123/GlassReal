// src/lib/config.ts — API configuration
// Same origin — API served from same domain
export const API_BASE = "";

export const POLYGON_KEY = import.meta.env.VITE_POLYGON_KEY || "";
export const BITQUERY_TOKEN = import.meta.env.VITE_BITQUERY_TOKEN || "";
export const NEWSCATCHER_KEY = import.meta.env.VITE_NEWSCATCHER_KEY || "";

export function apiUrl(path: string): string {
  if (path.startsWith("http")) return path;
  const cleanPath = path.startsWith("/") ? path : "/" + path;
  return API_BASE + cleanPath;
}

export function hasLiveData(): boolean {
  return true;
}
