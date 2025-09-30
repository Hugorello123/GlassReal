import "./patches/killFmp";
// src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "./index.css";

import Landing from "./landing";
import Dashboard from "./dashboard";
import Login from "./login";
import TrialPayment from "./trial-payment";
import RawPayment from "./raw-payment";
import Onboarding from "./onboarding";
import GuruPage from "./pages/GuruPage";   // ✅ NEW IMPORT

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        {/* Public landing */}
        <Route path="/" element={<Landing />} />

        {/* Auth / onboarding */}
        <Route path="/login" element={<Login />} />
        <Route path="/onboarding" element={<Onboarding />} />

        {/* Payments */}
        <Route path="/trial" element={<TrialPayment />} />
        <Route path="/trial-payment" element={<TrialPayment />} />
        <Route path="/raw" element={<RawPayment />} />
        <Route path="/raw-payment" element={<RawPayment />} />

        {/* App */}
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/guru" element={<GuruPage />} />   {/* ✅ CLEAN ROUTE */}

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
