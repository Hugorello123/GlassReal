// src/lib/fetchNews.ts — live news via NewsCatcher (RapidAPI)
import { NEWSCATCHER_KEY } from "./config";

const HAS_KEY = !!NEWSCATCHER_KEY;
const RAPIDAPI_HOST = "newscatcher.p.rapidapi.com";

export interface NewsItem {
  title: string;
  url?: string;
  published?: string;
}

export async function fetchNews(query = "crypto OR bitcoin OR gold OR oil", limit = 20): Promise<NewsItem[]> {
  if (!HAS_KEY) return getFallbackNews();

  try {
    const res = await fetch(
      `https://${RAPIDAPI_HOST}/v1/search_free?q=${encodeURIComponent(query)}&lang=en&page=1&page_size=${limit}&sort_by=relevancy`,
      {
        headers: {
          "x-rapidapi-key": NEWSCATCHER_KEY,
          "x-rapidapi-host": RAPIDAPI_HOST,
          "Accept": "application/json",
        },
      }
    );

    if (!res.ok) return getFallbackNews();

    const data = await res.json();
    const articles = data?.articles || [];

    return articles
      .map((a: any) => ({ title: a.title, url: a.link, published: a.published_date }))
      .filter((a: NewsItem) => a.title)
      .slice(0, limit);
  } catch {
    return getFallbackNews();
  }
}

function getFallbackNews(): NewsItem[] {
  return [
    { title: "Connect API keys for live news feed" },
    { title: "Sentotrade — real-time market intelligence" },
  ];
}
