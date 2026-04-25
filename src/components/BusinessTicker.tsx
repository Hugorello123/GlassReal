// src/components/BusinessTicker.tsx
import React from "react";
import { useEffect, useRef, useState } from "react";

type NewsItem = { objectID: string; title?: string; url?: string };
type Marker = { __marker: true; id: string };

// Insert a marker object every N items (default 5)
function insertMarkers<T>(arr: T[], every = 5): (T | Marker)[] {
  const out: (T | Marker)[] = [];
  for (let i = 0; i < arr.length; i++) {
    if (i > 0 && i % every === 0) out.push({ __marker: true, id: `marker-${i}` });
    out.push(arr[i]);
  }
  return out;
}

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
          .map((h: Record<string, unknown>, idx: number) => ({
            objectID: String(h?.objectID ?? `hit-${idx}`),
            title: h?.title || h?.story_title || "",
            url: h?.url || h?.story_url || "",
          }))
          .filter((h: Record<string, unknown>) => h.title && String(h.title).trim().length > 0);

        if (alive) setNews(hits);
      } catch {
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

  const stream = insertMarkers(news, 5);

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
          {stream.map((chunk, i) => {
            const next = stream[i + 1] as NewsItem | Marker | undefined;

            // 🔶 Obvious NEWSTRAIN wagon
            if ((chunk as Marker).__marker) {
              return (
                <span
                  key={(chunk as Marker).id}
                  className="mx-5 inline-flex items-center gap-2 px-4 py-1.5 rounded-full
                             bg-cyan-300 text-gray-900 text-xs sm:text-sm font-bold uppercase
                             tracking-widest shadow ring-2 ring-cyan-200/70"
                >
                  NEWSTRAIN
                </span>
              );
            }

            // Normal news item
            const item = chunk as NewsItem;
            return (
              <React.Fragment key={item.objectID || `news-${i}`}>
                <span className="biz-item">
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
                  {/* dot only if the next piece is a normal item */}
                  {next && !(next as any).__marker ? " • " : ""}
                </span>
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </>
  );
};

export default BusinessTicker;
