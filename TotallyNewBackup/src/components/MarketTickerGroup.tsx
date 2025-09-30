// src/components/MarketTickerGroup.tsx
import React from "react";

type RowProps = { title: string; items: string[] };

function Row({ title, items }: RowProps) {
  return (
    <div className="bg-white/5 rounded-xl px-4 py-3 mb-3 overflow-hidden">
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold opacity-70">{title}</span>
        <div className="whitespace-nowrap overflow-hidden">
          <div style={{ display: "inline-block" }}>
            {items.join("  •  ")}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MarketTickerGroup() {
  return (
    <div className="space-y-2">
    </div>
  );
}
