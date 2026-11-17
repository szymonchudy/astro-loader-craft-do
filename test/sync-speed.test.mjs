import assert from 'node:assert/strict';
import test from 'node:test';
import { craftCollection } from '../dist/index.js';

const body = '<collectionItem>\n  <title>Empty</title>\n</collectionItem>';

// Records request kinds and peak concurrency; `version` changes an item's blocks.
function fixtureLoader(items, { delay = 0 } = {}) {
  const requests = [];
  const versions = new Map();
  let active = 0;
  let peak = 0;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    active++;
    peak = Math.max(peak, active);
    try {
      await new Promise((resolve) => setTimeout(resolve, delay));
      if (url.pathname.endsWith('/items')) return Response.json({ items });
      const id = url.searchParams.get('id');
      if (init?.headers?.Accept === 'application/json') {
        requests.push(`blocks:${id}`);
        return Response.json({ id, type: 'collectionItem', content: [], version: versions.get(id) ?? 0 });
      }
      requests.push(`markdown:${id}`);
      return new Response(body);
    } finally {
      active--;
    }
  };
  try {
    const loader = craftCollection({ apiUrl: 'https://connect.craft.do/link/synthetic/api/v1', apiKey: 'synthetic', collectionId: 'synthetic' });
    return { loader, requests, versions, peak: () => peak };
  } finally {
    globalThis.fetch = originalFetch;
  }
}

function context({ dev }) {
  const entries = new Map();
  const meta = new Map();
  const parsed = [];
  return {
    entries,
    meta,
    parsed,
    ...(dev ? { watcher: {} } : {}),
    parseData: async ({ id, data }) => { parsed.push(id); return data; },
    renderMarkdown: async () => ({ html: '' }),
    generateDigest: (data) => JSON.stringify(data),
    store: { entries: () => [...entries], get: (id) => entries.get(id), clear: () => entries.clear(), set: (entry) => entries.set(entry.id, entry) },
    logger: { info() {} },
  };
}

const items = Array.from({ length: 9 }, (_, index) => ({ id: `item-${index}`, title: `Title ${index}`, properties: {} }));

test('items load concurrently within the internal limit and keep Collection order', async () => {
  const { loader, peak } = fixtureLoader(items, { delay: 5 });
  const state = context({ dev: false });
  await loader.load(state);
  assert.deepEqual([...state.entries.keys()], items.map(({ id }) => id));
  assert.ok(peak() > 1, 'items should overlap');
  assert.ok(peak() <= 4, `peak concurrency ${peak()} exceeds the limit`);
});

test('development reuses unchanged items and reprocesses changed ones', async () => {
  const { loader, requests, versions } = fixtureLoader(items.slice(0, 2));
  const state = context({ dev: true });
  await loader.load(state);
  const first = state.entries.get('item-0');
  requests.length = 0;
  state.parsed.length = 0;
  versions.set('item-1', 1);
  await loader.load(state);
  assert.deepEqual(requests.sort(), ['blocks:item-0', 'blocks:item-1', 'markdown:item-1']);
  assert.deepEqual(state.parsed, ['item-1']);
  assert.deepEqual(state.entries.get('item-0'), first);
  assert.deepEqual([...state.entries.keys()], ['item-0', 'item-1']);
});

test('changed properties or titles are not reused', async () => {
  const current = [{ id: 'item-0', title: 'Before', properties: { slug: 'a' } }];
  const { loader } = fixtureLoader(current);
  const state = context({ dev: true });
  await loader.load(state);
  current[0] = { ...current[0], title: 'After' };
  await loader.load(state);
  assert.equal(state.entries.get('item-0').data.title, 'After');
  current[0] = { ...current[0], properties: { slug: 'b' } };
  await loader.load(state);
  assert.equal(state.entries.get('item-0').data.properties.slug, 'b');
});

test('builds never reuse entries and forget development digests', async () => {
  const { loader, requests } = fixtureLoader(items.slice(0, 1));
  const state = context({ dev: true });
  await loader.load(state);
  assert.ok(state.meta.size);
  delete state.watcher;
  requests.length = 0;
  await loader.load(state);
  assert.deepEqual(requests, ['blocks:item-0', 'markdown:item-0']);
  assert.equal(state.meta.size, 0);
  // A later dev session starts from a full sync, never from build-rendered entries.
  state.watcher = {};
  requests.length = 0;
  await loader.load(state);
  assert.deepEqual(requests, ['blocks:item-0', 'markdown:item-0']);
});

test('one failed item stops new work and preserves the previous snapshot', async () => {
  const { loader } = fixtureLoader(items, { delay: 2 });
  const state = context({ dev: false });
  await loader.load(state);
  const before = new Map(state.entries);
  state.parseData = async ({ id, data }) => {
    state.parsed.push(id);
    if (id === 'item-0') throw new Error('Invalid entry');
    return data;
  };
  state.parsed.length = 0;
  await assert.rejects(loader.load(state), /Invalid entry/);
  assert.deepEqual(state.entries, before);
  assert.ok(state.parsed.length < items.length, 'workers should stop taking new items');
});
