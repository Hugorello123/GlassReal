// src/components/BusinessTicker.tsx
import React, { useEffect, useRef, useState } from "react";

type NewsItem = { objectID: string; title?: string; url?: string };

const BusinessTicker: React.FC = () => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const retried = useRef(false);

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        const res = await fetch(
         "https://hn.algolia.com/api/v1/search_by_date?query=business&tags=story&hitsPerPage=20",
          { headers: { Accept: "application/json" } }
        );
        if (!res.ok) throw new Error(String(res.status));
        const data = await res.json();

        const hits: NewsItem[] = (data?.hits || [])
          .map((h: any) => ({
            objectID: String(h.objectID ?? Math.random()),
            title: h?.title || h?.story_title || "",
            url: h?.url || h?.story_url || "",
          }))
          .filter((h) => h.title && h.title.trim().length > 0);

        if (alive) setNews(hits);
      } catch {
        // one gentle retry after 30s
        if (!retried.current) {
          retried.current = true;
          setTimeout(() => alive && load(), 30_000);
        }
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    const id = setInterval(load, 10 * 60 * 1000); // refresh every 10 min
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  if (loading && news.length === 0) {
    return (
      <div className="w-full bg-gray-900 text-white py-2 px-4 text-sm">
        Business headlines loading…
      </div>
    );
  }

  if (news.length === 0) {
    return (
      <div className="w-full bg-gray-900 text-white py-2 px-4 text-sm">
        Business headlines following soon…
      </div>
    );
  }

  return (
    <>
      {/* Inline CSS: slower scroll + pause on hover */}
      <style>{`
        .biz-ticker-wrap { background:#111827;color:#fff;overflow:hidden;white-space:nowrap;border-top:1px solid #222;border-bottom:1px solid #222 }
        .biz-ticker      { display:inline-block; padding-left:100%; animation:biz-move 80s linear infinite }
        .biz-ticker:hover { animation-play-state: paused }
        .biz-item { display:inline-block; margin:0 2rem; opacity:.95 }
        @keyframes biz-move { 0% { transform: translateX(0) } 100% { transform: translateX(-100%) } }
        .biz-link { text-decoration: none }
        .biz-link:hover { text-decoration: underline }
      `}</style>

      <div className="biz-ticker-wrap py-2 text-sm" aria-label="Business headlines ticker">
        <div className="biz-ticker">
          {news.map((item, i) => (
            <span key={item.objectID || i} className="biz-item">
              {item.url ? (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="biz-link"
                >
                  {item.title}
                </a>
              ) : (
                <span>{item.title}</span>
              )}
              {i < news.length - 1 ? " • " : ""}
            </span>
          ))}
        </div>
      </div>
    </>
  );
};

export default BusinessTicker;
