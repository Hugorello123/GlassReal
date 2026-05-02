/**
 * Optional mount: add <div id="predictions-server-mount"></div> on a page that loads this script.
 * Fetches /api/predictions and renders a compact table (tight margins vs legacy 20px/16px box).
 */
(function () {
  const mount = document.getElementById("predictions-server-mount");
  if (!mount) return;

  async function load() {
    try {
      const r = await fetch("/api/predictions");
      const j = await r.json();
      const items = Array.isArray(j?.items) ? j.items : [];

      mount.textContent = "";
      const box = document.createElement("div");
      box.style.cssText =
        "margin:12px 0;padding:12px;border:1px solid #334155;border-radius:12px;background:#0b1220;color:#e2e7eb;position:relative;z-index:1;";

      const title = document.createElement("div");
      title.textContent = "Server signals (recent)";
      title.style.cssText = "font-size:12px;font-weight:600;margin-bottom:8px;color:#94a3b8;";
      box.appendChild(title);

      if (!items.length) {
        const empty = document.createElement("p");
        empty.textContent = "No server predictions yet.";
        empty.style.cssText = "margin:0;font-size:13px;color:#64748b;";
        box.appendChild(empty);
        mount.appendChild(box);
        return;
      }

      const table = document.createElement("table");
      table.style.cssText = "width:100%;border-collapse:collapse;font-size:13px;";
      const thead = document.createElement("thead");
      thead.innerHTML =
        "<tr style=\"text-align:left;border-bottom:1px solid #334155;color:#94a3b8;font-size:11px;text-transform:uppercase;\">" +
        "<th style=\"padding:6px 8px 8px 0;\">Asset</th>" +
        "<th style=\"padding:6px 8px 8px 0;\">Call</th>" +
        "<th style=\"padding:6px 8px 8px 0;\">Status</th>" +
        "<th style=\"padding:6px 8px 8px 0;\">Horizon</th>" +
        "</tr>";
      table.appendChild(thead);
      const tbody = document.createElement("tbody");
      for (const row of items.slice(0, 20)) {
        const tr = document.createElement("tr");
        tr.style.cssText = "border-bottom:1px solid #1e293b;";
        const asset = row.asset ?? "—";
        const call = row.call ?? "—";
        const status = row.status ?? "—";
        const horizon = row.horizon ?? row.timeframe ?? "—";
        tr.innerHTML =
          "<td style=\"padding:8px 8px 8px 0;\">" +
          escapeHtml(String(asset)) +
          "</td>" +
          "<td style=\"padding:8px 8px 8px 0;\">" +
          escapeHtml(String(call)) +
          "</td>" +
          "<td style=\"padding:8px 8px 8px 0;\">" +
          escapeHtml(String(status)) +
          "</td>" +
          "<td style=\"padding:8px 8px 8px 0;color:#94a3b8;\">" +
          escapeHtml(String(horizon)) +
          "</td>";
        tbody.appendChild(tr);
      }
      table.appendChild(tbody);
      box.appendChild(table);
      mount.appendChild(box);
    } catch (e) {
      console.warn("[predictions-server-bridge]", e);
    }
  }

  function escapeHtml(s) {
    return s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  load();
})();
