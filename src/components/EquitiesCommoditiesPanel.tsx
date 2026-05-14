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
      <div className="rounded-2xl border border-white/10 p-4 mb-6">
        <div className="text-sm font-semibold opacity-80 mb-1">Gold / Forex / Macro</div>
        <p className="text-[11px] text-white/50 mb-3">
          XAUUSD · USDZAR · EURUSD · GBPUSD · USDJPY · DXY — live charts via TradingView (Johannesburg time).
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          <TV symbol="OANDA:XAUUSD" title="Gold — XAUUSD" />
          <TV symbol="OANDA:USDZAR" title="USD/ZAR" />
          <TV symbol="FX:EURUSD" title="EUR/USD" />
          <TV symbol="FX:GBPUSD" title="GBP/USD" />
          <TV symbol="FX:USDJPY" title="USD/JPY" />
          <TV symbol="TVC:DXY" title="DXY — US Dollar Index" />
        </div>
      </div>

      <div className="rounded-2xl border border-cyan-500/20 p-4 mb-6 bg-cyan-950/10">
        <div className="text-sm font-semibold text-cyan-200/90 mb-1">Crypto Majors</div>
        <p className="text-[11px] text-white/50 mb-3">
          BTC · ETH · XRP · SOL — live chart tiles for <span className="text-cyan-200/80">XRP</span> and{" "}
          <span className="text-cyan-200/80">SOL</span> here; BTC and ETH are in the price blocks above. TradingView only — not SentoTrade signals.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <TV symbol="BINANCE:XRPUSDT" height={260} title="XRP — BINANCE:XRPUSDT" />
          <TV symbol="BINANCE:SOLUSDT" height={260} title="SOL — BINANCE:SOLUSDT" />
        </div>
      </div>

      <Section heading="AI / Semiconductors">
        <TV symbol="NASDAQ:NVDA"  title="NVDA — Nvidia" />
        <TV symbol="NASDAQ:AVGO"  title="AVGO — Broadcom" />
        <TV symbol="NYSE:TSM"     title="TSM — Taiwan Semi" />
        <TV symbol="NASDAQ:MU"    title="MU — Micron" />
        <TV symbol="NASDAQ:INTC"  title="INTC — Intel" />
        <TV symbol="NASDAQ:SMCI"  title="SMCI — Super Micro" />
        <TV symbol="NASDAQ:PANW"  title="PANW — Palo Alto" />
        <TV symbol="NASDAQ:SOUN"  title="SOUN — SoundHound AI" />
      </Section>

      <Section heading="Equities">
        <TV symbol="NASDAQ:GOOGL" title="GOOGL — Alphabet" />
        <TV symbol="NASDAQ:TSLA"  title="TSLA — Tesla" />
        <TV symbol="NASDAQ:AAPL"  title="AAPL — Apple" />
        <TV symbol="NASDAQ:MSFT"  title="MSFT — Microsoft" />
      </Section>

      <Section heading="Commodities">
        <TV symbol="COMEX:SI1!" title="Silver (COMEX)" />
        <TV symbol="TVC:USOIL" title="WTI Crude" />
        <TV symbol="TVC:UKOIL" title="Brent" />
        <TV symbol="COMEX:HG1!" title="Copper (HG1!)" />
      </Section>
    </div>
  );
}
