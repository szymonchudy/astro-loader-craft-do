import assert from 'node:assert/strict';
import test from 'node:test';
import { createSyncBudget, limits } from '../dist/budget.js';
import { createCraftClient } from '../dist/craft-client.js';
import { craftCollection } from '../dist/index.js';
import { requestBytes } from '../dist/transport.js';

const connection = { apiUrl: 'https://connect.craft.do/synthetic', apiKey: 'synthetic', collectionId: 'collection' };
const paddedJson = (value, bytes) => {
  const empty = JSON.stringify({ ...value, unused: '' });
  return JSON.stringify({ ...value, unused: 'x'.repeat(bytes - Buffer.byteLength(empty)) });
};

test('all API pages share an exact 8 MiB allowance and the next byte fails', async () => {
  const budget = createSyncBudget();
  let calls = 0;
  const client = createCraftClient(connection, async url => {
    calls++;
    if (!url.pathname.endsWith('/items')) return new Response('x');
    const first = !url.searchParams.has('cursor');
    return new Response(paddedJson({ items: [], ...(first ? { nextCursor: 'next' } : {}) }, limits.apiBytes / 2));
  }, budget);
  try {
    assert.deepEqual(await client.listCollectionItems('collection'), []);
    await assert.rejects(client.getItemMarkdown('item'), /API response bytes across the sync/);
    assert.equal(calls, 3, 'The one-byte overflow is never retried');
  } finally { budget.time.close(); }
});

test('discarded JSON fields still count across independent structured operations', async () => {
  const budget = createSyncBudget();
  let calls = 0;
  const client = createCraftClient(connection, async url => {
    calls++;
    return new Response(paddedJson({ id: url.searchParams.get('id'), type: 'collectionItem', content: [] }, 3 * 1024 * 1024));
  }, budget);
  try {
    await client.getItemBlocks('first');
    await client.getItemBlocks('second');
    await assert.rejects(client.getItemBlocks('third'), /API response bytes across the sync/);
    assert.equal(calls, 3);
  } finally { budget.time.close(); }
});

test('partial API bytes survive a retry and aggregate overflow cancels its stream immediately', async () => {
  const budget = createSyncBudget();
  let calls = 0, canceled = false;
  const client = createCraftClient(connection, async () => {
    const first = ++calls === 1;
    let sent = false;
    return new Response(new ReadableStream({
      pull(controller) {
        if (!sent) {
          sent = true;
          controller.enqueue(new Uint8Array(limits.apiBytes / 2 + (first ? 0 : 1)));
        } else if (first) controller.error(new Error('Private upstream interruption'));
        else return new Promise(() => {});
      },
      cancel() { canceled = true; },
    }, { highWaterMark: 0 }));
  }, budget);
  try {
    await assert.rejects(client.getItemMarkdown('item'), error => {
      assert.match(error.message, /API response bytes across the sync/);
      assert.doesNotMatch(error.message, /Private|synthetic|https:/);
      return true;
    });
    assert.equal(calls, 2);
    assert.equal(canceled, true);
  } finally { budget.time.close(); }
});

test('API accounting is opt-in; separately bounded media does not spend the API allowance', async () => {
  const budget = createSyncBudget();
  const client = createCraftClient(connection, async () => new Response(new Uint8Array(limits.apiBytes)), budget);
  try {
    await client.getItemMarkdown('item');
    const bytes = await requestBytes(new URL('https://r.craft.do/synthetic'), async () => new Response('media'), {
      maximum: limits.mediaBytes, milliseconds: limits.mediaMs, parent: budget.time,
      failure: 'Media failed.', httpError: status => new Error(`HTTP ${status}`),
    });
    assert.equal(bytes.toString(), 'media');
    await assert.rejects(client.getItemMarkdown('item'), /API response bytes across the sync/);
  } finally { budget.time.close(); }
});

test('aggregate failure after a successful sync retains every old entry and a new sync gets a fresh allowance', async () => {
  let oversized = false, parseCalls = 0;
  const original = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    if (url.pathname.endsWith('/items')) {
      const first = !url.searchParams.has('cursor');
      const value = { items: [{ id: first ? 'first' : 'second', title: 'Synthetic', properties: {} }], ...(oversized && first ? { nextCursor: 'next' } : {}) };
      return oversized ? new Response(paddedJson(value, limits.apiBytes / 2)) : Response.json(value);
    }
    return init.headers.Accept === 'application/json'
      ? Response.json({ id: url.searchParams.get('id'), type: 'collectionItem', content: [] }) : new Response('');
  };
  let loader;
  try { loader = craftCollection(connection); } finally { globalThis.fetch = original; }
  const entries = new Map();
  const context = {
    store: { entries: () => [...entries], clear: () => entries.clear(), set: entry => entries.set(entry.id, entry) },
    parseData: async ({ data }) => { parseCalls++; return data; }, renderMarkdown: async () => ({ html: '' }),
    generateDigest: JSON.stringify, logger: { info() {} },
  };
  await loader.load(context);
  const previous = structuredClone([...entries]);
  assert.equal(parseCalls, 1);
  oversized = true;
  await assert.rejects(loader.load(context), /API response bytes across the sync/);
  assert.deepEqual([...entries], previous);
  assert.equal(parseCalls, 1, 'Overflow fails before consumer callbacks');
  oversized = false;
  await loader.load(context);
  assert.deepEqual([...entries], previous);
  assert.equal(parseCalls, 2);
});
