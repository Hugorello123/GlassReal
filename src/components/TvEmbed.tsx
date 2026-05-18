export default function TvEmbed({
  symbol,
  height = 180,
  interval = "60",
  /** Boardroom / wall: area chart, minimal chrome (widget URL flags). */
  ambient = false,
}: {
  symbol: string;
  height?: number;
  interval?: string;
  ambient?: boolean;
}) {
  const q = new URLSearchParams();
  q.set("frameElementId", `tv_${encodeURIComponent(symbol)}`);
  q.set("symbol", symbol);
  q.set("interval", interval);
  q.set("hideideas", "1");
  q.set("symboledit", "0");
  q.set("saveimage", "0");
  q.set("theme", "dark");
  q.set("timezone", "Etc/UTC");
  q.set("studies_overrides", "{}");
  q.set("overrides", "{}");
  q.set("toolbarbg", "0B0E11");

  if (ambient) {
    q.set("style", "3");
    q.set("hidesidetoolbar", "1");
    q.set("hidetoptoolbar", "1");
    q.set("withdateranges", "0");
    q.set("hide_volume", "1");
    q.set("locale", "en");
  } else {
    q.set("style", "1");
    q.set("hidesidetoolbar", "1");
  }

  const src = `https://s.tradingview.com/widgetembed/?${q.toString()}`;

  return (
    <div className="w-full overflow-hidden rounded-lg bg-[#0B0E11]" style={{ height }}>
      <iframe
        title={symbol}
        src={src}
        width="100%"
        height="100%"
        frameBorder="0"
        scrolling="no"
        allowTransparency
        className="pointer-events-none block h-full w-full select-none"
        style={{ border: "none" }}
      />
    </div>
  );
}
