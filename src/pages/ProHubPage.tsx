import { Link } from "react-router";
import NavBar from "@/components/NavBar";

interface HubCard {
  id: string;
  title: string;
  desc: string;
  to: string;
  status: "live" | "evolving" | "preview" | "snapshot" | "reference";
  icon: string;
  color: string;
}

const CARDS: HubCard[] = [
  {
    id: "dashboard",
    title: "Dashboard",
    desc: "Live prices, whale alerts, tickers, gold, oil, forex, BTC — all in one view.",
    to: "/dashboard",
    status: "live",
    icon: "📊",
    color: "from-cyan-500/20 to-blue-500/20",
  },
  {
    id: "pro",
    title: "Pro Dashboard",
    desc: "Session bias, exchange flows, signals & analogs — the full trading terminal.",
    to: "/pro",
    status: "live",
    icon: "⚡",
    color: "from-yellow-500/20 to-amber-500/20",
  },
  {
    id: "watchdog",
    title: "Watchdog",
    desc: "Sentiment radar — headlines, themes, heat scores, asset pressure maps.",
    to: "/watchdog",
    status: "evolving",
    icon: "🛡️",
    color: "from-amber-500/20 to-orange-500/20",
  },
  {
    id: "guru",
    title: "Guru Insights",
    desc: "AI-powered synthesis of whales, news, prices & macro — the full read.",
    to: "/guru",
    status: "preview",
    icon: "🔮",
    color: "from-purple-500/20 to-pink-500/20",
  },
  {
    id: "signals",
    title: "Signals & Targets",
    desc: "Bias, drivers, windows & levels. Recent signals table with outcome tracking.",
    to: "/pro",
    status: "live",
    icon: "🎯",
    color: "from-green-500/20 to-emerald-500/20",
  },
  {
    id: "indices",
    title: "Indices",
    desc: "US Tech 100, S&P 500, Dow — quick markers & levels. (Coming: dedicated page)",
    to: "/dashboard",
    status: "live",
    icon: "📈",
    color: "from-blue-500/20 to-indigo-500/20",
  },
  {
    id: "predictions",
    title: "Predictions",
    desc: "Upcoming calls & outcome tracking. What we said vs what happened. (Coming soon)",
    to: "/pro",
    status: "live",
    icon: "🔭",
    color: "from-teal-500/20 to-cyan-500/20",
  },
  {
    id: "about",
    title: "About",
    desc: "What we're building and why — overview for users & investors.",
    to: "/",
    status: "reference",
    icon: "📖",
    color: "from-gray-500/20 to-slate-500/20",
  },
];

function StatusChip({ status }: { status: HubCard["status"] }) {
  const config = {
    live: { bg: "bg-green-500/15 text-green-400 border-green-500/30", label: "Live" },
    evolving: { bg: "bg-amber-500/15 text-amber-400 border-amber-500/30", label: "Evolving" },
    preview: { bg: "bg-purple-500/15 text-purple-400 border-purple-500/30", label: "Preview" },
    snapshot: { bg: "bg-blue-500/15 text-blue-400 border-blue-500/30", label: "Snapshot" },
    reference: { bg: "bg-gray-500/15 text-gray-400 border-gray-500/30", label: "Reference" },
  };
  const c = config[status];
  return (
    <span className={`text-xs px-2 py-1 rounded-full border ${c.bg}`}>
      {c.label}
    </span>
  );
}

export default function ProHubPage() {
  return (
    <>
      <NavBar current="hub" />
      <main className="min-h-screen bg-gradient-to-br from-black to-gray-900 text-white">
        <div className="max-w-6xl mx-auto px-6 py-10">
          {/* Header */}
          <div className="mb-10">
            <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-600">
              🎛️ Pro Hub
            </h1>
            <p className="text-gray-400 mt-2 max-w-xl">
              Your trading command center. Every tool, every signal, every insight — one click away.
            </p>
          </div>

          {/* Card Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {CARDS.map((card) => (
              <Link
                key={card.id}
                to={card.to}
                className={`group relative bg-gradient-to-br ${card.color} bg-opacity-10 rounded-2xl border border-white/10 p-5 hover:border-white/25 transition-all duration-200 hover:-translate-y-1 hover:shadow-xl`}
              >
                {/* Icon */}
                <div className="text-3xl mb-3">{card.icon}</div>

                {/* Title */}
                <h3 className="text-lg font-bold text-white mb-1 group-hover:text-cyan-300 transition-colors">
                  {card.title}
                </h3>

                {/* Description */}
                <p className="text-sm text-gray-400 mb-4 leading-relaxed">
                  {card.desc}
                </p>

                {/* Footer */}
                <div className="flex items-center justify-between mt-auto">
                  <StatusChip status={card.status} />
                  <span className="text-gray-500 text-lg group-hover:text-cyan-400 transition-colors">
                    ›
                  </span>
                </div>
              </Link>
            ))}
          </div>

          {/* Divider */}
          <hr className="border-white/10 my-10" />

          {/* Quick Legend */}
          <div className="bg-white/5 rounded-xl p-4 border border-white/10 mb-6">
            <h2 className="text-sm font-semibold text-gray-300 mb-2">📖 Legend</h2>
            <div className="flex flex-wrap gap-3 text-xs">
              <span className="text-green-400">● Live = Fully working</span>
              <span className="text-amber-400">● Evolving = Works, improving</span>
              <span className="text-purple-400">● Preview = Early version</span>
              <span className="text-blue-400">● Snapshot = Partial / planned</span>
              <span className="text-gray-400">● Reference = Info page</span>
            </div>
          </div>

          {/* System Status */}
          <div className="bg-white/5 rounded-xl p-5 border border-white/10">
            <h2 className="text-lg font-semibold text-gray-200 mb-4">
              🖥️ System Status
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-gray-300">Dashboard</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-gray-300">Pro Dashboard</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-gray-300">Watchdog</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="text-gray-300">Live Data (needs API keys)</span>
              </div>
            </div>
          </div>

          {/* Quote */}
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500 italic">
              “Not a bunch of pages — a trading system.”
            </p>
          </div>
        </div>
      </main>
    </>
  );
}
