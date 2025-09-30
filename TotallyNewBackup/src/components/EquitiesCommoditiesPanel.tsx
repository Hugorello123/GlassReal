// Minimal, crash-proof panel: 2 sections, 4 TradingView iframes each.
// No CoinGecko dependency. Uses s.tradingview.com (allowed by your CSP).
import React from "react";

type TVProps = { symbol: string; title?: string; height?: number };
const TV: React.FC<TVProps> = ({ symbol, title, height = 280 }) => {
  const src = `https://s.tradingview.com/widgetembed/?symbol=${encodeURIComponent(
    symbol
  )}&interval=60&hidesidetoolbar=1&hidetoptoolbar=1&theme=dark&style=1&timezone=Africa/Johannesburg&allow_symbol_change=1`;
  return (
    <div className="rounded-xl bg-black/20 p-2">
      {title && <div className="text-xs opacity-70 mb-1">{title}</div>}
      <iframe
        src={src}
        title={title || symbol}
        width="100%"
        height={height}
        style={{ border: 0 }}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        allow="fullscreen"
      />
    </div>
  );
};

const Section: React.FC<{ heading: string; children: React.ReactNode }> = ({ heading, children }) => (
  <div className="rounded-2xl border border-white/10 p-4 mb-6">
    <div className="text-sm font-semibold opacity-80 mb-3">{heading}</div>
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
      {children}
    </div>
  </div>
);

export default function EquitiesCommoditiesPanel() {
  return (
    <div className="space-y-6">
      <Section heading="Equities">
        <TV symbol="NASDAQ:AAPL" title="AAPL" />
        <TV symbol="NASDAQ:MSFT" title="MSFT" />
        <TV symbol="NASDAQ:NVDA" title="NVDA" />
        <TV symbol="NASDAQ:TSLA" title="TSLA" />
      </Section>

      <Section heading="Commodities">
        <TV symbol="FOREXCOM:XAUUSD" title="Gold (XAUUSD)" />
        <TV symbol="TVC:USOIL" title="WTI Crude" />
        <TV symbol="TVC:UKOIL" title="Brent" />
        <TV symbol="COMEX:HG1!" title="Copper (HG1!)" />
      </Section>
    </div>
  );
}
