import { Link } from "react-router";
const TrialPayment = () => {
  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-10 space-y-6">
      <h1 className="text-2xl font-bold">Start Your Trial</h1>
      <p className="text-gray-400 text-center max-w-md">
        Get full access to Sentotrade for 24 hours for just $3.
        Experience real-time whale alerts, market intelligence, and AI-powered insights.
      </p>

      <div className="bg-white/10 p-6 rounded-xl w-full max-w-sm space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-gray-300">Sentotrade Trial</span>
          <span className="text-xl font-bold">$3.00</span>
        </div>
        <div className="border-t border-white/20 pt-4">
          <ul className="text-sm text-gray-300 space-y-2">
            <li>✓ 24 hours full access</li>
            <li>✓ Whale Alerts + AI Insights</li>
            <li>✓ Telegram Alerts</li>
            <li>✓ Real-time market data</li>
          </ul>
        </div>
      </div>

      <a
        href="https://www.paypal.com/paypalme/yourlink"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3 px-8 rounded-lg transition-colors"
      >
        Pay with PayPal →
      </a>

      <Link to="/onboarding" className="text-sm text-cyan-400 hover:text-cyan-300">
        I've paid — Continue to Onboarding →
      </Link>
    </div>
  );
};

export default TrialPayment;
