import { Link } from "react-router";
import NavBar from "@/components/NavBar";

export default function TutorPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-black to-gray-900 text-white">
      <NavBar current="tutor" />
      <div className="max-w-3xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-bold mb-6">Trading 101</h1>

        <p className="text-gray-400 mb-8">
          Sentotrade is non-custodial research. We do not hold funds or execute trades.
        </p>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-cyan-300 mb-3">Long vs Short</h2>
          <p className="text-gray-300">Long = expect the price to go up. Short = expect the price to go down.</p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-cyan-300 mb-3">Gossip Engine</h2>
          <p className="text-gray-300">Spywords and sentiment can lead price moves. Always use them with price confirmation — never trade headlines alone.</p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-cyan-300 mb-3">Guru</h2>
          <p className="text-gray-300">Guru uses Sentotrade data only — prices, gossip, predictions. No outside noise, no generic web search.</p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-red-400 mb-3">Risk Warning</h2>
          <p className="text-gray-300">Educational use only. Never risk money you cannot afford to lose. Past performance does not predict future results.</p>
        </section>

        <div className="mt-10">
          <Link to="/dashboard" className="text-cyan-400 hover:underline">← Back to Dashboard</Link>
        </div>
      </div>
    </div>
  );
}
