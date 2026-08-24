import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { HtmlValidate } from 'html-validate';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');

test('index.html passes html-validate with no errors', async () => {
  const htmlvalidate = new HtmlValidate();
  const report = await htmlvalidate.validateFile(join(root, 'index.html'));

  if (!report.valid) {
    const messages = report.results
      .flatMap((r) => r.messages)
      .map((m) => `  ${m.line}:${m.column} ${m.ruleId} — ${m.message}`)
      .join('\n');
    assert.fail(`html-validate found ${report.errorCount} error(s):\n${messages}`);
  }
  assert.ok(report.valid);
});
