// src/landing.tsx
import { Link } from "react-router";

const Landing = () => {
  return (
    <main className="min-h-screen bg-gradient-to-br from-black to-gray-900 text-white flex flex-col items-center justify-center px-4 py-12">

      {/* Brand + Hero */}
      <p className="text-cyan-400/90 text-sm font-semibold tracking-wide uppercase mb-2">SentoTrade</p>
      <h1 className="text-3xl sm:text-5xl font-bold mb-4 text-center max-w-3xl leading-tight bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-600">
        Stop cycling through 20 tabs.
      </h1>
      <p className="text-gray-200 text-base sm:text-lg mb-4 text-center max-w-2xl leading-relaxed">
        SentoTrade is a fast market-pressure radar for retail traders. It tracks headline momentum, price shocks, macro
        pressure, and Live Edge Tests across crypto, gold, forex, oil, and AI stocks — all on one clean screen.
      </p>
      <p className="text-gray-400 text-sm mb-10 text-center max-w-2xl leading-relaxed">
        Built for traders who want to see what is heating up before the move becomes obvious. Not a broker. Not trade
        advice.
      </p>

      {/* Feature cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-5xl w-full mb-12">
        <div className="bg-white/5 border border-white/10 p-5 rounded-2xl">
          <h2 className="text-lg font-bold text-cyan-300 mb-2">Fast Pulse</h2>
          <p className="text-sm text-gray-300 leading-relaxed">
            SentoTrade scans market headlines and price movement to detect sudden pressure across crypto, gold, forex,
            oil, and AI stocks.
          </p>
        </div>
        <div className="bg-white/5 border border-white/10 p-5 rounded-2xl">
          <h2 className="text-lg font-bold text-cyan-300 mb-2">Price Shocks</h2>
          <p className="text-sm text-gray-300 leading-relaxed">
            The radar checks short-window price movement using Yahoo Finance and CoinGecko feeds. If Gold, BTC, ETH, or
            Oil moves sharply, it can trigger a Breaking Pulse.
          </p>
        </div>
        <div className="bg-white/5 border border-white/10 p-5 rounded-2xl">
          <h2 className="text-lg font-bold text-cyan-300 mb-2">Live Edge Tests</h2>
          <p className="text-sm text-gray-300 leading-relaxed">
            Transparent gross market-move checks. They show what fired, why it fired, the observation window, and
            whether the market moved as expected — before spread, slippage, fees, and platform costs.
          </p>
        </div>
        <div className="bg-white/5 border border-white/10 p-5 rounded-2xl">
          <h2 className="text-lg font-bold text-cyan-300 mb-2">Guru AI Briefing</h2>
          <p className="text-sm text-gray-300 leading-relaxed">
            Ask for an objective market-readiness briefing on an asset and timeframe. It explains pressure, risks,
            invalidation, and what is worth watching — not trade instructions.
          </p>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl w-full">

        {/* FREE Card */}
        <div className="bg-white/5 border border-white/10 p-6 rounded-2xl shadow-md flex flex-col">
          <h2 className="text-xl font-bold mb-1">Free</h2>
          <p className="mb-4 text-sm text-gray-400">No payment required</p>
          <ul className="text-sm text-gray-300 mb-6 space-y-2 flex-1">
            <li>✓ Market Pulse preview</li>
            <li>✓ Trader Hub access</li>
            <li>✓ Dashboard preview</li>
            <li>✓ No account needed</li>
          </ul>
          <Link
            to="/hub"
            className="inline-block text-center bg-white/10 hover:bg-white/20 text-white font-semibold py-2 px-4 rounded-lg transition"
          >
            Preview Free
          </Link>
        </div>

        {/* Founder Beta Trial — highlighted */}
        <div className="relative bg-cyan-950/60 border-2 border-cyan-500/60 p-6 rounded-2xl shadow-xl flex flex-col md:scale-[1.03]">
          <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-cyan-500 text-black text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
            Most Popular
          </span>
          <h2 className="text-xl font-bold mb-1 text-cyan-300 pt-1">Founder Beta Trial — $3 / 24h</h2>
          <p className="mb-2 text-sm text-gray-200 leading-snug">
            A small beta access pass to support live data checks, server use, and alert delivery.
          </p>
          <p className="mb-3 text-sm text-cyan-200/80 font-medium">Full access to the radar.</p>
          <ul className="text-sm text-gray-200 mb-4 space-y-2 flex-1">
            <li>✓ Breaking Pulse</li>
            <li>✓ Price Shocks</li>
            <li>✓ Live Edge Tests</li>
            <li>✓ Stats</li>
            <li>✓ Watchdog</li>
            <li>✓ Guru AI Briefing</li>
            <li>✓ Telegram alerts</li>
          </ul>
          <div className="mb-5 text-xs text-gray-400 leading-relaxed border-t border-white/10 pt-4">
            <p className="font-semibold text-gray-300 mb-1">Why $3?</p>
            <p>
              This small beta access pass helps cover live data checks, server use, and alert delivery while keeping
              spam out of the system.
            </p>
          </div>
          <Link
            to="/trial-payment"
            className="inline-block text-center bg-cyan-500 hover:bg-cyan-400 text-black font-bold py-2 px-4 rounded-lg transition"
          >
            Start Founder Beta — $3
          </Link>
        </div>

        {/* RAW Card — Founder Access waitlist */}
        <div className="relative bg-white/5 border border-green-500/30 p-6 rounded-2xl shadow-md flex flex-col">
          <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500/90 text-black text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide whitespace-nowrap">
            Launching in 14 days
          </span>
          <h2 className="text-xl font-bold mb-1 text-green-300 pt-2">RAW Founder Access — launching in 14 days</h2>
          <p className="mb-2 text-sm text-gray-200 font-medium">$79 / month</p>
          <p className="mb-4 text-xs text-gray-400 leading-relaxed">
            For serious users who want ongoing access, priority alerting, and higher Guru AI briefing limits.
          </p>
          <p className="mb-3 text-xs text-amber-200/90">Want early access? Contact us.</p>
          <ul className="text-sm text-gray-300 mb-6 space-y-2 flex-1">
            <li>✓ Everything in Trial</li>
            <li>✓ Ongoing full radar access</li>
            <li>✓ Priority Telegram alert pipeline</li>
            <li>✓ Higher Guru AI briefing limits — coming soon</li>
            <li>✓ Founder access before public rollout</li>
          </ul>
          <Link
            to="/onboarding?plan=raw-waitlist"
            className="inline-block text-center bg-green-700/90 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg transition border border-green-500/40"
          >
            Join RAW Waitlist
          </Link>
        </div>
      </div>

      {/* Preview Section */}
      <div className="mt-10 bg-white/5 border border-white/10 rounded-2xl p-6 max-w-5xl w-full">
        <h2 className="text-xl font-bold mb-1 text-center">Explore the App</h2>
        <p className="text-sm text-gray-400 text-center mb-5">
          All tools visible. Subscribe when you're ready.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Link
            to="/hub"
            className="flex flex-col items-center p-4 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 hover:from-cyan-500/20 hover:to-blue-500/20 rounded-xl transition text-center group border border-cyan-500/20"
          >
            <span className="text-2xl mb-2 group-hover:scale-110 transition">🎛️</span>
            <span className="font-semibold text-sm text-cyan-300">Trader Hub</span>
            <span className="text-xs text-gray-500 mt-1">All tools, one launchpad</span>
          </Link>

          <Link
            to="/dashboard"
            className="flex flex-col items-center p-4 bg-white/5 hover:bg-white/10 rounded-xl transition text-center group"
          >
            <span className="text-2xl mb-2 group-hover:scale-110 transition">📊</span>
            <span className="font-semibold text-sm">Dashboard</span>
            <span className="text-xs text-gray-500 mt-1">Market Pulse, gold &amp; forex charts, live prices, intelligence feed</span>
          </Link>

          <Link
            to="/watchdog"
            className="flex flex-col items-center p-4 bg-white/5 hover:bg-white/10 rounded-xl transition text-center group"
          >
            <span className="text-2xl mb-2 group-hover:scale-110 transition">🛡️</span>
            <span className="font-semibold text-sm">Watchdog</span>
            <span className="text-xs text-gray-500 mt-1">Theme scanner and asset impact radar</span>
          </Link>

          <Link
            to="/guru"
            className="flex flex-col items-center p-4 bg-white/5 hover:bg-white/10 rounded-xl transition text-center group"
          >
            <span className="text-2xl mb-2 group-hover:scale-110 transition">🔮</span>
            <span className="font-semibold text-sm">Guru</span>
            <span className="text-xs text-gray-500 mt-1">AI interpretation of market pressure</span>
          </Link>
        </div>

        <div className="mt-4 flex justify-center gap-4 text-xs">
          <Link to="/login" className="text-cyan-400 hover:text-cyan-300 underline">
            Returning user? Log in →
          </Link>
          <Link to="/onboarding" className="text-cyan-400 hover:text-cyan-300 underline">
            New user setup →
          </Link>
        </div>
      </div>

      {/* Hidden legacy anchor */}
      <div id="low-links" className="mt-4 text-center text-xs opacity-5" aria-hidden="true">
        <Link to="/dashboard" className="block text-white/10">.</Link>
      </div>
    </main>
  );
};

export default Landing;
