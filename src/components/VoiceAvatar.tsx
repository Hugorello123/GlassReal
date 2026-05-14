import { useState, useEffect } from "react";
import { useLocation } from "react-router";

const GUIDES: Record<string, string> = {
  "/": "Welcome to Sentotrade. Pick a plan that fits — Trial for a day, or RAW for full access. Then log in to see your dashboard.",
  "/hub": "Trader Hub. This is your launchpad. Pick Dashboard for live prices, Watchdog for news, or Live Edge Tests to see transparent signal experiments.",
  "/dashboard": "Dashboard. Live prices and whale alerts here. Start with the gossip widget — high intensity means something is moving.",
  "/predictions": "Live Edge Tests. These are transparent signal experiments — not trade recommendations. Add your own test, set a target, and come back to score it hit, missed, or partial.",
  "/guru": "Guru. Ask anything — Bitcoin outlook, oil risk, what to watch. Answers come from Sentotrade data only. No outside noise.",
  "/watchdog": "Watchdog. News scan and sentiment radar. Look for the themes with the most headlines — that is where volatility lives.",
  "/indices": "Indices. Check macro levels — S and P, Nasdaq, DXY. Big index moves often spill into crypto and commodities.",
  "/stats": "Stats. Live Edge Tests scorecard — hits, misses, partials, and open rows straight from the server predictions feed.",
  "/pro": "Trader Desk. Layer the signals. Combine gossip intensity, price action, and Guru insight before you decide.",
  "/tutor": "Trading 101. Long means up, short means down. Risk only what you can lose. And always confirm gossip with price.",
  default: "Sentotrade guide. Tap this button on any page for a voice walkthrough.",
};

export default function VoiceAvatar() {
  const [speaking, setSpeaking] = useState(false);
  const location = useLocation();
  const synth = window.speechSynthesis;

  const page = location.pathname;
  const text = GUIDES[page] || GUIDES.default;

  function toggle() {
    if (!synth) return;
    if (speaking) {
      synth.cancel();
      setSpeaking(false);
      return;
    }
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1;
    u.pitch = 1;
    u.volume = 1;
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    synth.speak(u);
    setSpeaking(true);
  }

  // Cancel speech on page change
  useEffect(() => {
    if (speaking && synth) {
      synth.cancel();
      setSpeaking(false);
    }
  }, [location.pathname]);

  if (!synth) return null;
  if (page === "/" || page === "") return null;

  return (
    <button
      onClick={toggle}
      title={speaking ? "Stop" : "Voice guide"}
      className={`fixed top-20 left-4 z-50 w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition ${
        speaking
          ? "bg-red-500 hover:bg-red-400 text-white animate-pulse"
          : "bg-cyan-600 hover:bg-cyan-500 text-white"
      }`}
    >
      {speaking ? "⏹" : "🔊"}
    </button>
  );
}
