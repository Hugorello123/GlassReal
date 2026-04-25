// src/NewsTicker.tsx
import { useEffect, useRef, useState } from "react";

export default function NewsTicker() {
  const [items, setItems] = useState<string[]>(["Loading headlines…"]);
  const retryRef = useRef<number | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        // No API key needed, CORS-friendly
        const url =
          "https://hn.algolia.com/api/v1/search?query=finance&tags=story&hitsPerPage=20";

        const res = await fetch(url, { headers: { Accept: "application/json" } });
        console.log("Ticker status:", res.status);

        if (!res.ok) {
          if (isMounted) setItems(["News Headlines following soon…"]);
          // gentle retry in 30s
          if (retryRef.current == null) {
            retryRef.current = window.setTimeout(() => {
              retryRef.current = null;
              load();
            }, 30000);
          }
          return;
        }

        const data: any = await res.json();
        const titles: string[] = Array.isArray(data?.hits)
          ? data.hits.map((h: any) => h?.title).filter(Boolean)
          : [];

        if (isMounted) {
          setItems(titles.length ? titles : ["News Headlines following soon…"]);
        }
      } catch {
        if (isMounted) setItems(["News Headlines following soon…"]);
      }
    }

    load();
    const intervalId = window.setInterval(load, 10 * 60 * 1000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
      if (retryRef.current != null) {
        window.clearTimeout(retryRef.current);
        retryRef.current = null;
      }
    };
  }, []);

  return (
    <>
      <style>{`
  .ticker-wrap { background:#ffd54f;color:#000;border-bottom:2px solid #000;overflow:hidden;white-space:nowrap;padding:8px 0;font-size:1rem }
  .ticker { display:inline-block; padding-left:100%; animation: ticker-move 80s linear infinite } /* was 25s */
  .ticker:hover { animation-play-state: paused } /* pause on hover */
  .ticker-item { display:inline-block; margin:0 1.75rem; } /* a bit more spacing */
  @keyframes ticker-move { 0% { transform: translateX(0) } 100% { transform: translateX(-100%) } }
`}</style>


      <div className="ticker-wrap">
        <div className="ticker">
          {items.map((t, i) => (
            <span key={i} className="ticker-item">• {t}</span>
          ))}
        </div>
      </div>
    </>
  );
}
