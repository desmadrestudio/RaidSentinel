import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { parse } from 'node-html-parser';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');

const html = readFileSync(join(root, 'index.html'), 'utf8');
const doc = parse(html);

// These assertions lock in accessibility and SEO affordances the page already
// has, so a future edit can't quietly strip them.

test('document declares a language', () => {
  const htmlEl = doc.querySelector('html');
  assert.ok(htmlEl, 'missing <html> element');
  assert.ok((htmlEl.getAttribute('lang') || '').length > 0, '<html> is missing a lang attribute');
});

test('document has a non-empty <title> and meta description', () => {
  const title = doc.querySelector('title');
  assert.ok(title && title.text.trim().length > 0, 'missing or empty <title>');

  const desc = doc.querySelector('meta[name="description"]');
  assert.ok(desc, 'missing meta description');
  assert.ok((desc.getAttribute('content') || '').trim().length > 0, 'meta description is empty');
});

test('has a viewport meta tag for mobile responsiveness', () => {
  const viewport = doc.querySelector('meta[name="viewport"]');
  assert.ok(viewport, 'missing viewport meta tag');
});

test('exactly one <h1> establishes the page heading', () => {
  const h1s = doc.querySelectorAll('h1');
  assert.equal(h1s.length, 1, `expected exactly one <h1>, found ${h1s.length}`);
});

test('every anchor target section referenced by the nav exists', () => {
  const navLinks = doc
    .querySelectorAll('nav a')
    .map((a) => a.getAttribute('href'))
    .filter((h) => h && h.startsWith('#'));
  const ids = new Set(doc.querySelectorAll('[id]').map((el) => el.getAttribute('id')));
  assert.ok(navLinks.length > 0, 'expected navigation anchors');
  for (const link of navLinks) {
    assert.ok(ids.has(link.slice(1)), `nav links to "${link}" but no such section id exists`);
  }
});

test('the demo <video> has an accessible label and a source', () => {
  const video = doc.querySelector('video');
  assert.ok(video, 'expected a <video> element in the demo section');
  const label = video.getAttribute('aria-label') || video.getAttribute('aria-labelledby');
  assert.ok(label, '<video> is missing an accessible label');
  const source = video.querySelector('source');
  assert.ok(source && source.getAttribute('src'), '<video> is missing a <source> src');
});

test('links that open external destinations carry a discernible label or text', () => {
  const links = doc.querySelectorAll('a');
  for (const a of links) {
    const text = a.text.trim();
    const label = a.getAttribute('aria-label');
    assert.ok(text.length > 0 || (label && label.length > 0), 'found an anchor with no text or aria-label');
  }
});
