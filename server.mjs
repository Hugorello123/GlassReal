import https from "https";
import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT || 8443;
const POLYGON_KEY = process.env.VITE_POLYGON_KEY || "";
const BITQUERY_TOKEN = process.env.VITE_BITQUERY_TOKEN || "";
const NEWSCATCHER_KEY = process.env.VITE_NEWSCATCHER_KEY || "";
const SSL_KEY = process.env.SSL_KEY || "/home/vmbsinyo/glasstrade-certs/privkey.pem";
const SSL_CERT = process.env.SSL_CERT || "/home/vmbsinyo/glasstrade-certs/fullchain.pem";
const hasSSL = fs.existsSync(SSL_KEY) && fs.existsSync(SSL_CERT);

console.log("[Sentotrade]");
console.log(" PORT:", PORT);
console.log(" SSL:", hasSSL);

const mimeTypes = {
  ".html": "text/html", ".js": "application/javascript", ".css": "text/css",
  ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg", ".gif": "image/gif", ".svg": "image/svg+xml",
  ".ico": "image/x-icon", ".woff2": "font/woff2", ".woff": "font/woff", ".ttf": "font/ttf"
};

function handleRequest(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") { res.writeHead(200); return res.end(); }

  const url = req.url;
  if (url === "/api/health") {
    return res.writeHead(200, {"Content-Type": "application/json"}).end(JSON.stringify({
      status: "ok", time: new Date().toISOString(), ssl: hasSSL,
      keys: { polygon: !!POLYGON_KEY, bitquery: !!BITQUERY_TOKEN, newscatcher: !!NEWSCATCHER_KEY }
    }));
  }

  if (url === "/api/news") {
    (async () => {
      let articles = [];
      if (NEWSCATCHER_KEY) {
        try {
          const r = await fetch("https://newscatcher.p.rapidapi.com/v1/search_free?q=crypto&lang=en&page=1&page_size=20&sort_by=relevancy", {
            headers: { "x-rapidapi-key": NEWSCATCHER_KEY, "x-rapidapi-host": "newscatcher.p.rapidapi.com" }
          });
          const d = await r.json();
          if (d?.articles?.length) articles = d.articles.map(a => ({title: a.title, url: a.link})).slice(0, 20);
        } catch(e){}
      }
      if (!articles.length) {
        try {
          const r = await fetch("https://api.gdeltproject.org/api/v2/doc/doc?query=crypto+OR+bitcoin+OR+gold&mode=artlist&maxrecords=20&sort=datedesc&format=json");
          const d = await r.json();
          if (d?.articles?.length) articles = d.articles.map(a => ({title: a.title || "News", url: a.url})).slice(0, 20);
        } catch(e){}
      }
      if (!articles.length) articles = [{title: "News temporarily unavailable", url: "#"}];
      res.writeHead(200, {"Content-Type": "application/json"}).end(JSON.stringify({articles}));
    })();
    return;
  }

  if (url === "/api/flow/btc" || url === "/api/flow/eth") {
    return res.writeHead(200, {"Content-Type": "application/json"}).end(JSON.stringify({
      status: "connect_bitquery", to_exch: {count: 0, usd: 0}, from_exch: {count: 0, usd: 0}
    }));
  }

  if (url === "/api/stable/usdt-eth") {
    return res.writeHead(200, {"Content-Type": "application/json"}).end(JSON.stringify({
      status: "connect_etherscan", mints: {count: 0, usd: 0}, burns: {count: 0, usd: 0}
    }));
  }

  if (url === "/api/watchdog/summary") {
    return res.writeHead(200, {"Content-Type": "application/json"}).end(JSON.stringify([]));
  }

  if (url === "/api/signal/recent") {
    return res.writeHead(200, {"Content-Type": "application/json"}).end(JSON.stringify([]));
  }

  const staticDir = path.join(__dirname, "public");
  let filePath = path.join(staticDir, url === "/" ? "index.html" : url);
  if (!fs.existsSync(filePath) && !path.extname(filePath)) {
    const htmlPath = filePath + ".html";
    if (fs.existsSync(htmlPath)) filePath = htmlPath;
  }
  if (!fs.existsSync(filePath)) filePath = path.join(staticDir, "index.html");

  const ext = path.extname(filePath).toLowerCase();
  const contentType = mimeTypes[ext] || "application/octet-stream";
  fs.readFile(filePath, (err, content) => {
    if (err) { res.writeHead(404, {"Content-Type": "text/plain"}); return res.end("Not found"); }
    res.writeHead(200, {"Content-Type": contentType});
    res.end(content);
  });
}

if (hasSSL) {
  const options = { key: fs.readFileSync(SSL_KEY), cert: fs.readFileSync(SSL_CERT) };
  https.createServer(options, handleRequest).listen(PORT, () => {
    console.log("HTTPS https://sentotrade.io:" + PORT);
  });
} else {
  http.createServer(handleRequest).listen(PORT, () => {
    console.log("HTTP no-SSL port " + PORT);
  });
}
