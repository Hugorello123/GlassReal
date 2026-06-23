/**
 * Human-facing copy for swing test scorecard.
 * Plain language on top · "TEST DATA" framing · legal line once at bottom.
 * Internal field names (m1Hit, followOutcome) stay in code — never in hero UI.
 */

export const TEST = {
  badge: "TEST DATA",
  title: "Directional Scorecard",
  /** Short nav label — matches page title family */
  navLabel: "Directional",
  tagline: "Sentiment predicts direction · M1 confirms Pass or Miss within 24h.",
  oneLiner: "Did price confirm our sentiment call?",
  notLive: "Not live trades · not your P&L · not advice.",
  disclaimer:
    "Test data only. Not financial advice. Not trade recommendations. Gains and losses are gross moves before fees, spread, and slippage.",

  /** Headline KPIs */
  testsPassed: "Tests passed",
  avgGainPerTest: "Avg gain / test",
  testsRun: "tests run",

  /** Table */
  colPass: "Pass?",
  colBonus: "Extra run",
  colGainLoss: "Gain / Loss",
  colHoldTest: "Hold test",

  /** Result badges */
  pass: "Pass",
  miss: "Miss",
  pending: "Pending",
  open: "Open",
  watch: "Watch",

  /** Tooltips (asset-manager detail on hover) */
  tipPass: "Sentiment check: price hit the first bar (0.2–0.3%) in signal direction within 24h. Locks when hit — hold test runs separately.",
  tipGainLoss: "Test gain or loss using a small target and equal-sized stop. Not executed trades.",
  tipHoldTest: "Separate wide-target hold test — archive comparison only.",
  tipBonus: "Price ran further than the first target — bonus only.",

  /** Scoring details (collapsed) */
  scoringTitle: "How tests are scored (detail)",
  scoringBody:
    "1) Headline cluster + logic → Long/Short (tradeable) or Build (narrative e.g. SpaceX). 2) Price M1 bar within 24h = Pass for tradeable assets. 3) Narrative Pass = story intensifies in 24h — no ticker, no price target.",
} as const;

/** @deprecated use TEST.disclaimer */
export const SIM_DISCLAIMER = TEST.disclaimer;
