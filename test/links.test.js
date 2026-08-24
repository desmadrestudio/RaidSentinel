import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, normalize } from 'node:path';
import { parse } from 'node-html-parser';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');

const html = readFileSync(join(root, 'index.html'), 'utf8');
const doc = parse(html, { comment: false });

function collect(attr) {
  return doc
    .querySelectorAll(`[${attr}]`)
    .map((el) => el.getAttribute(attr))
    .filter((v) => v != null && v !== '');
}

const hrefs = collect('href');
const srcs = collect('src');

test('every in-page anchor (#id) resolves to an element with that id', () => {
  const ids = new Set(doc.querySelectorAll('[id]').map((el) => el.getAttribute('id')));
  const anchors = hrefs.filter((h) => h.startsWith('#') && h.length > 1);
  assert.ok(anchors.length > 0, 'expected at least one in-page anchor to check');
  for (const a of anchors) {
    const targetId = a.slice(1);
    assert.ok(ids.has(targetId), `anchor "${a}" points to a missing id "#${targetId}"`);
  }
});

test('local asset references (href/src) point to files that exist on disk', () => {
  const refs = [...hrefs, ...srcs].filter(
    (r) =>
      !r.startsWith('#') &&
      !r.startsWith('http://') &&
      !r.startsWith('https://') &&
      !r.startsWith('data:') &&
      !r.startsWith('mailto:')
  );
  assert.ok(refs.length > 0, 'expected at least one local asset reference');
  for (const ref of refs) {
    const clean = ref.split(/[?#]/)[0];
    const resolved = normalize(join(root, clean));
    // Case-sensitive existence check matters: GitHub Pages serves case-sensitive
    // paths, so "Assets/x.mp4" vs "assets/x.mp4" is a real 404 risk (see the
    // prior "Fix public download URL casing" fix in git history).
    assert.ok(existsSync(resolved), `referenced local asset "${ref}" does not exist at ${clean}`);
  }
});

test('external links are absolute https URLs (no insecure or malformed hrefs)', () => {
  const external = hrefs.filter((h) => h.startsWith('http://') || h.startsWith('https://'));
  assert.ok(external.length > 0, 'expected at least one external link');
  for (const link of external) {
    assert.ok(link.startsWith('https://'), `external link is not https: ${link}`);
    assert.doesNotThrow(() => new URL(link), `external link is not a valid URL: ${link}`);
  }
});

test('the Gumroad checkout link is present (primary conversion path)', () => {
  const hasCheckout = hrefs.some((h) => h.includes('gumroad.com/l/raid-sentinel-pro'));
  assert.ok(hasCheckout, 'expected at least one Gumroad checkout link on the page');
});
