// src/components/NavBar.tsx
import { useState } from "react";
import { Link } from "react-router";

interface NavBarProps {
  current: string;
}

export default function NavBar({ current }: NavBarProps) {
  const [open, setOpen] = useState(false);

  const pages = [
    { id: "landing",     label: "🏠 Home",           to: "/" },
    { id: "dashboard",   label: "📊 Dashboard",       to: "/dashboard" },
    { id: "hub",         label: "🎛️ Trader Hub",      to: "/hub" },
    { id: "pro",         label: "⚡ Trader Desk",      to: "/pro" },
    { id: "watchdog",    label: "🛡️ Watchdog",        to: "/watchdog" },
    { id: "guru",        label: "🔮 Guru",             to: "/guru" },
    { id: "indices",     label: "📈 Indices",          to: "/indices" },
    { id: "predictions", label: "🧪 Live Edge Tests",  to: "/predictions" },
    { id: "stats",       label: "📊 Stats",            to: "/stats" },
    { id: "tutor",       label: "📚 101",              to: "/tutor" },
  ];

  const linkClass = (id: string) =>
    `block px-3 py-2 rounded-md transition text-sm ${
      current === id
        ? "bg-cyan-500/20 text-cyan-300 font-semibold"
        : "text-gray-400 hover:text-white hover:bg-white/5"
    }`;

  return (
    <nav className="sticky top-0 z-50 bg-black/90 backdrop-blur-md border-b border-white/10">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo */}
        <Link
          to="/"
          className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-600 shrink-0"
        >
          Sentotrade
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex gap-1 text-sm">
          {pages.map((p) => (
            <Link key={p.id} to={p.to} className={linkClass(p.id)}>
              {p.label}
            </Link>
          ))}
        </div>

        {/* Mobile hamburger — visible cyan button */}
        <button
          className="md:hidden flex items-center justify-center w-10 h-10 rounded-md bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-xl hover:bg-cyan-500/30 transition"
          onClick={() => setOpen((o) => !o)}
          aria-label="Toggle menu"
        >
          {open ? "✕" : "☰"}
        </button>
      </div>

      {/* Mobile dropdown */}
      {open && (
        <div className="md:hidden border-t border-white/10 bg-black/95 px-4 py-3 grid grid-cols-2 gap-1">
          {pages.map((p) => (
            <Link
              key={p.id}
              to={p.to}
              className={linkClass(p.id)}
              onClick={() => setOpen(false)}
            >
              {p.label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}
