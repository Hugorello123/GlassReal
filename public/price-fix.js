/**
 * Dashboard price + 24h% patch (client-side only; reads /api/prices).
 */
(function () {
  function fmt(n) {
    n = Number(n);
    if (!Number.isFinite(n)) return null;
    return "$" + n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function fmtPct(n) {
    n = Number(n);
    if (!Number.isFinite(n)) return null;
    return (n >= 0 ? "+" : "") + n.toFixed(1) + "%";
  }
  function setColor(el, n) {
    if (!el || !Number.isFinite(Number(n))) return;
    el.classList.remove("text-green-400", "text-red-400");
    el.classList.add(Number(n) >= 0 ? "text-green-400" : "text-red-400");
  }
  function patchSparklineCard(headingStartsWith, priceStr, ch) {
    if (!priceStr) return;
    const h3s = Array.from(document.querySelectorAll("main h3"));
    const h = h3s.find((el) => {
      const t = (el.textContent || "").replace(/\s*🔄\s*/g, " ").trim().toLowerCase();
      return t.startsWith(headingStartsWith.toLowerCase());
    });
    if (!h) return;
    const card = h.closest("div.bg-gray-800") || h.closest("div.rounded-xl.shadow-md");
    if (!card) return;
    const priceP = card.querySelector("p.text-2xl");
    if (priceP) priceP.textContent = priceStr;
    const chP = card.querySelector("p.text-sm");
    if (chP && ch != null) {
      chP.textContent = fmtPct(ch) + " 24h";
      setColor(chP, ch);
    }
  }
  function patchTileContaining(labelNeedle, priceStr, ch) {
    if (!priceStr) return;
    const tiles = Array.from(document.querySelectorAll("main div.rounded-xl")).filter(
      (d) => (d.className || "").includes("min-h")
    );
    for (const tile of tiles) {
      if (!(tile.textContent || "").includes(labelNeedle)) continue;
      const nodes = Array.from(tile.querySelectorAll("div,span,p"));
      const dash = nodes.find((n) => (n.textContent || "").trim() === "—");
      if (dash) {
        dash.textContent = priceStr;
      } else {
        const money = nodes.find((n) => /^\$[\d,]+(\.\d+)?$/.test((n.textContent || "").trim()));
        if (money) money.textContent = priceStr;
      }
      const pct = nodes.find((n) => /24h/.test((n.textContent || "")));
      if (pct && ch != null) {
        pct.textContent = fmtPct(ch) + " 24h";
        setColor(pct, ch);
      }
      return;
    }
  }
  async function run() {
    try {
      const r = await fetch("/api/prices", { cache: "no-store" });
      const j = await r.json();
      const pr = j && j.prices ? j.prices : null;
      if (!pr) return;
      patchSparklineCard("eth price", fmt(pr.eth), pr.ethCh);
      patchSparklineCard("btc price", fmt(pr.btc), pr.btcCh);
      patchTileContaining("TESLA", fmt(pr.tsla), pr.tslaCh);
    } catch (_) {}
  }
  run();
  setTimeout(run, 600);
  setTimeout(run, 2000);
})();
