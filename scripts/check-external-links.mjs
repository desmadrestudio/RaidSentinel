// Reachability check for the external URLs this site depends on (checkout page,
// download/manifest URLs). Kept OUT of `npm test` because it depends on
// third-party uptime and would make the unit suite flaky; run on a schedule
// instead. Exits non-zero if any external URL is unreachable.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');

const html = readFileSync(join(root, 'index.html'), 'utf8');
const manifest = JSON.parse(readFileSync(join(root, 'latest-version.json'), 'utf8'));

const urls = new Set();
for (const m of html.matchAll(/href="(https:\/\/[^"]+)"/g)) urls.add(m[1]);
if (manifest.download_url) urls.add(manifest.download_url);
if (manifest.direct_download_url) urls.add(manifest.direct_download_url);

async function check(url) {
  const attempt = async (method) => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 15000);
    try {
      const res = await fetch(url, {
        method,
        redirect: 'follow',
        signal: ctrl.signal,
        headers: { 'user-agent': 'raidsentinel-linkcheck' },
      });
      return res.status;
    } finally {
      clearTimeout(timer);
    }
  };
  try {
    // Some hosts reject HEAD; fall back to GET before declaring a failure.
    let status = await attempt('HEAD');
    if (status >= 400) status = await attempt('GET');
    return { url, status, ok: status < 400 };
  } catch (err) {
    return { url, status: 0, ok: false, error: String(err.message || err) };
  }
}

const results = await Promise.all([...urls].map(check));
let failed = 0;
for (const r of results) {
  const label = r.ok ? 'OK ' : 'BAD';
  console.log(`${label} ${r.status || '---'}  ${r.url}${r.error ? `  (${r.error})` : ''}`);
  if (!r.ok) failed++;
}

console.log(`\n${results.length - failed}/${results.length} reachable`);
if (failed > 0) {
  console.error(`${failed} external URL(s) unreachable`);
  process.exit(1);
}
