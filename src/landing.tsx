// src/landing.tsx
import { Link } from "react-router";

const Landing = () => {
  return (
    <main className="min-h-screen bg-gradient-to-br from-black to-gray-900 text-white flex flex-col items-center justify-center px-4">
      <h1 className="text-5xl font-bold mb-10 bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-600">
        Sentotrade
      </h1>

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl w-full">
        {/* Trial Card */}
        <div className="bg-white/10 p-6 rounded-2xl shadow-md hover:scale-105 transition transform duration-300">
          <h2 className="text-2xl font-bold mb-2">Trial</h2>
          <p className="mb-4 text-sm text-gray-300">$3 / 24 hours</p>
          <ul className="text-sm text-gray-300 mb-6 space-y-1">
            <li>✓ Full feature access</li>
            <li>✓ Whale Alerts + AI Insights</li>
            <li>✓ Telegram Alerts</li>
          </ul>
          <Link
            to="/trial-payment"
            className="inline-block bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded"
          >
            Try Now
          </Link>
        </div>

        {/* RAW Card */}
        <div className="bg-white/10 p-6 rounded-2xl shadow-md hover:scale-105 transition transform duration-300">
          <h2 className="text-2xl font-bold mb-2">RAW</h2>
          <p className="mb-4 text-sm text-gray-300">$79 / month</p>
          <ul className="text-sm text-gray-300 mb-6 space-y-1">
            <li>✓ Everything in Trial</li>
            <li>✓ Equity + Commodities Intelligence</li>
            <li>✓ Institutional-Grade Access</li>
          </ul>
          <Link
            to="/raw-payment"
            className="inline-block bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
          >
            Subscribe RAW
          </Link>
        </div>
      </div>

      {/* Preview Section — visible, styled */}
      <div className="mt-10 bg-white/5 border border-white/10 rounded-2xl p-6 max-w-4xl w-full">
        <h2 className="text-xl font-bold mb-1 text-center">Preview the App</h2>
        <p className="text-sm text-gray-400 text-center mb-5">
          Explore the dashboard and tools before subscribing. No payment required.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Link
            to="/hub"
            className="flex flex-col items-center p-4 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 hover:from-cyan-500/20 hover:to-blue-500/20 rounded-xl transition text-center group border border-cyan-500/20"
          >
            <span className="text-2xl mb-2 group-hover:scale-110 transition">🎛️</span>
            <span className="font-semibold text-sm text-cyan-300">Pro Hub</span>
            <span className="text-xs text-gray-500 mt-1">All tools, one control room</span>
          </Link>

          <Link
            to="/dashboard"
            className="flex flex-col items-center p-4 bg-white/5 hover:bg-white/10 rounded-xl transition text-center group"
          >
            <span className="text-2xl mb-2 group-hover:scale-110 transition">📊</span>
            <span className="font-semibold text-sm">Dashboard</span>
            <span className="text-xs text-gray-500 mt-1">Live prices, tickers, whale alerts</span>
          </Link>

          <Link
            to="/watchdog"
            className="flex flex-col items-center p-4 bg-white/5 hover:bg-white/10 rounded-xl transition text-center group"
          >
            <span className="text-2xl mb-2 group-hover:scale-110 transition">🛡️</span>
            <span className="font-semibold text-sm">Watchdog</span>
            <span className="text-xs text-gray-500 mt-1">Sentiment radar & market themes</span>
          </Link>

          <Link
            to="/guru"
            className="flex flex-col items-center p-4 bg-white/5 hover:bg-white/10 rounded-xl transition text-center group"
          >
            <span className="text-2xl mb-2 group-hover:scale-110 transition">🔮</span>
            <span className="font-semibold text-sm">Guru Insights</span>
            <span className="text-xs text-gray-500 mt-1">AI-powered market analysis</span>
          </Link>
        </div>

        <div className="mt-4 flex justify-center gap-4 text-xs">
          <Link
            to="/login"
            className="text-cyan-400 hover:text-cyan-300 underline"
          >
            Returning user? Log in →
          </Link>
          <Link
            to="/onboarding"
            className="text-cyan-400 hover:text-cyan-300 underline"
          >
            New user setup →
          </Link>
        </div>
      </div>

      {/* Old hidden links — keep but even more hidden */}
      <div
        id="low-links"
        className="mt-4 text-center text-xs opacity-5"
        aria-hidden="true"
      >
        <Link to="/dashboard" className="block text-white/10">.</Link>
      </div>
    </main>
  );
};

export default Landing;
