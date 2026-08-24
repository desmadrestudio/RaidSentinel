import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');

const manifest = JSON.parse(readFileSync(join(root, 'latest-version.json'), 'utf8'));
const schema = JSON.parse(readFileSync(join(here, 'latest-version.schema.json'), 'utf8'));

// The installed desktop app fetches latest-version.json to decide whether to
// prompt users to update. A malformed or regressed manifest breaks that flow
// silently for every installed copy, so it is validated here as an API contract.

// Minimum version this site is allowed to advertise. Bumping the real version
// above this floor passes automatically; a downgrade below it fails the build.
// Raise this floor when you cut a release you never want to ship behind.
const VERSION_FLOOR = '0.1.25';

function parseSemver(v) {
  const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(v);
  assert.ok(m, `version "${v}" is not a bare MAJOR.MINOR.PATCH semver`);
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

function compareSemver(a, b) {
  const pa = parseSemver(a);
  const pb = parseSemver(b);
  for (let i = 0; i < 3; i++) {
    if (pa[i] !== pb[i]) return pa[i] - pb[i];
  }
  return 0;
}

test('latest-version.json is valid JSON matching the manifest schema', () => {
  const ajv = new Ajv({ allErrors: true });
  addFormats(ajv);
  const validate = ajv.compile(schema);
  const ok = validate(manifest);
  assert.ok(ok, `schema violations: ${JSON.stringify(validate.errors, null, 2)}`);
});

test('latest_version is a valid semver', () => {
  parseSemver(manifest.latest_version);
});

test('latest_version does not regress below the release floor', () => {
  assert.ok(
    compareSemver(manifest.latest_version, VERSION_FLOOR) >= 0,
    `latest_version ${manifest.latest_version} is below the floor ${VERSION_FLOOR}; ` +
      'this would push a downgrade to installed clients.'
  );
});

test('download_url is a well-formed https URL', () => {
  const url = new URL(manifest.download_url);
  assert.equal(url.protocol, 'https:', 'download_url must use https');
});

test('direct_download_url is empty or a well-formed https URL', () => {
  if (manifest.direct_download_url !== '') {
    const url = new URL(manifest.direct_download_url);
    assert.equal(url.protocol, 'https:', 'direct_download_url must use https when set');
  }
});

test('message is non-empty so the app never surfaces a blank update notice', () => {
  assert.ok(manifest.message.trim().length > 0, 'message must not be blank');
});
