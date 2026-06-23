/** Swing test scoring helpers — pairs with testDataCopy.ts for human labels. */

import { TEST } from "@/lib/testDataCopy";

export { TEST, SIM_DISCLAIMER } from "@/lib/testDataCopy";

export type FollowRow = {
  id?: string;
  source?: string;
  status?: string;
  call?: string;
  asset?: string;
  outcome?: string;
  m1Hit?: boolean;
  m1Pct?: number;
  favPct?: number;
  followOutcome?: string;
  followWin?: boolean;
  /** Locked sentiment result — pass | miss (live, not wait for hold close) */
  dirQual?: "pass" | "miss" | string;
};

export function isSwingSignal(row: FollowRow): boolean {
  if (String(row.source || "").toLowerCase() === "swing") return true;
  return String(row.id || "").toLowerCase().startsWith("swg_");
}

export function isSentimentSignal(row: FollowRow): boolean {
  if (String(row.source || "").toLowerCase() === "sentiment") return true;
  return String(row.id || "").toLowerCase().startsWith("sen_");
}

export function isNarrativeSignal(row: FollowRow): boolean {
  if (String(row.source || "").toLowerCase() === "narrative") return true;
  return String(row.id || "").toLowerCase().startsWith("nar_");
}

/** Price sentiment + narrative predictions (scorecard default filter). */
export function isDirectionalLaneSignal(row: FollowRow): boolean {
  return isSentimentSignal(row) || isNarrativeSignal(row);
}

export function isDirectionalSignal(row: FollowRow): boolean {
  return isDirectionalLaneSignal(row) || isSwingSignal(row);
}

export function defaultM1Pct(asset: string | undefined): number {
  const k = String(asset || "").toUpperCase();
  if (k.includes("GOLD") || k === "SPX") return 0.2;
  return 0.3;
}

/** Map any legacy server string to human Gain/Loss (test) wording. */
export function normalizeQuickTestText(raw: string): string {
  const s = raw.trim();
  const gain = s.match(/(?:take profit|sim\.?\s*m1 exit|gain)\s*✓?\s*\(?\+?([\d.]+)%?\)?/i);
  if (gain) return `Gain +${gain[1]}%`;
  const loss = s.match(/(?:sim\.?\s*stop|stopped|loss)\s*\(?−?([\d.]+)%?\)?/i);
  if (loss) return `Loss −${loss[1]}%`;
  if (/no (m1 hit|hit|target)/i.test(s)) return "No target";
  return s
    .replace(/^take profit\s*✓?\s*/i, "Gain ")
    .replace(/^sim\.?\s*m1 exit\s*✓?\s*/i, "Gain ")
    .replace(/^sim\.?\s*stop\s*/i, "Loss ")
    .replace(/^stopped\s*/i, "Loss ");
}

/** Gain / Loss column — test model, not live P&L. */
export function quickTestLabel(row: FollowRow): { text: string; className: string } {
  if (isNarrativeSignal(row)) {
    if (row.followOutcome) {
      const win = row.followWin === true || String(row.followOutcome).toLowerCase().includes("building");
      return {
        text: row.followOutcome,
        className: win ? "text-emerald-400 font-semibold" : "text-red-400/90",
      };
    }
    if (row.dirQual === "pass") return { text: "Story building", className: "text-emerald-400 font-semibold" };
    if (row.dirQual === "miss") return { text: "Story faded", className: "text-red-400/90" };
    return { text: "—", className: "text-gray-500" };
  }
  if (row.followOutcome) {
    const text = normalizeQuickTestText(row.followOutcome);
    const win = row.followWin === true || text.startsWith("Gain");
    const loss = text.startsWith("Loss");
    return {
      text,
      className: win ? "text-emerald-400 font-semibold" : loss ? "text-red-400/90" : "text-gray-400",
    };
  }
  const st = String(row.status || "open").toLowerCase();
  if (st === "open" && isSwingSignal(row) && !row.dirQual) {
    return { text: "—", className: "text-gray-500" };
  }
  if (st === "open" && !isSwingSignal(row)) return { text: "—", className: "text-gray-500" };
  if (st === "watching") return { text: "N/A", className: "text-gray-500" };
  const m1 = row.m1Pct ?? defaultM1Pct(row.asset);
  if (row.m1Hit) {
    const pct = typeof row.favPct === "number" && row.favPct > 0 ? row.favPct : m1;
    return { text: `Gain +${pct.toFixed(1)}%`, className: "text-emerald-400 font-semibold" };
  }
  const oc = String(row.outcome || "").toLowerCase();
  if (oc.includes("stop-loss")) {
    return { text: `Loss −${m1.toFixed(1)}%`, className: "text-red-400/90" };
  }
  return { text: "No target", className: "text-gray-400" };
}

/** @deprecated use quickTestLabel */
export const followRuleLabel = quickTestLabel;

export type SwingFollowStats = {
  swingM1: number;
  swingTotal: number;
  swingM2: number;
  swingHitPct: number | null;
  followEvPct: number | null;
};

export function buildSentimentFollowStats(
  items: FollowRow[],
  api?: {
    sentimentM1?: number;
    sentimentDirTotal?: number;
    sentimentM2?: number;
    sentimentEvAvg?: number;
    narrativeM1?: number;
    narrativeDirTotal?: number;
  } | null
): SwingFollowStats {
  const priceM1 = api?.sentimentM1 ?? 0;
  const priceTotal = api?.sentimentDirTotal ?? 0;
  const narrM1 = api?.narrativeM1 ?? 0;
  const narrTotal = api?.narrativeDirTotal ?? 0;
  if (priceTotal > 0 || narrTotal > 0) {
    const swingM1 = priceM1 + narrM1;
    const swingTotal = priceTotal + narrTotal;
    return {
      swingM1,
      swingTotal,
      swingM2: api?.sentimentM2 ?? 0,
      swingHitPct: swingTotal > 0 ? Math.round((swingM1 / swingTotal) * 100) : null,
      followEvPct: typeof api?.sentimentEvAvg === "number" ? Number(api.sentimentEvAvg.toFixed(3)) : null,
    };
  }
  let swingM1 = 0;
  let swingTotal = 0;
  let swingM2 = 0;
  let evSum = 0;
  for (const r of items) {
    if (!isDirectionalLaneSignal(r)) continue;
    const dq = r.dirQual;
    const resolved = dq === "pass" || dq === "miss";
    if (!resolved && typeof r.m1Hit !== "boolean") continue;
    if (resolved) {
      swingTotal++;
      if (dq === "pass") swingM1++;
      if ((r as { m2Hit?: boolean }).m2Hit) swingM2++;
      if (isSentimentSignal(r)) {
        const m1 = r.m1Pct ?? defaultM1Pct(r.asset);
        evSum += dq === "pass" ? m1 : -m1;
      }
    }
  }
  return {
    swingM1,
    swingTotal,
    swingM2,
    swingHitPct: swingTotal > 0 ? Math.round((swingM1 / swingTotal) * 100) : null,
    followEvPct: swingTotal > 0 ? Number((evSum / swingTotal).toFixed(3)) : null,
  };
}

export function buildSwingFollowStats(
  items: FollowRow[],
  api?: { swingM1?: number; swingDirTotal?: number; swingM2?: number; followEvAvg?: number } | null
): SwingFollowStats {
  if (api?.swingDirTotal && api.swingDirTotal > 0) {
    const swingM1 = api.swingM1 ?? 0;
    const swingTotal = api.swingDirTotal;
    return {
      swingM1,
      swingTotal,
      swingM2: api.swingM2 ?? 0,
      swingHitPct: Math.round((swingM1 / swingTotal) * 100),
      followEvPct: typeof api.followEvAvg === "number" ? Number(api.followEvAvg.toFixed(3)) : null,
    };
  }
  let swingM1 = 0;
  let swingTotal = 0;
  let swingM2 = 0;
  let evSum = 0;
  for (const r of items) {
    if (!isSwingSignal(r)) continue;
    const dq = r.dirQual;
    const resolved = dq === "pass" || dq === "miss";
    if (!resolved && typeof r.m1Hit !== "boolean") continue;
    if (resolved) {
      swingTotal++;
      if (dq === "pass") swingM1++;
      if ((r as { m2Hit?: boolean }).m2Hit) swingM2++;
      const m1 = r.m1Pct ?? defaultM1Pct(r.asset);
      evSum += dq === "pass" ? m1 : -m1;
    } else if (typeof r.m1Hit === "boolean") {
      swingTotal++;
      if (r.m1Hit) swingM1++;
      if ((r as { m2Hit?: boolean }).m2Hit) swingM2++;
      const m1 = r.m1Pct ?? defaultM1Pct(r.asset);
      evSum += r.m1Hit ? m1 : -m1;
    }
  }
  return {
    swingM1,
    swingTotal,
    swingM2,
    swingHitPct: swingTotal > 0 ? Math.round((swingM1 / swingTotal) * 100) : null,
    followEvPct: swingTotal > 0 ? Number((evSum / swingTotal).toFixed(3)) : null,
  };
}

function swingDirResolved(row: FollowRow): "pass" | "miss" | null {
  if (row.dirQual === "pass" || row.m1Hit === true) return "pass";
  if (row.dirQual === "miss") return "miss";
  if (row.followOutcome) {
    const t = normalizeQuickTestText(row.followOutcome);
    if (t.startsWith("Gain")) return "pass";
    if (t.startsWith("Loss") || t === "No target") return "miss";
  }
  return null;
}

/** Human Pass / Miss badge for Result column. */
export function testResultBadge(row: FollowRow): { bg: string; text: string; label: string } {
  const dir = isDirectionalSignal(row) ? swingDirResolved(row) : null;
  if (dir === "pass") {
    return { bg: "bg-green-500/15", text: "text-green-400", label: TEST.pass };
  }
  if (dir === "miss") {
    return { bg: "bg-red-500/15", text: "text-red-400", label: TEST.miss };
  }
  const st = String(row.status || "open").toLowerCase();
  if (st === "open" && isDirectionalSignal(row)) {
    return { bg: "bg-amber-500/10", text: "text-amber-400/90", label: TEST.pending };
  }
  if (st === "open") return { bg: "bg-blue-500/15", text: "text-blue-400", label: TEST.open };
  if (st === "watching") return { bg: "bg-gray-500/10", text: "text-gray-500", label: TEST.watch };
  if (typeof row.m1Hit === "boolean") {
    return row.m1Hit
      ? { bg: "bg-green-500/15", text: "text-green-400", label: TEST.pass }
      : { bg: "bg-red-500/15", text: "text-red-400", label: TEST.miss };
  }
  return { bg: "bg-gray-500/10", text: "text-gray-500", label: "—" };
}
