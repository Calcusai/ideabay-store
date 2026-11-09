// Local live server: builds the site, serves ./site, and rebuilds + reloads the browser
// whenever data.js, build.js or anything in static/ changes. No dependencies.
//   npm run dev            -> http://localhost:3000
//   PORT=4000 npm run dev  -> custom port
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SITE = path.join(ROOT, "site");
const PORT = Number(process.env.PORT) || 3000;
const clients = new Set();

const TYPES = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".json": "application/json", ".webmanifest": "application/manifest+json", ".xml": "application/xml",
  ".txt": "text/plain; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg",
  ".mp4": "video/mp4", ".jpeg": "image/jpeg", ".webp": "image/webp", ".ico": "image/x-icon",
};

const RELOAD = `<script>(()=>{const s=new EventSource("/__live");s.onmessage=e=>{if(e.data==="reload")location.reload()};})();</script>`;

function build() {
  const t = Date.now();
  const r = spawnSync(process.execPath, [path.join(ROOT, "build.js")], { cwd: ROOT, encoding: "utf8" });
  if (r.status !== 0) {
    console.error("\x1b[31m✖ build failed\x1b[0m\n" + (r.stderr || r.stdout));
    return false;
  }
  console.log(`\x1b[32m✔ built\x1b[0m in ${Date.now() - t}ms`);
  return true;
}

function resolveFile(urlPath) {
  let p = decodeURIComponent(urlPath.split("?")[0]);
  let file = path.join(SITE, p);
  if (!file.startsWith(SITE)) return null; // no path traversal
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, "index.html");
  else if (!fs.existsSync(file) && fs.existsSync(file + ".html")) file += ".html"; // cleanUrls, like Vercel
  return fs.existsSync(file) ? file : null;
}

const server = http.createServer((req, res) => {
  if (req.url === "/__live") {
    res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" });
    res.write("retry: 1000\n\n");
    clients.add(res);
    req.on("close", () => clients.delete(res));
    return;
  }
  // Vercel trailingSlash: true -> redirect /gear to /gear/
  const pathname = req.url.split("?")[0];
  if (!path.extname(pathname) && !pathname.endsWith("/")) {
    res.writeHead(308, { Location: pathname + "/" + (req.url.slice(pathname.length)) });
    return res.end();
  }
  let file = resolveFile(req.url);
  let status = 200;
  if (!file) { file = path.join(SITE, "404.html"); status = 404; }
  const ext = path.extname(file);
  let body = fs.readFileSync(file);
  if (ext === ".html") body = body.toString().replace("</body>", RELOAD + "</body>");
  res.writeHead(status, { "Content-Type": TYPES[ext] || "application/octet-stream", "Cache-Control": "no-store" });
  res.end(body);
});

let timer;
function onChange(_, name) {
  if (name && /(^|\/)\.|~$/.test(name)) return; // ignore dotfiles/editor temp files
  clearTimeout(timer);
  timer = setTimeout(() => {
    console.log(`↻ change detected${name ? `: ${name}` : ""}`);
    if (build()) for (const c of clients) c.write("data: reload\n\n");
  }, 120);
}

build();
fs.watch(path.join(ROOT, "static"), { recursive: true }, onChange);
// watch the folder (not the files) so editors that save by replacing the file are still caught
fs.watch(ROOT, (_, name) => { if (name === "data.js" || name === "build.js") onChange(null, name); });

server.listen(PORT, () => {
  console.log(`\n  \x1b[1mIdeaBay live server\x1b[0m  →  http://localhost:${PORT}\n  Watching data.js, build.js and static/ ... (Ctrl+C to stop)\n`);
});
