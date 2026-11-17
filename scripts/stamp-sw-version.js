/**
 * Stamps a deterministic build-time CACHE_VERSION into out/sw.js after `next build`
 * so deployed static HTML, data JSONs, and assets bust old service worker caches automatically
 * without mutating the git-tracked public/sw.js source file.
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'out');
const SW_PATH = path.join(OUT_DIR, 'sw.js');

if (!fs.existsSync(SW_PATH)) {
  throw new Error('stamp-sw-version: out/sw.js not found. Run next build first.');
}

const hash = crypto.createHash('sha256');
hash.update(fs.readFileSync(SW_PATH));

const dataDir = path.join(OUT_DIR, 'data');
if (fs.existsSync(dataDir)) {
  for (const file of fs.readdirSync(dataDir).sort()) {
    const full = path.join(dataDir, file);
    if (fs.statSync(full).isFile()) {
      hash.update(file);
      hash.update(fs.readFileSync(full));
    }
  }
}

const staticChunksDir = path.join(OUT_DIR, '_next', 'static');
if (fs.existsSync(staticChunksDir)) {
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir).sort()) {
      const full = path.join(dir, entry);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) walk(full);
      else hash.update(path.relative(OUT_DIR, full));
    }
  };
  walk(staticChunksDir);
}

const stamp = `my11-${hash.digest('hex').slice(0, 12)}`;
const swContent = fs.readFileSync(SW_PATH, 'utf8');
const updated = swContent.replace(
  /const CACHE_VERSION = ['"][^'"]+['"];/,
  `const CACHE_VERSION = '${stamp}';`
);

if (updated === swContent) {
  throw new Error('stamp-sw-version: Failed to locate CACHE_VERSION constant in out/sw.js');
}

fs.writeFileSync(SW_PATH, updated);
console.log(`[stamp-sw-version] Stamped out/sw.js CACHE_VERSION = '${stamp}'`);
