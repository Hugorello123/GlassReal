// src/components/NewsList.tsx
import { useEffect, useState } from "react";

export default function NewsList() {
  const [items, setItems] = useState<string[]>(["Loading news…"]);

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        const res = await fetch(
          "https://hn.algolia.com/api/v1/search?query=finance&tags=story&hitsPerPage=20",
          { headers: { Accept: "application/json" } }
        );
        if (!res.ok) {
          if (alive) setItems(["News Headlines following soon…"]);
          return;
        }
        const data: any = await res.json();
        const titles: string[] = Array.isArray(data?.hits)
          ? data.hits.map((h: any) => h?.title).filter(Boolean)
          : [];
        if (alive) {
          setItems(titles.length ? titles.slice(0, 8) : ["News Headlines following soon…"]);
        }
      } catch {
        if (alive) setItems(["News Headlines following soon…"]);
      }
    }

    load();
    const id = setInterval(load, 10 * 60 * 1000); // refresh every 10 mins
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  return (
    <section className="bg-white/5 rounded-2xl p-4">
      <h2 className="text-lg font-semibold mb-3">News</h2>
      <ul className="list-disc pl-5 space-y-2 text-sm opacity-90">
        {items.map((t, i) => (
          <li key={i}>{t}</li>
        ))}
      </ul>
    </section>
  );
}
