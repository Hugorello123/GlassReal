// src/lib/api.ts — API configuration
// When backend is on Render, set VITE_API_BASE in .env
// e.g., VITE_API_BASE=https://glasstrade-api.onrender.com

const API_BASE = import.meta.env.VITE_API_BASE || "";

export function apiUrl(path: string): string {
  // If path already starts with http, return as-is
  if (path.startsWith("http")) return path;
  // Ensure path starts with /
  const cleanPath = path.startsWith("/") ? path : "/" + path;
  return API_BASE + cleanPath;
}

export async function apiGet(path: string) {
  const res = await fetch(apiUrl(path));
  if (!res.ok) throw new Error(`API ${path}: ${res.status}`);
  return res.json();
}
