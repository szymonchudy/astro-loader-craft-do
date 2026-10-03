import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = fileURLToPath(new URL('../', import.meta.url));

function runConsumer(command, invalid = false, customRenderer = false) {
  return spawnSync('pnpm', ['--dir', 'examples/basic', command], {
    cwd: root,
    env: { ...process.env, CRAFT_TEST_FIXTURE: '1', CRAFT_FIXTURE_INVALID: invalid ? '1' : '0', CRAFT_FIXTURE_RENDERER: customRenderer ? 'custom' : '' },
    encoding: 'utf8',
    timeout: 120_000,
  });
}

function output(result) {
  assert.ifError(result.error);
  return `${result.stdout}\n${result.stderr}`;
}

test('consumer renders parsed data, infers schema types, and rejects invalid data', () => {
  const valid = runConsumer('build');
  assert.equal(valid.status, 0, output(valid));
  const html = readFileSync(new URL('../examples/basic/dist-fixture/index.html', import.meta.url), 'utf8');
  assert.match(html, /Synthetic article/);
  assert.match(html, /Status: published/);
  assert.match(html, /Tags: 0/);
  assert.match(html, /<h2[^>]*>Synthetic body<\/h2>/);
  assert.match(html, /Rendered through <strong>Astro<\/strong>/);
  assert.match(html, /<aside data-craft-callout role="note">\s*<p>Keep <strong>emphasis<\/strong> and <code>code<\/code>\.<\/p>\s*<\/aside>\s*<p>After the callout\.<\/p>/);
  assert.match(html, /<blockquote>\s*<p>An ordinary quotation\.<\/p>\s*<\/blockquote>/);
  assert.doesNotMatch(html, /<(?:callout|highlight|caption|page|content)[\s>]/);
  assert.match(html, /<details>\s*<summary>Why this matters<\/summary>\s*<ul>\s*<li>This explanation should start collapsed\.<\/li>/);
  assert.match(html, /<summary>Nested explanation<\/summary>[\s\S]*<strong>Nested body<\/strong> with <mark>emphasis<\/mark>/);
  assert.match(html, /<li>\s*<p>Parent list<\/p>\s*<details>\s*<summary>Details inside a list<\/summary>/);
  assert.match(html, /<blockquote>\s*<details>\s*<summary>Details inside a quote<\/summary>/);
  assert.doesNotMatch(html, /<details[^>]*\bopen\b/);
  assert.match(html, /<mark><strong>highlighted<\/strong> phrase<\/mark>/);
  assert.match(html, /<em>An <em>image caption<\/em>\.<\/em>/);
  assert.match(html, /<table>[\s\S]*<td>Preserved<\/td>/);

  const types = runConsumer('typecheck');
  assert.equal(types.status, 0, output(types));

  // Unchanged source data must pick up a consumer's rendering customization.
  const customized = runConsumer('build', false, true);
  assert.equal(customized.status, 0, output(customized));
  const customHtml = readFileSync(new URL('../examples/basic/dist-fixture/index.html', import.meta.url), 'utf8');
  assert.match(customHtml, /<blockquote>\s*<p>Consumer choice: Keep <strong>emphasis<\/strong> and <code>code<\/code>\.<\/p>\s*<\/blockquote>/);
  assert.match(customHtml, /Consumer details: Why this matters/);
  assert.match(customHtml, /Consumer page: Nested page/);
  assert.match(customHtml, /Caption: An/);
  assert.doesNotMatch(customHtml, /<details>|<mark>/);

  // Build again with the existing cache: changed data must still be validated.
  const invalid = runConsumer('build', true);
  const failure = output(invalid);
  assert.notEqual(invalid.status, 0, failure);
  assert.match(failure, /InvalidContentEntryDataError/);
  assert.match(failure, /synthetic-item/);
  assert.match(failure, /status/);

  // Leave the example's generated content in its successful state.
  const restored = runConsumer('build');
  assert.equal(restored.status, 0, output(restored));
});
