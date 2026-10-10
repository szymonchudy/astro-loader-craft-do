import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import * as publication from '../scripts/verify-publication.mjs';

const version = '0.1.0-alpha.2';
const document = { name: 'astro-loader-craft-do', version, dist: { tarball: 'https://registry.npmjs.org/astro-loader-craft-do/-/synthetic.tgz', integrity: 'sha512-synthetic' } };
const metadata = (versions = { [version]: document }, tags = {}) => ({ name: document.name, versions, 'dist-tags': tags });
function sequence(values, extra = {}) {
  const reads = [];const waits = [];let clock = 0;
  return {
    reads, waits,
    options: {
      attempts: 3, intervalMs: 5, timeoutMs: 100,
      now: () => clock,
      read: async (...args) => { reads.push(args);const value = values.shift();if (value instanceof Error) throw value;return value === null ? null : JSON.stringify(value); },
      wait: async milliseconds => { waits.push(milliseconds);clock += milliseconds; },
      ...extra,
    },
  };
}

test('registry visibility waits for a missing package and version before proceeding', async () => {
  const f = sequence([null, metadata({}), metadata()]);let proceeded = false;
  const result = await publication.waitForRegistry(version, f.options);proceeded = true;
  assert.equal(result.versions[version].version, version);assert.equal(proceeded, true);
  assert.equal(f.reads.length, 3);assert.deepEqual(f.waits, [5, 5]);
});

test('tag propagation waits until alpha and latest both reference the visible version', async () => {
  const f = sequence([metadata(undefined, { alpha: '0.1.0-alpha.1', latest: '0.1.0-alpha.1' }), metadata(undefined, { alpha: version }), metadata(undefined, { alpha: version, latest: version })]);
  const result = await publication.waitForRegistry(version, { ...f.options, tags: ['alpha', 'latest'] });
  assert.equal(result['dist-tags'].alpha, version);assert.equal(result['dist-tags'].latest, version);
  assert.equal(f.reads.length, 3);assert.deepEqual(f.waits, [5, 5]);
});

test('finite exhausted visibility polling rejects and never proceeds on absent versions or stale tags', async () => {
  for (const tags of [[], ['alpha', 'latest']]) {
    const stale = tags.length ? metadata(undefined, { alpha: version, latest: '0.1.0-alpha.1' }) : metadata({});
    const f = sequence([stale, stale, stale]);let proceeded = false;
    await assert.rejects(async () => { await publication.waitForRegistry(version, { ...f.options, tags });proceeded = true; }, /Registry propagation timed out/);
    assert.equal(proceeded, false);assert.equal(f.reads.length, 3);assert.deepEqual(f.waits, [5, 5]);
  }
  const absent = sequence([metadata({}, { alpha: version, latest: version })], { attempts: 1 });
  await assert.rejects(publication.waitForRegistry(version, { ...absent.options, tags: ['alpha', 'latest'] }), /Registry propagation timed out/);
});

test('visibility polling respects its total deadline and bounds each registry read', async () => {
  const f = sequence([metadata({}), metadata({})], { timeoutMs: 7 });
  await assert.rejects(publication.waitForRegistry(version, f.options), /Registry propagation timed out/);
  assert.equal(f.reads.length, 2);assert.deepEqual(f.waits, [5, 2]);
  assert.deepEqual(f.reads.map(args => args[2]), [7, 2]);
});

test('malformed metadata and registry errors are fatal rather than treated as propagation', async () => {
  for (const value of [{}, metadata([]), metadata({ [version]: { ...document, version: 'wrong' } }), metadata(undefined, { alpha: 42 }), new Error('Registry verification failed with HTTP 500')]) {
    const f = sequence([value]);
    await assert.rejects(publication.waitForRegistry(version, { ...f.options, tags: ['alpha'] }));
    assert.equal(f.reads.length, 1);assert.deepEqual(f.waits, []);
  }
  await assert.rejects(publication.waitForRegistry(version, { read: async () => '{invalid JSON' }), /Malformed package metadata: invalid JSON/);
});

test('metadata arriving after the deadline cannot report success', async () => {
  let clock = 0;
  await assert.rejects(publication.waitForRegistry(version, {
    timeoutMs: 10, now: () => clock,
    read: async () => { clock = 11;return JSON.stringify(metadata()); },
    wait: async () => assert.fail('Expired polling must not sleep'),
  }), /Registry propagation timed out/);
});

test('wait-visible CLI runs without workflow output and does not claim artifact verification', () => {
  const moduleUrl = new URL('../scripts/verify-publication.mjs', import.meta.url);
  const env = { ...process.env };delete env.GITHUB_OUTPUT;
  const output = execFileSync(process.execPath, ['--input-type=module', '-e', `
    globalThis.fetch = async () => new Response(${JSON.stringify(JSON.stringify(metadata()))});
    process.argv = ['node', ${JSON.stringify(fileURLToPath(moduleUrl))}, 'unused.tgz', ${JSON.stringify(version)}, ${JSON.stringify('a'.repeat(40))}, '--wait-visible'];
    await import(${JSON.stringify(moduleUrl.href)});
  `], { env, encoding: 'utf8', timeout: 5_000 });
  assert.match(output, /Expected registry version is visible/);
  assert.match(output, /artifact and provenance verification must still pass/);
});

test('workflow waits before registry consumers and tag cleanup while retaining provenance checks', async () => {
  const workflow = await readFile(new URL('../.github/workflows/publish.yml', import.meta.url), 'utf8');
  const publish = workflow.indexOf('npm publish ');
  const visible = workflow.indexOf('--wait-visible', publish);
  const consumers = workflow.indexOf('pnpm test:package --registry', publish);
  const provenance = workflow.indexOf('"$PUBLISHED_SOURCE_SHA"', consumers);
  const promote = workflow.indexOf('npm dist-tag add ', consumers);
  const tags = workflow.indexOf('await waitForRegistry(', promote);
  const ownership = workflow.indexOf('Do not remove a staging tag owned by another candidate', tags);
  const cleanup = workflow.indexOf("['dist-tag', 'rm'", ownership);
  assert(publish < visible && visible < consumers && consumers < provenance && provenance < promote);
  assert(promote < tags && tags < ownership && ownership < cleanup);
});
