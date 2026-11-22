import { readdir, readFile, stat } from 'node:fs/promises';
import { extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const KiB = 1024;
const MiB = 1024 * KiB;
const limits = {
  startupJavaScript: 145 * KiB,
  totalJavaScript: 165 * KiB,
  distribution: 6.25 * MiB,
};

const directory = fileURLToPath(new URL('../dist/', import.meta.url));
const buildOrigin = 'https://build.invalid';

async function startupChunks() {
  const html = await readFile(join(directory, 'index.html'), 'utf8');
  const chunks = new Set();
  // Vite emits modulepreload links for the entry chunk's static imports.
  for (const [tag, name] of html.matchAll(/<(script|link)\b[^>]*>/gi)) {
    const attributes = new Map(Array.from(
      tag.matchAll(/\b([\w-]+)=["']([^"']*)["']/g),
      ([, attr, value]) => [attr, value],
    ));
    const asset = name === 'script'
      ? attributes.get('src')
      : attributes.get('rel') === 'modulepreload' ? attributes.get('href') : undefined;
    if (!asset) continue;
    const url = new URL(asset, buildOrigin);
    if (url.origin === buildOrigin && extname(url.pathname) === '.js') {
      chunks.add(decodeURIComponent(url.pathname.slice(1)));
    }
  }
  if (!chunks.size) throw new Error('No local startup scripts found in dist/index.html.');
  return chunks;
}

async function measureBuild() {
  const startup = await startupChunks();
  let startupJavaScript = 0;
  let totalJavaScript = 0;
  let distribution = 0;

  for (const entry of await readdir(directory, { recursive: true, withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const file = join(entry.parentPath, entry.name);
    distribution += (await stat(file)).size;
    if (extname(file) !== '.js') continue;
    const bytes = gzipSync(await readFile(file)).byteLength;
    totalJavaScript += bytes;
    if (startup.delete(relative(directory, file).replaceAll('\\', '/'))) {
      startupJavaScript += bytes;
    }
  }
  if (startup.size) throw new Error(`Startup scripts missing from dist: ${[...startup].join(', ')}`);
  return { startupJavaScript, totalJavaScript, distribution };
}

try {
  const sizes = await measureBuild();
  const budgets = [
    ['Startup JavaScript (gzip)', sizes.startupJavaScript, limits.startupJavaScript, KiB, 'KiB'],
    ['All JavaScript (gzip)', sizes.totalJavaScript, limits.totalJavaScript, KiB, 'KiB'],
    ['Published files (raw)', sizes.distribution, limits.distribution, MiB, 'MiB'],
  ];
  for (const [name, actual, limit, unit, suffix] of budgets) {
    const actualSize = (actual / unit).toFixed(2);
    const limitSize = (limit / unit).toFixed(2);
    console.log(`${name}: ${actualSize} / ${limitSize} ${suffix}`);
    if (actual > limit) process.exitCode = 1;
  }
  if (process.exitCode === 1) console.error('Production build exceeds its size budget.');
} catch (error) {
  console.error(`Could not check the production build. Run npm run build first. ${error.message}`);
  process.exitCode = 1;
}
