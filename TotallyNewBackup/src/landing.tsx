// /src/landing.tsx

const Landing = () => {
  return (
    <main className="min-h-screen bg-gradient-to-br from-black to-gray-900 text-white flex flex-col items-center justify-center px-4">
      <h1 className="text-5xl font-bold mb-10 bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-600">
        GlassTrade
      </h1>

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
          <a
           href="/trial-payment"
            className="inline-block bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded"
          >
            Try Now
          </a>
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
          <a
            href="/raw-payment"
            className="inline-block bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
          >
            Subscribe RAW
          </a>
        </div>
      </div>
      {/* End of Cards */}
      <a
        href="/login"
        className="mt-10 text-sm text-cyan-400 underline hover:text-cyan-300 transition-colors"
      >
        Returning user? Log in →
      </a>

      {/* Developer sneak peek link */}
      <a
        href="/dashboard"
        className="text-sm text-cyan-400 underline mt-10 block text-center hover:text-cyan-300 transition-colors"
      >
        Developer sneak peek: Go to Dashboard →
      </a>
    </main>
  );
};

export default Landing;
