import { useEffect, useState } from "react";
import { apiUrl } from "@/lib/sameOriginApi";

export default function GossipFloater() {
  const [data, setData] = useState<any>(null);
  const [open, setOpen] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const res = await fetch(apiUrl("/api/gossip"));
        if (!res.ok) throw new Error("gossip " + res.status);
        const json = await res.json();
        if (alive) { setData(json); setErr(""); }
      } catch {
        if (alive) setErr("off");
      }
    }
    load();
    const id = setInterval(load, 30000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  if (err) return null; // Silent fail — no ghost if gossip down

  const intensity = data?.intensity || 0;
  const spywords = data?.spywords || [];
  const alerts = data?.alerts || [];
  const color = intensity >= 7 ? "border-red-500 bg-red-950/60" : intensity >= 4 ? "border-amber-500 bg-amber-950/60" : "border-cyan-500 bg-gray-900/80";

  return (
    <div className={`fixed bottom-4 right-4 z-50 rounded-xl border shadow-2xl backdrop-blur-md ${color} transition-all duration-300 ${open ? "w-72 p-4" : "w-auto px-3 py-2 cursor-pointer"}`} onClick={() => !open && setOpen(true)}>
      {!open ? (
        <div className="flex items-center gap-2">
          <span className="text-lg">🌐</span>
          <span className="text-xs font-bold text-white">Gossip {intensity > 0 ? `• ${intensity}` : ""}</span>
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-bold text-cyan-300">🌐 Gossip Signal</span>
            <button onClick={(e) => { e.stopPropagation(); setOpen(false); }} className="text-xs text-gray-500 hover:text-white">✕</button>
          </div>
          <div className="mb-2">
            <div className="text-[10px] text-gray-400 uppercase tracking-wider">Intensity</div>
            <div className={`text-2xl font-bold ${intensity >= 7 ? "text-red-400" : intensity >= 4 ? "text-amber-400" : "text-cyan-400"}`}>{intensity}</div>
            <div className="w-full bg-gray-800 rounded-full h-1.5 mt-1">
              <div className={`h-1.5 rounded-full ${intensity >= 7 ? "bg-red-500" : intensity >= 4 ? "bg-amber-500" : "bg-cyan-500"}`} style={{ width: `${Math.min(intensity * 10, 100)}%` }} />
            </div>
          </div>
          {spywords.length > 0 && (
            <div className="mb-2">
              <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Spywords</div>
              <div className="flex flex-wrap gap-1">
                {spywords.map((w: string) => (
                  <span key={w} className="px-1.5 py-0.5 rounded bg-white/10 text-[10px] text-gray-300 border border-white/10">{w}</span>
                ))}
              </div>
            </div>
          )}
          {alerts.length > 0 && (
            <div className="mb-3">
              <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Alerts</div>
              {alerts.slice(0, 2).map((a: string, i: number) => (
                <p key={i} className="text-[10px] text-gray-400 leading-tight mb-1">• {a}</p>
              ))}
            </div>
          )}
          <a href="#/guru" className="block text-center text-xs bg-cyan-600 hover:bg-cyan-500 text-white py-1.5 rounded-lg transition">⭐ Ask the Guru</a>
        </div>
      )}
    </div>
  );
}
