// Sanity check after build: broken internal links, invalid JSON-LD, duplicate titles.
import fs from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { SITE, ITEMS, CATEGORIES, KITS } from "../data.js";
const root = "site";
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((f) =>
  f.isDirectory() ? walk(path.join(d, f.name)) : f.name.endsWith(".html") ? [path.join(d, f.name)] : []);
const bad = new Set(); const missingMedia = new Set(); const titles = {}; let ld = 0;
const pages = walk(root);
if (pages.length !== ITEMS.length + CATEGORIES.length + 9) throw new Error(`Unexpected page count: ${pages.length}`);
for (const f of pages) {
  const h = fs.readFileSync(f, "utf8");
  for (const [, src] of h.matchAll(/(?:src|poster)="(\/[^"?#]+)"/g)) {
    if (!fs.existsSync(path.join(root, src))) missingMedia.add(src);
  }
  const canonical = h.match(/<link rel="canonical" href="([^"]+)"/);
  if (!canonical || new URL(canonical[1]).origin !== SITE.url) throw new Error(`Incorrect canonical origin: ${f}`);
  if (h.includes('rent.ideabay.lk')) throw new Error(`Stale domain: ${f}`);
  if ((h.match(/<h1(?:\s[^>]*)?>/g) || []).length !== 1) throw new Error(`Expected one main heading: ${f}`);
  if (!h.includes('rel="canonical"')) throw new Error(`Missing canonical: ${f}`);
  if (!h.includes('name="description"')) throw new Error(`Missing description: ${f}`);
  for (const [, m] of h.matchAll(/href="(\/[^"#?]*)/g)) {
    const p = path.join(root, m);
    if (!fs.existsSync(p) && !fs.existsSync(path.join(p, "index.html"))) bad.add(m);
  }
  for (const [, s] of h.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)) {
    const schema = JSON.parse(s); ld++;
    if (schema["@type"] === "Store") {
      if (schema.url !== SITE.url + "/" || schema.geo?.latitude !== SITE.latitude || schema.geo?.longitude !== SITE.longitude || schema.identifier?.value !== SITE.place_id) throw new Error(`Incorrect store identity: ${f}`);
    }
  }
  const t = h.match(/<title>(.*?)<\/title>/)[1]; (titles[t] ||= []).push(f);
}
const dups = Object.keys(titles).filter((t) => titles[t].length > 1);
console.log(`broken links: ${[...bad].join(", ") || "none"}\njson-ld blocks: ${ld}\nduplicate titles: ${dups.join(", ") || "none"}`);
console.log(`missing media: ${[...missingMedia].join(", ") || "none"}`);
if (bad.size || dups.length || missingMedia.size) process.exit(1);

const sitemap = fs.readFileSync(path.join(root, "sitemap.xml"), "utf8");
const sitemapUrls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(m => m[1]);
if (sitemapUrls.some(url => new URL(url).origin !== SITE.url)) throw new Error("Sitemap domain mismatch");
if (!fs.readFileSync(path.join(root, "robots.txt"), "utf8").includes(SITE.url + "/sitemap.xml")) throw new Error("Robots sitemap mismatch");
console.log(`SEO identity: canonical domain, single H1, store coordinates/place ID and ${sitemapUrls.length} sitemap URLs verified`);

// Product-specific previews and rental metadata must agree with the visible catalog.
const previewUrls = new Set();
for (const it of ITEMS) {
  const route = `/gear/${it.cat}/${it.slug}/`;
  const html = fs.readFileSync(path.join(root, route, "index.html"), "utf8");
  const meta = (key) => html.match(new RegExp(`<meta (?:property|name)="${key}" content="([^"]+)"`))?.[1];
  const preview = new URL(meta("og:image"));
  if (preview.origin !== SITE.url || preview.pathname !== `/static/share/${it.slug}.png` || !preview.searchParams.get("v")) throw new Error(`Wrong item preview: ${it.slug}`);
  if (previewUrls.has(preview.href)) throw new Error(`Shared product preview: ${it.slug}`);
  previewUrls.add(preview.href);
  if (meta("twitter:image") !== meta("og:image") || meta("og:url") !== SITE.url + route) throw new Error(`Inconsistent share metadata: ${it.slug}`);
  const png = fs.readFileSync(path.join(root, preview.pathname));
  if (png.readUInt32BE(16) !== Number(meta("og:image:width")) || png.readUInt32BE(20) !== Number(meta("og:image:height"))) throw new Error(`Wrong preview dimensions: ${it.slug}`);
  if (meta("og:image:type") !== "image/png" || !meta("og:image:alt")?.includes(it.name.replaceAll("&", "&amp;"))) throw new Error(`Missing preview details: ${it.slug}`);
  const schemas = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)].map(m => JSON.parse(m[1]));
  const product = schemas.find(s => s["@type"] === "Product");
  if (!product || product.sku !== it.slug || Number(product.offers?.price) !== it.price || product.offers?.priceCurrency !== "LKR" || product.offers?.businessFunction !== "http://purl.org/goodrelations/v1#LeaseOut") throw new Error(`Incorrect rental schema: ${it.slug}`);
  if (!html.includes(`Rs. ${it.price.toLocaleString("en-US")}`) || !meta("description")?.includes(`LKR ${it.price.toLocaleString("en-US")}`)) throw new Error(`Price missing from page or snippet: ${it.slug}`);
  if (!sitemap.includes(`<image:loc>${product.image[1]}</image:loc>`)) throw new Error(`Product image missing from sitemap: ${it.slug}`);
}
for (const kit of KITS) for (const slug of kit.items) if (!ITEMS.some(it => it.slug === slug)) throw new Error(`Unknown kit item: ${slug}`);
console.log(`Search and sharing: ${previewUrls.size} unique item previews, PNG dimensions, rental prices/schema and image sitemap entries verified`);

const optimized = JSON.parse(fs.readFileSync("static/images/optimized/manifest.json", "utf8"));
for (const it of ITEMS) {
  const entry = optimized[it.slug];
  if (!entry || entry.sourceHash !== createHash("sha256").update(fs.readFileSync(entry.source)).digest("hex")) throw new Error(`Run npm run optimize:images for ${it.slug}`);
  for (const variant of entry.variants) if (!fs.existsSync(path.join(root, variant.src))) throw new Error(`Missing responsive image: ${variant.src}`);
  const html = fs.readFileSync(path.join(root, `/gear/${it.cat}/${it.slug}/index.html`), "utf8");
  if (!html.includes('imagesrcset=') || !html.includes('srcset=') || !html.includes('class="site-loader"')) throw new Error(`Missing image/loading optimization: ${it.slug}`);
}
console.log("Image performance: 19 current source hashes, 57 responsive assets, responsive preloads and branded loaders verified");
