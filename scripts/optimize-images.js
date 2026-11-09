// Run locally after changing product photos; commit the generated images and manifest.
// Requires the cwebp command (brew install webp on macOS).
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { ITEMS } from '../data.js';
const dir = 'static/images/optimized';
fs.mkdirSync(dir, { recursive: true });
const manifest = {};
let originalBytes = 0, optimizedBytes = 0;
for (const item of ITEMS) {
  const source = ['webp', 'jpg', 'jpeg', 'png'].map(ext => `static/images/${item.slug}.${ext}`).find(file => fs.existsSync(file));
  if (!source) throw new Error(`Missing image: ${item.slug}`);
  const sourceHash = createHash('sha256').update(fs.readFileSync(source)).digest('hex');
  const variants = [];
  for (const width of [320, 640, 960]) {
    const filename = `${item.slug}-${width}.webp`;
    const output = path.join(dir, filename);
    execFileSync('cwebp', ['-quiet', '-q', '82', '-m', '6', '-alpha_q', '100', '-resize', String(width), '0', source, '-o', output]);
    variants.push({ width, src: `/static/images/optimized/${filename}` });
  }
  manifest[item.slug] = { source, sourceHash, variants };
  originalBytes += fs.statSync(source).size;
  optimizedBytes += fs.statSync(path.join(dir, `${item.slug}-640.webp`)).size;
}
fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`19 product images: ${Math.round(originalBytes / 1024)} KB original → ${Math.round(optimizedBytes / 1024)} KB at 640px (${Math.round((1 - optimizedBytes / originalBytes) * 100)}% smaller).`);
