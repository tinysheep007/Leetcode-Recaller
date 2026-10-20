import { readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
async function walk(dir) {
  const result = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) result.push(...await walk(full)); else result.push(full);
  }
  return result;
}
const files = (await walk('.next/static')).filter(p => /\.(js|css|woff2?)$/.test(p));
const assets = ['/', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png', '/icons/apple-touch-icon.png', ...files.map(p => '/' + p.replace(/^\.next\//, '_next/'))];
const version = createHash('sha256').update(await readFile('.next/BUILD_ID')).digest('hex').slice(0, 16);
const template = await readFile('scripts/service-worker.template.js', 'utf8');
await writeFile('public/sw.js', template.replace('__CACHE_VERSION__', version).replace('__PRECACHE_ASSETS__', JSON.stringify(assets)));
console.log(`Offline worker generated: ${assets.length} assets, version ${version}`);
