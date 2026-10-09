import assert from 'node:assert/strict';
import test from 'node:test';
import { craftCollection } from '../dist/index.js';

function fixtureLoader(items, renderers, body = '<collectionItem>\n  <title>Empty</title>\n</collectionItem>') {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => new URL(String(input)).pathname.endsWith('/items')
    ? Response.json({ items })
    : init?.headers?.Accept === 'application/json' ? Response.json({ id: new URL(String(input)).searchParams.get('id'), type: 'collectionItem', content: [] }) : new Response(body);
  try {
    return craftCollection({ apiUrl: 'https://connect.craft.do/link/synthetic/api/v1', apiKey: 'synthetic', collectionId: 'synthetic', renderers });
  } finally {
    globalThis.fetch = originalFetch;
  }
}

function context(parseData) {
  const entries = new Map([['stale', { id: 'stale' }]]);
  return {
    entries,
    parseData,
    renderMarkdown: async () => ({ html: '' }),
    generateDigest: (data) => JSON.stringify(data),
    store: { entries: () => [...entries], clear: () => entries.clear(), set: (entry) => entries.set(entry.id, entry) },
    logger: { info() {} },
  };
}

test('stores schema output, removes stale entries, and revalidates unchanged items', async () => {
  const loader = fixtureLoader([{ id: 'current', title: 'Title', properties: {} }]);
  let validations = 0;
  const state = context(async ({ data }) => {
    validations++;
    return { ...data, properties: { ...data.properties, tags: [] } };
  });
  await loader.load(state);
  assert.deepEqual([...state.entries.keys()], ['current']);
  assert.deepEqual(state.entries.get('current').data.properties.tags, []);
  await loader.load(state);
  assert.equal(validations, 2);
  state.parseData = async () => { throw new Error('Schema tightened'); };
  await assert.rejects(loader.load(state), /Schema tightened/);
  assert.deepEqual([...state.entries.keys()], ['current']);
});

test('public renderer option feeds Astro, updates the digest, and preserves the snapshot on callback failure', async () => {
  const body = '<collectionItem>\n  <content>\n    <callout>**Important**</callout>\n  </content>\n</collectionItem>';
  const renderers = { callout: ({ markdown }) => `|# insight\n| ${markdown}` };
  const loader = fixtureLoader([{ id: 'current', title: 'Title', properties: {} }], renderers, body);
  const state = context(async ({ data }) => data);
  const renderedBodies = [];
  state.renderMarkdown = async (markdown) => {
    renderedBodies.push(markdown);
    return { html: '<aside>Rendered by consumer</aside>' };
  };
  await loader.load(state);
  const first = state.entries.get('current');
  assert.equal(first.body, '|# insight\n| **Important**');
  assert.equal(first.rendered.html, '<aside>Rendered by consumer</aside>');
  assert.deepEqual(renderedBodies, [first.body]);
  renderers.callout = () => undefined;
  await loader.load(state);
  const second = state.entries.get('current');
  assert.equal(second.body, '<aside data-craft-callout role="note">\n\n**Important**\n\n</aside>');
  assert.notEqual(second.digest, first.digest);
  const failure = new Error('Consumer rendering failed');
  renderers.callout = () => { throw failure; };
  await assert.rejects(loader.load(state), (error) => error === failure);
  assert.equal(state.entries.get('current'), second);
  assert.equal(renderedBodies.length, 2);
});

test('failed validation does not commit a partial snapshot; a successful empty Collection clears stale entries', async () => {
  const loader = fixtureLoader([
    { id: 'first', title: 'Valid', properties: {} },
    { id: 'second', title: 'Invalid', properties: {} },
  ]);
  const state = context(async ({ id, data }) => {
    if (id === 'second') throw new Error('Invalid entry');
    return data;
  });
  await assert.rejects(loader.load(state), /Invalid entry/);
  assert.deepEqual([...state.entries.keys()], ['stale']);
  await fixtureLoader([]).load(state);
  assert.equal(state.entries.size, 0);
});
