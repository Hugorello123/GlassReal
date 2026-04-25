// src/patches/killFmp.ts
export {}; // keep TS happy

(function () {
  const TARGET = "https://financialmodelingprep.com/api/v3/quotes/commodity";
  const origFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url =
      typeof input === "string"
        ? input
        : (input as URL).toString?.() ?? (input as any).url;

    if (typeof url === "string" && url.startsWith(TARGET)) {
      // No network call, no 429. Return empty list so UI stays happy.
      return new Response("[]", {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    return origFetch(input as any, init);
  };
})();
