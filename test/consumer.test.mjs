import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = fileURLToPath(new URL('../', import.meta.url));

function runConsumer(command, invalid = false) {
  return spawnSync('pnpm', ['--dir', 'examples/basic', command], {
    cwd: root,
    env: { ...process.env, CRAFT_FIXTURE_INVALID: invalid ? '1' : '0' },
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
  const html = readFileSync(new URL('../examples/basic/dist/index.html', import.meta.url), 'utf8');
  assert.match(html, /Synthetic article/);
  assert.match(html, /Status: published/);
  assert.match(html, /Tags: 0/);
  assert.match(html, /<h2[^>]*>Synthetic body<\/h2>/);
  assert.match(html, /Rendered through <strong>Astro<\/strong>/);

  const types = runConsumer('typecheck');
  assert.equal(types.status, 0, output(types));

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
