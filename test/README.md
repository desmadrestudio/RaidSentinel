# Tests

This repository is the static marketing/download site for the Raid Sentinel
Windows app (`index.html`, `styles.css`, and `latest-version.json`, which the
installed app fetches to check for updates). There is no application logic here,
but two things can break silently and are worth guarding:

1. Sending customers to a working checkout/download path.
2. Serving a valid version manifest the installed app can parse.

## Running

```bash
npm install
npm test          # runs the full suite via Node's built-in test runner
```

Individual suites: `npm run test:manifest`, `test:links`, `test:html`,
`test:structure`.

## What's covered

| Suite | File | Guards against |
|-------|------|----------------|
| Manifest | `manifest.test.js` | `latest-version.json` breaking its schema, a bad/blank field, or a **version downgrade** pushed to installed clients (semver floor). Schema in `latest-version.schema.json`. |
| Links & assets | `links.test.js` | Broken in-page anchors, missing local assets (case-sensitive, matters on GitHub Pages), non-https/malformed external links, and a missing Gumroad checkout link. |
| HTML validity | `html.test.js` | Malformed markup and accessibility misuse, via `html-validate` (config in `.htmlvalidate.json`). |
| Structure/a11y | `structure.test.js` | Regressions in `lang`, `<title>`, meta description, viewport, single `<h1>`, nav targets, labeled demo video, and discernible link text. |

## Not in `npm test`

`scripts/check-external-links.mjs` pings the real third-party URLs (Gumroad,
download links). It depends on external uptime, so it runs on a schedule
(`.github/workflows/external-links.yml`) rather than blocking pushes. Run it
manually with `npm run check:external-links`.

## Raising the version floor

`manifest.test.js` has a `VERSION_FLOOR` constant. Bumping the published
version above it passes automatically; raise the floor when you cut a release
you never want to ship behind.
