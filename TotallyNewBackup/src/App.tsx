// src/App.tsx
import React from "react";
import Landing from "@/landing";         // whatever you already import here
import Dashboard from "@/dashboard";     // whatever you already import here
import TrialPayment from "@/trial-payment";
import RawPayment from "@/raw-payment";

export default function App() {
  const path = typeof window !== "undefined" ? window.location.pathname : "/";

  if (path === "/" || path === "/index.html") return <Landing />;
  if (path.startsWith("/dashboard")) return <Dashboard />;
  if (path.startsWith("/trial-payment")) return <TrialPayment />;
  if (path.startsWith("/raw-payment")) return <RawPayment />;

  // fallback
  return <Landing />;
}
