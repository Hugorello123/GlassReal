import { useEffect, useState } from "react";

type State =
  | { status: "idle" | "loading" }
  | { status: "ok"; close: number; asOf: string }
  | { status: "off" | "error"; msg: string };

export default function PolygonIndexBadge() {
  const [s, setS] = useState<State>({ status: "idle" });

  useEffect(() => {
    const key = import.meta.env.VITE_POLYGON_API_KEY;
    if (!key) {
      setS({ status: "off", msg: "Polygon key missing" });
      return;
    }
    let on = true;
    setS({ status: "loading" });

    // Using Polygon prev close for the index: I:NDX
    // Docs: GET /v2/aggs/ticker/{ticker}/prev
    const url = `https://api.polygon.io/v2/aggs/ticker/I:NDX/prev?adjusted=true&apiKey=${encodeURIComponent(
      key
    )}`;

    fetch(url, { headers: { Accept: "application/json" } })
      .then((r) => r.ok ? r.json() : Promise.reject(new Error(String(r.status))))
      .then((j) => {
        const res = Array.isArray(j?.results) ? j.results[0] : null;
        const c = typeof res?.c === "number" ? res.c : null; // close
        const t = typeof res?.t === "number" ? res.t : null; // timestamp ms
        if (!on) return;
        if (c && t) {
          setS({
            status: "ok",
            close: c,
            asOf: new Date(t).toLocaleString(),
          });
        } else {
          setS({ status: "error", msg: "No data" });
        }
      })
      .catch(() => on && setS({ status: "error", msg: "Fetch failed" }));
    return () => {
      on = false;
    };
  }, []);

  // Minimal, unobtrusive UI
  let text = "Indices: loading…";
  if (s.status === "ok") text = `NDX prev close: ${s.close.toLocaleString()}`;
  if (s.status === "off") text = "Indices: off";
  if (s.status === "error") text = `Indices: temporarily unavailable`;

  return (
    <div className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm">
      <span className="opacity-80">📈</span>
      <span>{text}</span>
    </div>
  );
}
