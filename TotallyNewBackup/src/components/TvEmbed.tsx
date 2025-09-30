import React from "react";

export default function TvEmbed({
  symbol,
  height = 180,
  interval = "60",
}: { symbol: string; height?: number; interval?: string }) {
  const src =
    "https://s.tradingview.com/widgetembed/?" +
    `frameElementId=tv_${encodeURIComponent(symbol)}` +
    `&symbol=${encodeURIComponent(symbol)}` +
    `&interval=${encodeURIComponent(interval)}` +
    `&hideideas=1&hidesidetoolbar=1&symboledit=0&saveimage=0` +
    `&toolbarbg=f1f3f6&theme=dark&style=1&timezone=Etc%2FUTC` +
    `&studies_overrides={}&overrides={}`;

  return (
    <div className="w-full" style={{ height }}>
      <iframe
        title={symbol}
        src={src}
        width="100%"
        height="100%"
        frameBorder="0"
        scrolling="no"
        allowTransparency
        style={{ display: "block", borderRadius: 12 }}
      />
    </div>
  );
}
