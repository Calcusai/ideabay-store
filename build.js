#!/usr/bin/env node
/**
 * Static site generator for IdeaBay Renting Store. No dependencies.
 *   npm run build   -> writes the full site to ./site
 *   npm run dev     -> build + preview on http://localhost:3000
 */
import fs from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SITE, BRANDS, CATEGORIES, ITEMS, KITS, FAQS } from "./data.js";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(ROOT, "site");
const STATIC = path.join(ROOT, "static");
const YEAR = new Date().getFullYear();

const CAT = Object.fromEntries(CATEGORIES.map((c) => [c.slug, c]));
const ITEM = Object.fromEntries(ITEMS.map((i) => [i.slug, i]));
const SITEMAP = []; // [path, priority]

// ------------------------------------------------------------------ icons
const ICONS = {
  camera: '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"><path d="M6 20h12l4-6h16l4 6h16v32H6z"/><circle cx="32" cy="35" r="11"/><circle cx="32" cy="35" r="5"/><path d="M47 26h5"/><path d="M6 26v20"/></svg>',
  lens: '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round"><rect x="16" y="6" width="32" height="10" rx="2"/><rect x="18" y="16" width="28" height="30" rx="2"/><path d="M18 24h28M18 30h28M18 38h28" stroke-dasharray="2 3"/><rect x="21" y="46" width="22" height="8" rx="2"/><path d="M24 54h16v4H24z"/></svg>',
  gimbal: '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"><rect x="28" y="38" width="8" height="22" rx="3"/><path d="M32 38V30h14V14H18"/><rect x="20" y="8" width="22" height="14" rx="2"/><circle cx="31" cy="15" r="4"/><circle cx="46" cy="30" r="3"/><circle cx="32" cy="46" r="1.5" fill="currentColor"/></svg>',
  mic: '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"><rect x="16" y="14" width="32" height="38" rx="8"/><circle cx="32" cy="28" r="8"/><path d="M28 28h8M32 24v8" stroke-width="2"/><path d="M24 44h16"/><path d="M40 8l6 6M24 8l-6 6"/></svg>',
  light: '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"><path d="M12 10l26 6v22l-26 6z"/><rect x="38" y="18" width="14" height="18" rx="2"/><path d="M45 36v8M45 44l-10 14M45 44l10 14M45 44v14"/><path d="M4 22l-2-1M4 32H1M4 42l-2 1"/></svg>',
  tripod: '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"><rect x="20" y="6" width="24" height="10" rx="2"/><path d="M44 11h12"/><path d="M28 16h8v8h-8z"/><path d="M32 24L14 58M32 24l18 34M32 24v34"/><path d="M22 42h20"/></svg>',
  card: '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"><path d="M16 6h24l10 10v42H16z"/><path d="M24 6v10M30 6v10M36 6v10"/><rect x="22" y="30" width="22" height="16" rx="2"/><path d="M27 38h12"/></svg>',
  pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/></svg>',
  phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/></svg>',
  clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>',
  wa: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.5 14.4c-.3-.1-1.8-.9-2-1s-.5-.1-.7.1-.8 1-.9 1.2-.3.2-.6.1a8.1 8.1 0 0 1-4-3.5c-.3-.5.3-.5.9-1.6.1-.2 0-.4 0-.5l-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6a1.1 1.1 0 0 0-.8.4 3.4 3.4 0 0 0-1 2.5 5.9 5.9 0 0 0 1.2 3.1 13.5 13.5 0 0 0 5.2 4.6c1.9.8 2.7.9 3.6.7a3.1 3.1 0 0 0 2-1.4 2.5 2.5 0 0 0 .2-1.4c-.1-.1-.3-.2-.6-.3zM12 21.8a9.8 9.8 0 0 1-5-1.4l-.4-.2-3.7 1 1-3.6-.2-.4A9.8 9.8 0 1 1 12 21.8zM20.5 3.5A11.9 11.9 0 0 0 1.8 17.9L.1 24l6.3-1.6A11.9 11.9 0 0 0 24 12a11.8 11.8 0 0 0-3.5-8.5z"/></svg>',
  fb: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13.5 22v-8h2.7l.4-3.2h-3.1V8.8c0-.9.3-1.5 1.6-1.5H17V4.4a22 22 0 0 0-2.5-.1c-2.5 0-4.2 1.5-4.2 4.3v2.3H7.6V14h2.7v8z"/></svg>',
  ig: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></svg>',
};

const LOGO = '<img class="rental-logo" src="/static/logo.png" alt="IdeaBay Studio" width="120" height="120">';

const WAVE =
  '<svg class="wave2" viewBox="0 0 400 200" preserveAspectRatio="none" aria-hidden="true"><path fill="currentColor" ' +
  'd="M0 70 C120 10 260 120 400 40 V200 H0z"/></svg>' +
  '<svg class="wave" viewBox="0 0 400 200" preserveAspectRatio="none" aria-hidden="true"><path fill="currentColor" ' +
  'd="M0 90 C140 30 250 140 400 70 V200 H0z"/></svg>';

// ------------------------------------------------------------------ helpers
const e = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;");
const absUrl = (p) => SITE.url + p;
const directionsUrl = () => `https://www.google.com/maps/dir/?api=1&destination=${SITE.latitude},${SITE.longitude}&destination_place_id=${SITE.place_id}`;
const mapUrl = () => `https://www.google.com/maps/search/?api=1&query=${SITE.latitude},${SITE.longitude}&query_place_id=${SITE.place_id}`;
const wa = (msg) => `https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(msg)}`;
const itemUrl = (it) => `/gear/${it.cat}/${it.slug}/`;
const availabilityUrl = (it) => wa(`Hi IdeaBay! I'd like to check rental availability.\n\nGear: ${it.name}\nCategory: ${CAT[it.cat].name}\nDetails: ${it.short}\nProduct: ${absUrl(itemUrl(it))}\n\nRental date(s): \nPickup / return: \nPlease confirm availability, the rental rate and deposit. Thank you!`);
const priceHtml = (it) => (it.price ? `Rs. ${Number(it.price).toLocaleString("en-US")} <small>/ day</small>` : "DM for rate");
const altTel = (s) => s.replace(/ /g, "");

const optimizedManifestPath = path.join(STATIC, "images/optimized/manifest.json");
const optimizedImages = fs.existsSync(optimizedManifestPath) ? JSON.parse(fs.readFileSync(optimizedManifestPath, "utf8")) : {};
function responsiveImage(it, sizes) {
  const variants = optimizedImages[it.slug]?.variants;
  return variants ? `srcset="${variants.map(v => `${v.src} ${v.width}w`).join(", ")}" sizes="${sizes}"` : "";
}

/** Use a real photo if static/images/<slug>.(webp|jpg|jpeg|png) exists. */
function itemImage(it) {
  if (optimizedImages[it.slug]) return optimizedImages[it.slug].variants.at(-1).src;
  for (const ext of ["webp", "jpg", "jpeg", "png"]) {
    if (fs.existsSync(path.join(STATIC, "images", `${it.slug}.${ext}`))) return `/static/images/${it.slug}.${ext}`;
  }
  return null;
}

// PNG previews are stored separately so social crawlers receive a widely supported format.
function shareImage(it) {
  return `/static/share/${it.slug}.png`;
}
function previewMeta(imagePath) {
  const file = imagePath === "/static/logo.png" ? path.join(ROOT, "logo.png") : path.join(ROOT, imagePath.replace(/^\//, ""));
  const bytes = fs.readFileSync(file);
  return {
    url: absUrl(imagePath) + `?v=${createHash("sha256").update(bytes).digest("hex").slice(0, 12)}`,
    width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20), type: "image/png",
  };
}
const rentalName = (it) => it.name.replace(/ 2-Person Wireless Microphone System$/, " (2-Person)").replace(/ Lens$/, "").replace(/ Gimbal Stabilizer$/, "").replace(/ Bi-Color LED Monolight$/, " Bi-Color Light").replace(/ 5-Person Intercom System$/, " Intercom (5-Person)");
const dailyRate = (it) => `LKR ${it.price.toLocaleString("en-US")} / day`;

function media(it, eager = false) {
  const img = itemImage(it);
  const art = img
    ? `<img class="photo" src="${img}" ${responsiveImage(it, eager ? "(max-width: 650px) 90vw, 560px" : "(max-width: 650px) 44vw, (max-width: 1000px) 30vw, 280px")} alt="${e(it.name)} available for rent in Colombo" decoding="async" loading="${eager ? "eager" : "lazy"}" ${eager ? 'fetchpriority="high"' : ""} width="600" height="600">`
    : `<span class="art" role="img" aria-label="${e(it.name)}">${ICONS[CAT[it.cat].icon]}</span>`;
  return `<div class="card-media">${WAVE}<span class="brand-tag">${e(it.brand)}</span><span class="logo-mini">${LOGO}</span>${art}</div>`;
}

function card(it, h = "h3") {
  const search = [it.name, it.brand, CAT[it.cat].name, it.short, ...(it.good_for || [])].join(" ").toLowerCase();
  const url = itemUrl(it);
  return (
    `<article class="card reveal" data-cat="${it.cat}" data-search="${e(search)}">` +
    `<a href="${url}" tabindex="-1" aria-hidden="true">${media(it)}</a>` +
    `<div class="card-body"><${h}><a href="${url}">${e(it.name)}</a></${h}><p>${e(it.short)}</p>` +
    `<div class="card-foot"><span class="price">${priceHtml(it)}</span>` +
    `<a class="btn btn-dark btn-sm" href="${e(availabilityUrl(it))}" target="_blank" rel="noopener">View Availability</a></div></div></article>`
  );
}

// ------------------------------------------------------------------ schema
const addressSchema = () => ({
  "@type": "PostalAddress", streetAddress: SITE.street, addressLocality: SITE.city,
  addressRegion: SITE.region, postalCode: SITE.postal, addressCountry: SITE.country,
});

function storeSchema() {
  const s = {
    "@context": "https://schema.org",
    "@type": "Store",
    "@id": absUrl("/#store"),
    name: SITE.name,
    alternateName: ["IdeaBay Rent", "IdeaBay Camera Rental"],
    description: SITE.description,
    url: absUrl("/"),
    logo: absUrl("/static/logo.png"),
    image: absUrl("/static/logo.png"),
    telephone: SITE.phone,
    address: addressSchema(),
    hasMap: mapUrl(),
    geo: { "@type": "GeoCoordinates", latitude: SITE.latitude, longitude: SITE.longitude },
    identifier: { "@type": "PropertyValue", propertyID: "Google Maps Place ID", value: SITE.place_id },
    areaServed: SITE.service_areas.map(name => ({ "@type": "Place", name: `${name}, Sri Lanka` })),
    sameAs: [SITE.facebook, SITE.instagram, SITE.google_business],
    currenciesAccepted: "LKR",
    paymentAccepted: "Cash, Bank Transfer",
    hasOfferCatalog: {
      "@type": "OfferCatalog", name: "Camera & Production Gear Rental",
      itemListElement: CATEGORIES.map((c) => ({ "@type": "OfferCatalog", name: c.name, url: absUrl(`/gear/${c.slug}/`) })),
    },
  };
  if (SITE.hours) s.openingHours = SITE.hours;
  return s;
}

const websiteSchema = () => ({
  "@context": "https://schema.org", "@type": "WebSite", "@id": absUrl("/#website"),
  url: absUrl("/"), name: SITE.name, publisher: { "@id": absUrl("/#store") },
  potentialAction: { "@type": "SearchAction", target: absUrl("/gear/?q={search_term_string}"), "query-input": "required name=search_term_string" },
});

const crumbsSchema = (trail) => ({
  "@context": "https://schema.org", "@type": "BreadcrumbList",
  itemListElement: trail.map(([n, p], i) => ({ "@type": "ListItem", position: i + 1, name: n, item: absUrl(p) })),
});

const itemListSchema = (name, items) => ({
  "@context": "https://schema.org", "@type": "ItemList", name,
  itemListElement: items.map((i, n) => ({ "@type": "ListItem", position: n + 1, url: absUrl(itemUrl(i)), name: i.name })),
});

function crumbsHtml(trail) {
  const lis = trail.map(([n, p], i) =>
    i === trail.length - 1 ? `<li aria-current="page">${e(n)}</li>` : `<li><a href="${p}">${e(n)}</a></li>`);
  return `<nav class="crumbs" aria-label="Breadcrumb"><ol>${lis.join("")}</ol></nav>`;
}

// ------------------------------------------------------------------ layout
const NAV = [["Rent Gear", "/gear/"], ["Kits", "/kits/"], ["How It Works", "/how-it-works/"],
  ["FAQ", "/faq/"], ["About", "/about/"], ["Contact", "/contact/"]];

function header(p) {
  const links = NAV.map(([n, href]) => `<li><a href="${href}"${p.startsWith(href) ? ' aria-current="page"' : ""}>${n}</a></li>`).join("");
  return `
<a class="skip" href="#main">Skip to content</a>
<div class="topbar"><div class="container">
  <span>📍 Pick up from IdeaBay Studio, Nawinna, Maharagama</span>
  <span><a href="tel:${SITE.phone}">${SITE.phone_display}</a> · <a href="${SITE.facebook}" target="_blank" rel="noopener">Facebook</a></span>
</div></div>
<header class="site-header"><div class="container nav">
  <a class="brand" href="/" aria-label="${e(SITE.name)} home">${LOGO}<span class="brand-text"><strong>IDEABAY</strong><span>Renting Store</span></span></a>
  <form class="header-search" action="/gear/" role="search"><label class="sr-only" for="site-search">Search rental equipment</label>${ICONS.search}<input id="site-search" name="q" type="search" placeholder="Find your next piece of gear…"><button type="submit">Search</button></form><ul class="menu" id="menu">${links}</ul>
  <div class="nav-cta">
    <a class="btn btn-dark btn-sm" href="${e(wa("Hi IdeaBay! I'd like to check gear availability."))}" target="_blank" rel="noopener">${ICONS.wa} Check availability</a>
    <button class="burger" aria-label="Open menu" aria-controls="menu" aria-expanded="false"><span></span><span></span><span></span></button>
  </div>
</div><nav class="category-nav" aria-label="Equipment categories"><div class="container">${CATEGORIES.map(c => `<a href="/gear/${c.slug}/">${e(c.name)}</a>`).join("")}</div></nav></header>`;
}

function footer() {
  const cats = CATEGORIES.map((c) => `<li><a href="/gear/${c.slug}/">${e(c.name)} rental</a></li>`).join("");
  const waLink = e(wa("Hi IdeaBay! I'd like to rent gear. Dates: "));
  return `
<section class="cta"><div class="container">
  <div><h2>Tell us what you’re shooting.</h2><p>Send us your dates and gear list. We'll confirm on WhatsApp.</p></div>
  <a class="btn btn-dark" href="${waLink}" target="_blank" rel="noopener">${ICONS.wa} WhatsApp ${SITE.phone_display}</a>
</div></section>
<footer class="site-footer"><div class="container">
  <div class="foot">
    <div>
      <a class="brand" href="/">${LOGO}<span class="brand-text"><strong>IDEABAY</strong><span>Renting Store</span></span></a>
      <p style="margin-top:18px">Pro camera, lens, gimbal, audio and lighting rental in Maharagama, Colombo. Good gear at a fair rate.</p>
    </div>
    <div><h3>Rent</h3><ul>${cats}</ul></div>
    <div><h3>Store</h3><ul>
      <li><a href="/kits/">Production kits</a></li><li><a href="/how-it-works/">How renting works</a></li>
      <li><a href="/camera-rental-colombo/">Camera rental &amp; pickup areas</a></li><li><a href="/faq/">FAQ</a></li><li><a href="/about/">About IdeaBay</a></li><li><a href="/contact/">Contact &amp; location</a></li>
    </ul></div>
    <div><h3>Visit</h3>
      <address style="font-style:normal">${e(SITE.street)},<br>${e(SITE.city)} ${SITE.postal}, Sri Lanka</address>
      <p style="margin-top:12px"><a href="tel:${SITE.phone}">${SITE.phone_display}</a><br><a href="tel:${altTel(SITE.phone_alt_display)}">${SITE.phone_alt_display}</a></p>
      <p>${e(SITE.hours_display)}</p>
      <p><a href="${SITE.google_business}" target="_blank" rel="noopener">Google Business Profile</a> · <a href="${SITE.facebook}" target="_blank" rel="noopener">Facebook</a> · <a href="${SITE.instagram}" target="_blank" rel="noopener">Instagram</a></p>
    </div>
  </div>
  <div class="legal"><span>© <span data-year>${YEAR}</span> ${e(SITE.name)}. All rights reserved.</span><span>Brand names belong to their owners.</span></div>
</div></footer>
<a class="wa-float" href="${waLink}" target="_blank" rel="noopener" aria-label="Chat on WhatsApp">${ICONS.wa}</a>
`;
}

function page(p, title, desc, body, { schemas = [], ogType = "website", priority = "0.7", ogImage = null, imageAlt = title, mainEntity = null, noindex = false } = {}) {
  const canonical = absUrl(p);
  const primaryItem = p === "/" ? ITEM["sony-fx3"] : ITEMS.find(it => itemUrl(it) === p);
  const preload = primaryItem && optimizedImages[primaryItem.slug] ? `<link rel="preload" as="image" href="${itemImage(primaryItem)}" imagesrcset="${optimizedImages[primaryItem.slug].variants.map(v => `${v.src} ${v.width}w`).join(", ")}" imagesizes="(max-width: 650px) 90vw, 560px" fetchpriority="high">` : "";
  if (desc.length > 160) desc = desc.slice(0, 157).replace(/\s+\S*$/, "") + "…";
  const preview = previewMeta(ogImage || "/static/og-cover.png");
  const ogImg = preview.url;
  if (!noindex) {
    if (!schemas.some(s => s["@id"] === absUrl("/#store"))) schemas.push(storeSchema());
    schemas.push({ "@context": "https://schema.org", "@type": p === "/contact/" ? "ContactPage" : "WebPage", "@id": canonical + "#webpage", url: canonical, name: title, description: desc, inLanguage: "en-LK", isPartOf: { "@id": absUrl("/#website") }, about: { "@id": absUrl("/#store") }, primaryImageOfPage: { "@type": "ImageObject", url: ogImg, width: preview.width, height: preview.height, caption: imageAlt }, ...(mainEntity ? { mainEntity: { "@id": mainEntity } } : {}) });
    if (!schemas.some(s => s["@id"] === absUrl("/#website"))) schemas.push(websiteSchema());
  }
  const ld = schemas.map((s) => `<script type="application/ld+json">${JSON.stringify(s).replace(/</g, "\\u003c")}</script>`).join("");
  const robots = noindex ? "noindex, follow" : "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1";
  const html = `<!doctype html>
<html lang="en-LK">
<head>
<meta charset="utf-8">
<script>document.documentElement.className="js";window.__loadingTimer=setTimeout(function(){document.documentElement.classList.add("is-loading")},180);window.__loadingFallback=setTimeout(function(){clearTimeout(window.__loadingTimer);document.documentElement.classList.remove("is-loading")},2200)</script>
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${e(title)}</title>
<meta name="description" content="${e(desc)}">
<meta name="robots" content="${robots}">
<link rel="canonical" href="${canonical}">
<meta name="geo.region" content="LK-11">
<meta name="geo.placename" content="Maharagama, Colombo">
<meta name="geo.position" content="${SITE.latitude};${SITE.longitude}">
<meta name="ICBM" content="${SITE.latitude}, ${SITE.longitude}">
<meta property="og:type" content="${ogType}">
<meta property="og:site_name" content="${e(SITE.name)}">
<meta property="og:title" content="${e(title)}">
<meta property="og:description" content="${e(desc)}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${e(ogImg)}">
<meta property="og:image:secure_url" content="${e(ogImg)}">
<meta property="og:image:type" content="${preview.type}">
<meta property="og:image:width" content="${preview.width}">
<meta property="og:image:height" content="${preview.height}">
<meta property="og:image:alt" content="${e(imageAlt)}">
<meta property="og:locale" content="en_LK">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${e(title)}">
<meta name="twitter:description" content="${e(desc)}">
<meta name="twitter:image" content="${e(ogImg)}">
<meta name="twitter:image:alt" content="${e(imageAlt)}">
<meta name="theme-color" content="#1d3527">
<link rel="icon" href="/static/logo.png" type="image/png">

<link rel="apple-touch-icon" href="/static/logo.png">
<link rel="manifest" href="/site.webmanifest">
<link rel="stylesheet" href="/static/style.css">
${preload}
${ld}
</head>
<body>
<div class="site-loader" role="status" aria-label="Loading IdeaBay equipment"><div class="loader-brand"><img src="/static/logo.png" alt="" width="90" height="90"><span>IDEABAY<span class="loader-caption">RENTING STORE</span></span></div><span class="loader-aperture" aria-hidden="true"></span><p>Getting your gear ready</p></div>
${header(p)}
<main id="main">
${body}
</main>
${footer()}
<script src="/static/main.js" defer></script>
</body>
</html>
`;
  const target = p.endsWith("/") ? path.join(OUT, p, "index.html") : path.join(OUT, p);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, html);
  if (!noindex) SITEMAP.push([p, priority]);
}

const pageHero = (trail, h1, lead) =>
  `<section class="page-hero"><div class="container">${crumbsHtml(trail)}<h1>${h1}</h1><p class="lead">${lead}</p></div></section>`;

function stepsHtml() {
  const steps = [
    ["Pick your gear", "Browse the catalog or tell us about your shoot and we'll suggest a kit."],
    ["Message us", "WhatsApp or DM us your dates. We confirm availability and the rate."],
    ["Pick up & check", "Collect from IdeaBay Studio, Maharagama, with your NIC. We test everything with you."],
    ["Shoot & return", "Bring the gear back on time. Multi-day and weekend rates are available."],
  ];
  return `<ol class="steps">${steps.map(([a, b]) => `<li class="reveal"><h3>${e(a)}</h3><p>${e(b)}</p></li>`).join("")}</ol>`;
}

function kitsHtml(kits) {
  return kits.map((k) => {
    const lis = k.items.map((s) => `<li><a href="${itemUrl(ITEM[s])}">${e(ITEM[s].name)}</a></li>`).join("");
    return `<article class="kit reveal" id="${k.slug}"><h3>${e(k.name)}</h3><p>${e(k.desc)}</p><ul>${lis}</ul>` +
      `<a class="btn btn-amber btn-sm" href="${e(wa(`Hi IdeaBay! I'm interested in the ${k.name}. Dates: `))}" target="_blank" rel="noopener">Get kit rate</a></article>`;
  }).join("");
}

// ------------------------------------------------------------------ pages
function locationSection() {
  return `<section class="section store-location" id="location" aria-labelledby="location-title"><div class="container location-layout">
    <div class="location-copy"><span class="eyebrow">Find us</span><h2 id="location-title">Your gear.<br>Your local pickup.</h2>
      <p>Visit IdeaBay Studio in Nawinna, Maharagama to collect your camera, lens and production equipment.</p>
      <address><strong>IdeaBay Renting Store</strong><br>${e(SITE.street)}<br>${e(SITE.city)} ${e(SITE.postal)}, Sri Lanka</address>
      <p class="location-hours">${ICONS.clock}<span>${e(SITE.hours_display)}<br>Message us before visiting.</span></p>
      <div class="location-actions"><a class="btn btn-dark" href="${e(directionsUrl())}" target="_blank" rel="noopener">${ICONS.pin} Get directions ↗</a><a class="location-call" href="tel:${SITE.phone}">${e(SITE.phone_display)}</a></div>
    </div>
    <div class="location-map"><iframe title="IdeaBay Studio pickup location in Nawinna, Maharagama" src="https://www.google.com/maps?q=${SITE.latitude},${SITE.longitude}&amp;z=17&amp;output=embed" width="720" height="480" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe><a href="${e(mapUrl())}" target="_blank" rel="noopener">Open location in Google Maps ↗</a></div>
  </div></section>`;
}

function buildHome() {
  const heroItems = ["sony-fx3", "sony-a7-iv", "sigma-70-200mm-f2-8-dg-dn-os-sports", "dji-mic-2", "rodecaster-pro-ii", "godox-v100-sony"].map(slug => ITEM[slug]);
  const slides = heroItems.map((it, n) => `<article class="rental-slide" data-slide ${n ? 'hidden' : ''} role="group" aria-roledescription="slide" aria-label="${n + 1} of ${heroItems.length}: ${e(it.name)}">
    <div class="slide-copy"><span class="slide-category">${e(CAT[it.cat].name)} / FOR RENT</span><h2>${e(it.name)}</h2><p>${e(it.short)}</p><div class="slide-actions"><a class="btn btn-amber" href="${e(availabilityUrl(it))}" target="_blank" rel="noopener">View Availability ${ICONS.wa}</a><a class="slide-details" href="${itemUrl(it)}">View gear details ↗</a></div><span class="slide-location">Nawinna, Maharagama · Daily &amp; weekend rentals</span></div>
    <div class="slide-image"><span class="slide-watermark" aria-hidden="true">${e(it.brand)}</span><img src="${itemImage(it)}" ${responsiveImage(it, "(max-width: 650px) 90vw, 560px")} decoding="async" alt="${e(it.name)} for rent at IdeaBay" width="800" height="600" loading="${n ? 'lazy' : 'eager'}" ${n ? '' : 'fetchpriority="high"'}><span class="slide-image-note">IDEABAY RENTING STORE / ${String(n + 1).padStart(2, '0')}</span></div></article>`).join("");
  const categoryPhotos = {
    cameras: "sony-a7-iv",
    lenses: "sigma-50mm-f1-4-dg-dn-art",
    audio: "rode-podmic-with-arm",
    lighting: "nanlite-fs-300b",
    other: "dji-rs-4-pro",
  };
  const cats = CATEGORIES.map((c) =>
    `<a class="category-photo" href="/gear/${c.slug}/" aria-label="Browse ${e(c.name)}" title="${e(c.name)}"><img src="${itemImage(ITEM[categoryPhotos[c.slug]])}" ${responsiveImage(ITEM[categoryPhotos[c.slug]], "(max-width: 650px) 44vw, 220px")} alt="${e(c.name)}" width="300" height="300" loading="lazy" decoding="async"></a>`).join("");
  const featured = ITEMS.map((i) => card(i)).join("");
  const brands = BRANDS.map(b => { const k = ({"Sony":"sony","Sigma":"sigma","DJI":"dji","RØDE":"rode","Godox":"godox","Nanlite":"nanlite","Hollyland":"hollyland"})[b]; return k ? `<li><img src="/static/images/brand-${k}.webp" alt="${e(b)}" width="120" height="48" loading="lazy"></li>` : `<li>${e(b)}</li>`; }).join("");
  const faqs = FAQS.slice(0, 4).map(([q, a]) => `<details><summary>${e(q)}</summary><p>${e(a)}</p></details>`).join("");

  const body = `
<section class="rental-hero" aria-roledescription="carousel" aria-label="Featured rental equipment" data-carousel>
  <div class="container hero-heading"><h1>Camera rental in Maharagama &amp; Colombo</h1><a href="/gear/">Explore all ${ITEMS.length} items ↗</a></div>
  <div class="container"><div class="slide-stage">${slides}</div>
  <div class="carousel-bar"><span class="carousel-editorial">THE GEAR BEHIND YOUR NEXT SHOOT</span><div class="carousel-controls"><button type="button" data-prev aria-label="Previous equipment">←</button><div class="carousel-dots">${heroItems.map((it,n)=>`<button type="button" data-slide-to="${n}" aria-label="Show ${e(it.name)}" aria-pressed="${n===0}"><span>${String(n+1).padStart(2,'0')}</span></button>`).join("")}</div><button type="button" data-next aria-label="Next equipment">→</button><button type="button" data-pause aria-label="Pause slideshow" aria-pressed="false">Pause Ⅱ</button></div></div><p class="sr-only" data-slide-status aria-live="off">1 of ${heroItems.length}</p></div>
</section>
<div class="cover-strip"><div class="container">
  <a href="tel:${SITE.phone}">Find out more: ${SITE.phone_display}</a>
  <span class="follow">Follow us <a href="${SITE.facebook}" target="_blank" rel="noopener" aria-label="Facebook">${ICONS.fb}</a><a href="${SITE.instagram}" target="_blank" rel="noopener" aria-label="Instagram">${ICONS.ig}</a></span>
</div></div>

<section class="brands" aria-label="Brands we rent"><div class="container"><ul>${brands}</ul></div></section>

<section class="section"><div class="container">
  <div class="section-head"><div><span class="eyebrow">What we rent</span><h2>Rent by category</h2></div>
  <p>Everything you need for a shoot, from a single lens to a full multi-camera setup.</p></div>
  <div class="category-scroll" role="region" aria-label="Rental categories" tabindex="0">${cats}</div>
</div></section>

<section class="section alt"><div class="container">
  <div class="section-head"><div><span class="eyebrow">The rental collection · ${ITEMS.length} items</span><h2>The equipment shelf.</h2></div>
  <a class="btn btn-dark" href="/gear/">View all gear →</a></div>
  <div class="toolbar" role="group" aria-label="Filter rental collection"><button class="chip active" data-cat="all" aria-pressed="true">All equipment</button>${CATEGORIES.map(c=>`<button class="chip" data-cat="${c.slug}" aria-pressed="false">${e(c.name)}</button>`).join("")}<label class="search">${ICONS.search}<span class="sr-only">Search the collection</span><input id="gear-search" type="search" placeholder="Search equipment…"></label></div><p class="results-count" aria-live="polite"></p><div class="grid" data-filter-grid>${featured}</div><p class="empty" hidden>No equipment matches. Try another search or category.</p>
</div></section>

<section class="section showreel-section" id="showreel"><div class="container showreel-layout"><div><span class="eyebrow">Inside IdeaBay</span><h2>See IdeaBay<br>in motion.</h2><p>Get a feel for IdeaBay. Watch our showreel, then let’s put together the gear for your next production.</p><a class="btn btn-amber" href="${SITE.facebook}" target="_blank" rel="noopener">More from IdeaBay ↗</a></div><video controls playsinline preload="none" poster="/static/images/showreel-poster.jpg" aria-label="IdeaBay production showreel"><source src="/static/showreel.mp4" type="video/mp4">Your browser does not support video. <a href="/static/showreel.mp4">Download the IdeaBay showreel</a>.</video></div></section>
<section class="section"><div class="container">
  <div class="section-head"><div><span class="eyebrow">Ready on demand</span><h2>Complete production kits</h2></div>
  <p>Kits put the right body, lens, audio and light together for common jobs. Ask for a kit rate.</p></div>
  <div class="kits">${kitsHtml(KITS)}</div>
</div></section>

<section class="section alt"><div class="container">
  <div class="section-head"><div><span class="eyebrow">Simple process</span><h2>How renting works</h2></div>
  <a class="btn btn-ghost" href="/how-it-works/">Rental terms →</a></div>
  ${stepsHtml()}
</div></section>

<section class="section"><div class="container two">
  <div class="prose">
    <span class="eyebrow">Local &amp; reliable</span>
    <h2>Camera rental in Maharagama &amp; Colombo</h2>
    <p><strong>IdeaBay Renting Store</strong> is a <strong>camera and production gear rental</strong> service at IdeaBay Studio in Nawinna, Maharagama. We serve photographers, filmmakers, wedding teams and content creators in <strong>Colombo, Nugegoda, Kottawa, Pannipitiya, Homagama</strong> and across the Western Province.</p>
    <p>Our gear is full-frame <strong>Sony cameras (A7 IV, FX3)</strong>, <strong>Sony G Master and Sigma Art lenses</strong>, the <strong>DJI RS 4 Pro gimbal</strong>, <strong>DJI Mic 2, DJI Mic 3 and RØDE podcast equipment</strong>, and <strong>Nicefoto and Nanlite lighting</strong>. Each item is cleaned, tested and charged before pickup.</p>
    <p>${e(SITE.studio_note)}</p><p><a href="/camera-rental-colombo/">Camera hire in Colombo, Maharagama &amp; nearby areas →</a></p>
  </div>
  <div>
    <span class="eyebrow">Good to know</span>
    <h2>Quick answers</h2>
    <div class="faq">${faqs}</div>
    <p style="margin-top:20px"><a class="btn btn-ghost" href="/faq/">All FAQs →</a></p>
  </div>
</div></section>
${locationSection()}
`;
  page("/", "Camera & Lens Rental Colombo | IdeaBay Renting Store, Maharagama", SITE.description, body,
    { schemas: [storeSchema(), websiteSchema(), itemListSchema("IdeaBay equipment rental collection", ITEMS), { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: FAQS.slice(0, 4).map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) }], priority: "1.0" });
}

function buildGear() {
  const chips = ['<button class="chip active" aria-pressed="true" data-cat="all">All gear</button>',
    ...CATEGORIES.map((c) => `<button class="chip" data-cat="${c.slug}">${e(c.name)}</button>`)].join("");
  const trail = [["Home", "/"], ["Rent Gear", "/gear/"]];
  const links = CATEGORIES.map((c) => `<a href="/gear/${c.slug}/">${e(c.name)} rental</a>`).join(" · ");
  const body = pageHero(trail, "Rent camera gear in Colombo",
    "The full IdeaBay catalog: cameras, lenses, gimbals, audio, lighting and accessories. Filter by category or search for what you need.") + `
<section class="section"><div class="container">
  <div class="toolbar" role="toolbar" aria-label="Filter gear">${chips}
    <label class="search"><span class="sr-only">Search gear</span>${ICONS.search}<input id="gear-search" type="search" placeholder="Search e.g. FX3, 70-200, mic"></label>
  </div>
  <div class="grid" data-filter-grid>${ITEMS.map((i) => card(i, "h2")).join("")}</div>
  <p class="empty">No gear matches that search. <a href="${e(wa("Hi IdeaBay! Do you have this gear: "))}" target="_blank" rel="noopener">Ask us on WhatsApp</a>, as we may still be able to source it.</p>
  <h2 style="margin-top:70px;font-size:1.6rem">Browse by category</h2>
  <p>${links}</p>
</div></section>`;
  page("/gear/", "Rent Camera Gear Colombo | Full Rental Catalog | IdeaBay",
    "Browse every camera, lens, gimbal, wireless mic and light you can rent from IdeaBay Renting Store in Maharagama, Colombo. Sony, Sigma, DJI, RØDE and Godox.",
    body, { schemas: [crumbsSchema(trail), itemListSchema("IdeaBay rental gear", ITEMS)], priority: "0.9" });
}

function buildCategories() {
  for (const c of CATEGORIES) {
    const items = ITEMS.filter((i) => i.cat === c.slug);
    const chips = CATEGORIES.map((x) =>
      `<a class="chip" href="/gear/${x.slug}/"${x === c ? ' aria-current="page"' : ""}>${e(x.name)}</a>`).join("");
    const trail = [["Home", "/"], ["Rent Gear", "/gear/"], [c.name, `/gear/${c.slug}/`]];
    const body = pageHero(trail, e(c.h1), e(c.intro)) + `
<section class="section"><div class="container">
  <div class="toolbar"><a class="chip" href="/gear/">All gear</a>${chips}</div>
  <div class="grid">${items.map((i) => card(i, "h2")).join("")}</div>
  <div class="prose" style="margin-top:60px">
    <h2>Why rent ${e(c.name.toLowerCase())} from IdeaBay?</h2>
    <ul>
      <li><strong>Tested before each rental:</strong> cleaned, charged, firmware updated.</li>
      <li><strong>Fair daily and weekend rates</strong>, with discounts for multi-day bookings.</li>
      <li><strong>Easy pickup</strong> at IdeaBay Studio, Nawinna, Maharagama, close to Nugegoda, Kottawa and Colombo.</li>
      <li><strong>Help when you need it:</strong> we'll show you the setup at pickup.</li>
    </ul>
    <p>Can't find what you need? <a href="${e(wa(`Hi IdeaBay! I'm looking for ${c.name.toLowerCase()} for my shoot. `))}" target="_blank" rel="noopener">Message us</a> and we'll check what we can arrange.</p>
  </div>
</div></section>`;
    page(`/gear/${c.slug}/`, c.title, c.meta, body,
      { ogImage: shareImage(items[0]), imageAlt: `${c.name} rental equipment at IdeaBay, Maharagama, Colombo`, schemas: [crumbsSchema(trail), itemListSchema(c.h1, items), { "@context": "https://schema.org", "@type": "Service", "@id": absUrl(`/gear/${c.slug}/#rental-service`), name: `${c.name} rental in Maharagama and Colombo`, serviceType: `${c.name} rental`, provider: { "@id": absUrl("/#store") }, areaServed: SITE.service_areas.map(name => ({ "@type": "Place", name: `${name}, Sri Lanka` })), url: absUrl(`/gear/${c.slug}/`) }], priority: "0.8" });
  }
}

function buildItems() {
  for (const it of ITEMS) {
    const c = CAT[it.cat];
    const url = itemUrl(it);
    const trail = [["Home", "/"], ["Rent Gear", "/gear/"], [c.name, `/gear/${c.slug}/`], [it.name, url]];
    let related = ITEMS.filter((i) => i.cat === it.cat && i !== it).slice(0, 3);
    if (related.length < 3) {
      related = related.concat(ITEMS.filter((i) => i.featured && i !== it && !related.includes(i)).slice(0, 3 - related.length));
    }
    const inKits = KITS.filter((k) => k.items.includes(it.slug));
    const kitLine = inKits.length
      ? `<p style="margin-top:18px">Part of: ${inKits.map((k) => `<a href="/kits/#${k.slug}">${e(k.name)}</a>`).join(", ")}</p>` : "";
    const li = (arr) => arr.map((s) => `<li>${e(s)}</li>`).join("");
    const rentalFaqs = [
      [`How much does the ${it.name} cost to rent?`, `The daily rental rate is ${dailyRate(it)}. Contact IdeaBay with your dates to confirm availability, the deposit and any multi-day quote.`],
      [`Where can I collect the ${it.name}?`, `Collect from IdeaBay Studio, ${SITE.street}, ${SITE.city}, Sri Lanka. Pickup and return are by appointment. We serve shoots across Colombo and nearby areas.`],
      [`How do I book this ${c.name.toLowerCase()} rental?`, `Use View Availability to send the item and your rental dates to IdeaBay on WhatsApp. Confirm accessories, pickup time and the total quote before booking.`],
    ];
    const body = `
<div class="container">${crumbsHtml(trail)}
  <article class="pdp">
    ${media(it, true)}
    <div>
      <div class="brand-line">${e(it.brand)} · ${e(c.name)}</div>
      <h1>${e(it.name)} for rent in Colombo</h1>
      <p class="lead">${e(it.desc)}</p>
      <div class="price-box"><span class="price">${priceHtml(it)}</span>
        <a class="btn btn-dark" href="${e(availabilityUrl(it))}" target="_blank" rel="noopener">${ICONS.wa} View Availability</a></div>
      <h2>Key specs</h2><ul class="ticks">${li(it.specs)}</ul>
      <h2>What's included</h2><ul class="ticks">${li(it.includes)}</ul>
      <h2>Great for</h2><ul class="tags">${li(it.good_for || [])}</ul>
      ${kitLine}
      <p style="margin-top:26px;color:var(--muted);font-size:.92rem">Pick up from IdeaBay Studio, ${e(SITE.street)}, ${e(SITE.city)}. Bring your NIC. A refundable deposit may apply.</p>
    </div>
  </article>
</div>
<section class="section"><div class="container"><h2>Rental details</h2><div class="faq">${rentalFaqs.map(([q,a]) => `<details><summary>${e(q)}</summary><p>${e(a)}</p></details>`).join("")}</div><p><a href="/how-it-works/">Rental terms and booking process</a> · <a href="/contact/">Pickup location and contact details</a></p></div></section>
<section class="section alt"><div class="container">
  <div class="section-head"><h2>You may also need</h2><a class="btn btn-ghost" href="/gear/${c.slug}/">More ${e(c.name.toLowerCase())} →</a></div>
  <div class="grid">${related.map((r) => card(r)).join("")}</div>
</div></section>`;

    const img = itemImage(it);
    const product = {
      "@context": "https://schema.org", "@type": "Product", "@id": absUrl(url + "#product"), sku: it.slug, name: `${it.name} (Rental)`,
      description: it.desc, brand: { "@type": "Brand", name: it.brand },
      category: c.name, url: absUrl(url), image: [absUrl(shareImage(it)), ...(img ? [absUrl(img)] : [])],
      additionalProperty: it.specs.map(value => ({ "@type": "PropertyValue", name: "Specification", value })),
      mainEntityOfPage: { "@id": absUrl(url + "#webpage") },
    };
    if (it.price) {
      product.offers = {
        "@type": "Offer", price: String(it.price), priceCurrency: "LKR",
        url: absUrl(url),
        description: `Daily equipment rental; availability and deposit confirmed when booking.`,
        businessFunction: "http://purl.org/goodrelations/v1#LeaseOut",
        priceSpecification: { "@type": "UnitPriceSpecification", price: String(it.price), priceCurrency: "LKR", unitCode: "DAY", unitText: "day", referenceQuantity: { "@type": "QuantitativeValue", value: 1, unitCode: "DAY" } },
        seller: { "@id": absUrl("/#store") },
      };
    }
    const desc = `Rent ${rentalName(it)} in Colombo from ${dailyRate(it)}. Pickup in Maharagama. ${it.short} WhatsApp IdeaBay to book.`;
    page(url, `${rentalName(it)} Rental Colombo | ${dailyRate(it)} | IdeaBay`, desc, body,
      { schemas: [crumbsSchema(trail), product], ogType: "product", priority: "0.7", ogImage: shareImage(it), imageAlt: `${it.name} — ${dailyRate(it)} — IdeaBay Renting Store`, mainEntity: absUrl(url + "#product") });
  }
}

function buildKits() {
  const trail = [["Home", "/"], ["Kits", "/kits/"]];
  const body = pageHero(trail, "Production kit rental",
    "Bundled camera, lens, audio and light packages for common shoots, with the parts already chosen to work together and a better rate than renting each piece.") + `
<section class="section"><div class="container">
  <div class="kits">${kitsHtml(KITS)}</div>
  <div class="prose" style="margin-top:60px"><h2>Need a custom kit?</h2>
  <p>Tell us the job: wedding, podcast, music video, corporate interview or product shoot. We'll put together a gear list and quote for your budget. <a href="${e(wa("Hi IdeaBay! I'd like a custom kit for: "))}" target="_blank" rel="noopener">Start on WhatsApp</a>.</p></div>
</div></section>`;
  page("/kits/", "Camera Kit Rental Colombo | Wedding, Podcast & Creator Kits | IdeaBay",
    "Rent complete production kits in Maharagama, Colombo: a content creator kit, an interview and podcast kit, and a wedding cinema kit. Camera, lens, mics and lights bundled at one rate.",
    body, { schemas: [crumbsSchema(trail)], priority: "0.8" });
}

function buildHow() {
  const trail = [["Home", "/"], ["How It Works", "/how-it-works/"]];
  const body = pageHero(trail, "How renting works", "Book, pick up, shoot and return. Here's everything you need to know before your first rental.") + `
<section class="section"><div class="container">${stepsHtml()}</div></section>
<section class="section alt"><div class="container two">
  <div class="prose"><span class="eyebrow">Before you rent</span><h2>What to bring</h2><ul class="ticks">
    <li>Original NIC or passport</li><li>Proof of address (first-time renters)</li>
    <li>A refundable security deposit for high-value items</li><li>Your own bag or case if you prefer (we provide cases where available)</li></ul></div>
  <div class="prose"><span class="eyebrow">The fine print</span><h2>Rental terms</h2><ul class="ticks">
    <li>Rates are per 24-hour day from pickup time</li>
    <li>Weekend and multi-day rates on request</li>
    <li>Late returns are charged at the daily rate</li>
    <li>The renter is responsible for loss or damage during the rental</li>
    <li>Gear is checked together at pickup and return</li>
    <li>Bookings are confirmed once the deposit or advance is received</li></ul></div>
</div></section>`;
  const howto = {
    "@context": "https://schema.org", "@type": "HowTo", name: "How to rent camera gear from IdeaBay",
    step: ["Pick your gear", "Message IdeaBay with your dates", "Pick up and check the gear in Maharagama", "Shoot and return on time"]
      .map((name, i) => ({ "@type": "HowToStep", position: i + 1, name })),
  };
  page("/how-it-works/", "How Camera Rental Works | Terms & Requirements | IdeaBay Colombo",
    "How to rent camera gear from IdeaBay in Maharagama, Colombo: booking, NIC and deposit requirements, pickup, rental periods and return terms.",
    body, { schemas: [crumbsSchema(trail), howto], priority: "0.6" });
}

function buildFaq() {
  const trail = [["Home", "/"], ["FAQ", "/faq/"]];
  const qa = FAQS.map(([q, a], n) => `<details${n === 0 ? " open" : ""}><summary>${e(q)}</summary><p>${e(a)}</p></details>`).join("");
  const body = pageHero(trail, "Frequently asked questions", "Bookings, pickup, deposits, damage and more.") +
    `<section class="section"><div class="container"><div class="faq">${qa}</div></div></section>`;
  const faq = {
    "@context": "https://schema.org", "@type": "FAQPage",
    mainEntity: FAQS.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
  };
  page("/faq/", "Camera Rental FAQ | Deposits, Pickup & Terms | IdeaBay Colombo",
    "Answers about renting cameras and gear from IdeaBay in Maharagama: how to book, what documents you need, deposits, delivery, damage and studio hire.",
    body, { schemas: [crumbsSchema(trail), faq], priority: "0.6" });
}

function buildAbout() {
  const trail = [["Home", "/"], ["About", "/about/"]];
  const body = pageHero(trail, "About IdeaBay Renting Store", "Pro production gear for Sri Lankan creators at a price that makes sense.") + `
<section class="section"><div class="container two">
  <div class="prose">
    <h2>Built by people who shoot</h2>
    <p>IdeaBay started as a creative studio in Nawinna, Maharagama, making podcasts, interviews, brand films and photo shoots. Over time we built up a kit of pro cameras, lenses, gimbals, audio and lights, and we heard the same request again and again from other creators: <em>"Can we rent that?"</em></p>
    <p><strong>IdeaBay Renting Store</strong> grew from that. You can rent the same gear we use on our own productions. It's maintained to studio standard and costs far less than buying.</p>
    <h2>What we stand for</h2>
    <ul class="ticks"><li>Gear that works: tested before every handover</li><li>Honest, simple pricing</li><li>Real help from people who use the kit</li><li>Supporting Sri Lanka's creator community</li></ul>
  </div>
  <div class="prose">
    <h2>IdeaBay Studio</h2>
    <p>${e(SITE.studio_note)}</p>
    <p>Rent the gear and the space together for a single, smooth shoot day. The studio has custom sets, studio lighting and multi-camera capture.</p>
    <p><a class="btn btn-dark" href="/contact/">Visit us</a></p>
  </div>
</div></section>`;
  page("/about/", "About IdeaBay Renting Store | Camera Rental in Maharagama",
    "IdeaBay Renting Store rents pro cameras, lenses and production gear from IdeaBay Studio in Nawinna, Maharagama. Gear maintained to studio standard for Sri Lankan creators.",
    body, { schemas: [crumbsSchema(trail)], priority: "0.5" });
}

function buildContact() {
  const trail = [["Home", "/"], ["Contact", "/contact/"]];
  const body = pageHero(trail, "Visit IdeaBay in Maharagama", "Camera and equipment rental pickup at IdeaBay Studio, 21/2 Rajamahavihara Road, Nawinna, Maharagama. Message us before visiting.") + `
<section class="section"><div class="container two">
  <div class="info">
    <div class="info-row"><span class="ico">${ICONS.wa}</span><div><strong>WhatsApp (fastest)</strong><a href="${e(wa("Hi IdeaBay! "))}" target="_blank" rel="noopener">${SITE.phone_display}</a></div></div>
    <div class="info-row"><span class="ico">${ICONS.phone}</span><div><strong>Call</strong><a href="tel:${SITE.phone}">${SITE.phone_display}</a> · <a href="tel:${altTel(SITE.phone_alt_display)}">${SITE.phone_alt_display}</a></div></div>
    <div class="info-row"><span class="ico">${ICONS.pin}</span><div><strong>Pickup location</strong><address style="font-style:normal">IdeaBay Studio, ${e(SITE.street)},<br>${e(SITE.city)} ${SITE.postal}, Sri Lanka</address>
      <a href="${e(directionsUrl())}" target="_blank" rel="noopener">Get directions →</a></div></div>
    <div class="info-row"><span class="ico">${ICONS.clock}</span><div><strong>Hours</strong>${e(SITE.hours_display)}</div></div>
    <div class="info-row"><span class="ico">${ICONS.fb}</span><div><strong>Social</strong><a href="${SITE.facebook}" target="_blank" rel="noopener">Facebook</a> · <a href="${SITE.instagram}" target="_blank" rel="noopener">Instagram</a></div></div>
  </div>
  <iframe class="map" title="Map to IdeaBay Studio, Maharagama" loading="lazy" referrerpolicy="no-referrer-when-downgrade"
    width="720" height="480" allowfullscreen src="https://www.google.com/maps?q=${SITE.latitude},${SITE.longitude}&amp;z=17&amp;output=embed"></iframe>
</div></section>`;
  page("/contact/", `Contact IdeaBay Renting Store | Nawinna, Maharagama | ${SITE.phone_display}`,
    `Contact IdeaBay Renting Store on WhatsApp at ${SITE.phone_display} or visit 21/2 Rajamahavihara Road, Nawinna, Maharagama, to rent cameras, lenses and gear.`,
    body, { schemas: [crumbsSchema(trail), storeSchema()], priority: "0.7" });
}

function buildLocalRental() {
  const trail = [["Home", "/"], ["Camera rental in Colombo", "/camera-rental-colombo/"]];
  const localFaqs = [
    ["Where can I rent a camera in Maharagama?", `IdeaBay Renting Store offers camera and production gear rental with pickup at IdeaBay Studio, ${SITE.street}, Maharagama. Confirm your equipment and rental dates on WhatsApp before visiting.`],
    ["Can I rent camera equipment for a shoot in Colombo?", "Yes. Choose your camera, lenses, audio and lighting from our catalog and send your shoot dates. Equipment is collected and returned at our Maharagama store; delivery is not promised online."],
    ["Do you serve Nugegoda, Kottawa and Pannipitiya?", "Customers shooting in Nugegoda, Kottawa, Pannipitiya, Homagama and Colombo can book gear for pickup in Nawinna, Maharagama. We have one pickup location, at IdeaBay Studio."],
    ["How much does camera rental cost?", "Rates depend on the camera, accessories and rental period. Use View Availability on a product to request its current rate, availability and deposit requirements. Confirm the quote before booking."],
    ["What should I include in my availability enquiry?", "Send the equipment name, shoot date, pickup time, return time and any lens or audio requirements. Our team can confirm a compatible setup and the rental terms."]
  ];
  const body = pageHero(trail, "Camera rental in Colombo &amp; Maharagama", "Sony camera bodies, lenses, wireless microphones and production lighting. One pickup point at IdeaBay Studio in Nawinna, Maharagama, serving shoots across Colombo and nearby suburbs.") + `
<section class="section"><div class="container two"><div class="prose"><span class="eyebrow">Your local equipment pickup</span><h2>Book your gear. Collect in Maharagama.</h2><p>Planning a wedding, interview, product shoot or content session? Browse the rental collection, choose your equipment and send us the dates. We confirm availability and rates before you collect.</p><p><strong>Pickup:</strong> IdeaBay Studio, ${e(SITE.street)}, ${e(SITE.city)}, Sri Lanka. Pickups and returns are by appointment. Bring your NIC; a refundable deposit may apply.</p><p>Our store serves customers working in <strong>Maharagama, Nawinna, Nugegoda, Kottawa, Pannipitiya, Homagama and Colombo</strong>. These are service areas; all collections are from the same Maharagama store.</p><div class="hero-actions"><a class="btn btn-amber" href="/gear/">Browse equipment</a><a class="btn btn-ghost" href="${e(directionsUrl())}" target="_blank" rel="noopener">Directions to the store ↗</a></div></div><div class="prose"><h2>Choose equipment for your shoot</h2><ul><li><a href="/gear/cameras/">Sony camera rental</a> — FX3 and A7 IV bodies.</li><li><a href="/gear/lenses/">Sony and Sigma lens hire</a> — standard zooms, telephoto lenses and primes.</li><li><a href="/gear/audio/">Audio rental</a> — wireless microphones and podcast equipment.</li><li><a href="/gear/lighting/">Lighting hire</a> — LED lights, flash and modifiers.</li><li><a href="/gear/other/">Gimbal rental</a> and <a href="/gear/other/">crew intercom</a> for supported camera movement.</li></ul><p>For interviews, content creation and weddings, explore our <a href="/kits/">production kits</a>. Ask us to confirm compatibility and included accessories for your setup.</p></div></div></section>
<section class="section alt"><div class="container"><h2>Before you book</h2><div class="faq">${localFaqs.map(([q,a])=>`<details><summary>${e(q)}</summary><p>${e(a)}</p></details>`).join("")}</div><p style="margin-top:24px"><a href="/contact/">Contact details, store map and pickup location →</a></p></div></section>`;
  page("/camera-rental-colombo/", "Camera Rental Colombo & Maharagama | IdeaBay Renting Store", "Rent Sony cameras, lenses, microphones and lighting for shoots across Colombo. Collect at IdeaBay Studio in Nawinna, Maharagama. WhatsApp for rates.", body, { priority: "0.9", schemas: [crumbsSchema(trail), { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: localFaqs.map(([q,a])=>({ "@type": "Question", name:q, acceptedAnswer:{ "@type":"Answer",text:a } })) }] });
}

function build404() {
  const body = pageHero([["Home", "/"]], "Page not found", "That page has moved or never existed. Try the gear catalog instead.") +
    '<section class="section"><div class="container"><a class="btn btn-dark" href="/gear/">Browse rental gear</a></div></section>';
  page("/404.html", "Page not found | IdeaBay Renting Store", "Page not found.", body, { noindex: true });
}

// ------------------------------------------------------------------ assets
function buildAssets() {
  fs.cpSync(STATIC, path.join(OUT, "static"), { recursive: true });
  fs.copyFileSync(path.join(ROOT, "showreel.mp4"), path.join(OUT, "static", "showreel.mp4"));
  fs.copyFileSync(path.join(ROOT, "logo.png"), path.join(OUT, "static", "logo.png"));
  fs.writeFileSync(path.join(OUT, "robots.txt"), `User-agent: *\nAllow: /\nDisallow: /404.html\n\nSitemap: ${SITE.url}/sitemap.xml\n`);
  const urls = SITEMAP.map(([p, pr]) => {
    const it = ITEMS.find(it => itemUrl(it) === p);
    const image = it ? `<image:image><image:loc>${e(absUrl(itemImage(it)))}</image:loc></image:image>` : "";
    return `  <url><loc>${absUrl(p)}</loc>${image}<priority>${pr}</priority></url>\n`;
  }).join("");
  fs.writeFileSync(path.join(OUT, "sitemap.xml"),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${urls}</urlset>\n`);
  fs.writeFileSync(path.join(OUT, "site.webmanifest"), JSON.stringify({
    name: SITE.name, short_name: SITE.short, start_url: "/", display: "standalone",
    background_color: "#ffffff", theme_color: "#1d3527",
    icons: [{ src: "/static/logo.png", sizes: "any", type: "image/png" }],
  }, null, 2));
}

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
buildHome(); buildGear(); buildCategories(); buildItems(); buildKits();
buildHow(); buildFaq(); buildAbout(); buildContact(); buildLocalRental(); build404();
buildAssets();
console.log(`Built ${SITEMAP.length + 1} pages -> ${OUT}`);
