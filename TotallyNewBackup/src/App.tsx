// src/App.tsx
import React from "react";

// adjust these import paths only if your files live elsewhere
import Landing from "./landing";
import Dashboard from "./dashboard";

export default function App() {
  const path =
    (typeof window !== "undefined" ? window.location.pathname : "/").toLowerCase();

  if (path === "/" || path === "/index.html") return <Landing />;
  if (path.startsWith("/dashboard")) return <Dashboard />;

  // fallback
  return <Landing />;
}
