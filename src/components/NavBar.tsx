// src/components/NavBar.tsx
import { Link } from "react-router";

interface NavBarProps {
  current: string;
}

export default function NavBar({ current }: NavBarProps) {
  const pages = [
    { id: "landing", label: "🏠 Home", to: "/" },
    { id: "dashboard", label: "📊 Dashboard", to: "/dashboard" },
    { id: "hub", label: "🎛️ Pro Hub", to: "/hub" },
    { id: "pro", label: "⚡ Pro", to: "/pro" },
    { id: "watchdog", label: "🛡️ Watchdog", to: "/watchdog" },
    { id: "guru", label: "🔮 Guru", to: "/guru" },
    { id: "indices", label: "📈 Indices", to: "/indices" },
    { id: "predictions", label: "🔭 Predictions", to: "/predictions" },
  ];

  return (
    <nav className="sticky top-0 z-50 bg-black/80 backdrop-blur-md border-b border-white/10">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/" className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-600">
          Sentotrade
        </Link>
        <div className="flex gap-1 sm:gap-3 text-xs sm:text-sm">
          {pages.map((p) => (
            <Link
              key={p.id}
              to={p.to}
              className={`px-2 py-1 rounded-md transition ${
                current === p.id
                  ? "bg-cyan-500/20 text-cyan-300 font-semibold"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              {p.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
