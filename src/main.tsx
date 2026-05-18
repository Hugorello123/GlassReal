import "./patches/killFmp";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter, Routes, Route } from "react-router";
import "./index.css";

import Landing from "./landing";
import Dashboard from "./dashboard";
import Login from "./login";
import TrialPayment from "./trial-payment";
import RawPayment from "./raw-payment";
import Onboarding from "./onboarding";
import GuruPage from "./pages/GuruPage";
import WatchdogPage from "./pages/WatchdogPage";
import ProHubPage from "./pages/ProHubPage";
import ProDashboardPage from "./pages/ProDashboardPage";
import IndicesPage from "./pages/IndicesPage";
import PredictionsPage from "./pages/PredictionsPage";
import DisplayPage from "./pages/DisplayPage";
import StatsPage from "./pages/StatsPage";
import TutorPage from "./pages/TutorPage";
import VoiceAvatar from "./components/VoiceAvatar";
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <HashRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/trial" element={<TrialPayment />} />
        <Route path="/trial-payment" element={<TrialPayment />} />
        <Route path="/raw" element={<RawPayment />} />
        <Route path="/raw-payment" element={<RawPayment />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/guru" element={<GuruPage />} />
        <Route path="/watchdog" element={<WatchdogPage />} />
        <Route path="/hub" element={<ProHubPage />} />
        <Route path="/pro" element={<ProDashboardPage />} />
        <Route path="/indices" element={<IndicesPage />} />
        <Route path="/predictions" element={<PredictionsPage />} />
        <Route path="/display" element={<DisplayPage />} />
        {/* Stats: Live Edge Tests scorecard (reads /api/predictions) */}
        <Route path="/stats" element={<StatsPage />} />
        <Route path="/tutor" element={<TutorPage />} />
        <Route path="*" element={<Landing />} />
      </Routes>
      <VoiceAvatar />
    </HashRouter>
  </StrictMode>,
);
