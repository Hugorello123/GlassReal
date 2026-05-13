// src/landing.tsx
import { Link } from "react-router";

const Landing = () => {
  return (
    <main className="min-h-screen bg-gradient-to-br from-black to-gray-900 text-white flex flex-col items-center justify-center px-4 py-12">

      {/* Hero */}
      <h1 className="text-3xl sm:text-5xl font-bold mb-3 bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-600">
        SentoTrade
      </h1>
      <p className="text-gray-400 text-base mb-10 text-center max-w-md">
        Market intelligence for independent traders.
      </p>

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

        {/* TRIAL Card — highlighted */}
        <div className="relative bg-cyan-950/60 border-2 border-cyan-500/60 p-6 rounded-2xl shadow-xl flex flex-col md:scale-[1.03]">
          <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-cyan-500 text-black text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
            Most Popular
          </span>
          <h2 className="text-xl font-bold mb-1 text-cyan-300">Trial</h2>
          <p className="mb-4 text-sm text-cyan-200/70">$3 / 24 hours</p>
          <ul className="text-sm text-gray-200 mb-6 space-y-2 flex-1">
            <li>✓ Full Market Pulse access</li>
            <li>✓ Live Edge Tests</li>
            <li>✓ Watchdog theme scanner</li>
            <li>✓ Telegram onboarding alerts</li>
          </ul>
          <Link
            to="/trial-payment"
            className="inline-block text-center bg-cyan-500 hover:bg-cyan-400 text-black font-bold py-2 px-4 rounded-lg transition"
          >
            Try Now — $3
          </Link>
        </div>

        {/* RAW Card */}
        <div className="bg-white/5 border border-green-500/30 p-6 rounded-2xl shadow-md flex flex-col">
          <h2 className="text-xl font-bold mb-1 text-green-300">RAW</h2>
          <p className="mb-4 text-sm text-gray-400">$79 / month</p>
          <ul className="text-sm text-gray-300 mb-6 space-y-2 flex-1">
            <li>✓ Everything in Trial</li>
            <li>✓ Trader Desk access</li>
            <li>✓ Full intelligence dashboard</li>
            <li>✓ Priority alert pipeline</li>
          </ul>
          <Link
            to="/raw-payment"
            className="inline-block text-center bg-green-700 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg transition"
          >
            Subscribe RAW
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
            <span className="text-xs text-gray-500 mt-1">Market Pulse, live prices, intelligence feed</span>
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
