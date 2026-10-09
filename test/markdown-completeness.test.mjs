import assert from 'node:assert/strict';
import test from 'node:test';
import { craftCollection } from '../dist/index.js';

const connection = { apiUrl: 'https://connect.craft.do/synthetic', apiKey: 'synthetic', collectionId: 'collection' };
const wrap = body => `<collectionItem>\n  <content>\n${body.split('\n').map(line => `    ${line}`).join('\n')}\n  </content>\n</collectionItem>`;
const text = (id, markdown) => ({ id, type: 'text', markdown });
const emptyBodies = ['', '<collectionItem>\n  <title>Metadata only</title>\n</collectionItem>', wrap('')];

function fixture(pages, renderers = {}) {
  const original = globalThis.fetch;
  const requests = [];
  globalThis.fetch = async (url, init) => {
    if (url.pathname.endsWith('/items')) return Response.json({ items: [{ id: 'item', title: 'Synthetic', properties: {} }] });
    const cursor = url.searchParams.get('cursor');
    const index = cursor === null ? 0 : Number(cursor.slice('root-'.length));
    requests.push([cursor, init.headers.Accept]);
    const page = pages[index];
    if (init.headers.Accept === 'text/markdown') return new Response(page.markdown);
    if (url.searchParams.get('id') === 'nested') return Response.json({ id: 'nested', type: 'page', content: [text('nested-text', 'Nested prose')] });
    return Response.json({ id: 'item', type: 'collectionItem', content: page.content, ...(index + 1 < pages.length ? { nextCursor: `root-${index + 1}` } : {}) });
  };
  try { return { loader: craftCollection({ ...connection, renderers }), requests }; }
  finally { globalThis.fetch = original; }
}

function state() {
  const previous = { id: 'previous', body: 'Previously complete' };
  const entries = new Map([['previous', previous]]);
  const calls = [];
  return {
    entries, previous, calls,
    parseData: async ({ data }) => { calls.push('parse'); return data; },
    renderMarkdown: async body => { calls.push('render'); return { html: body }; },
    generateDigest: JSON.stringify,
    store: { entries: () => [...entries], clear: () => { calls.push('clear'); entries.clear(); }, set: entry => { calls.push('set'); entries.set(entry.id, entry); } },
    logger: { info() {} },
  };
}

for (const blankIndex of [0, 1]) {
  for (const [variant, empty] of emptyBodies.entries()) {
    test(`rejects empty/metadata-only root page ${blankIndex + 1}, variant ${variant}, before callbacks or store changes`, async () => {
      const callbacks = [];
      const pages = [0, 1].map(index => ({ content: [text(`text-${index}`, `Required prose ${index}`)], markdown: index === blankIndex ? empty : wrap('<callout>Required prose</callout>') }));
      const { loader } = fixture(pages, { callout: () => { callbacks.push('callout'); return ''; } });
      const context = state();
      await assert.rejects(loader.load(context), /empty|incomplete/);
      assert.deepEqual([...context.entries.keys()], ['previous']);
      assert.equal(context.entries.get('previous'), context.previous);
      assert.deepEqual(callbacks, []);
      assert.deepEqual(context.calls, []);
    });
  }
}

test('accepts genuinely empty first/later structured pages and an entirely empty item', async () => {
  for (const emptyIndex of [0, 1, 'all']) {
    for (const empty of emptyBodies) {
      const pages = [0, 1].map(index => ({ content: emptyIndex === 'all' || emptyIndex === index ? [] : [text('real', 'Real prose')], markdown: emptyIndex === 'all' || emptyIndex === index ? empty : wrap('Real prose') }));
      const { loader, requests } = fixture(pages);
      const context = state();
      await loader.load(context);
      assert.equal(context.entries.get('item').body.trim(), emptyIndex === 'all' ? '' : 'Real prose');
      assert.deepEqual(requests.filter(([, format]) => format === 'text/markdown').map(([cursor]) => cursor), [null, 'root-1']);
    }
  }
});

test('expanded nested content belongs to its root cursor, including an initially empty page shell', async () => {
  const { loader } = fixture([
    { content: [], markdown: '' },
    { content: [{ id: 'nested', type: 'page' }], markdown: emptyBodies[1] },
  ]);
  const context = state();
  await assert.rejects(loader.load(context), /empty|incomplete/);
  assert.deepEqual([...context.entries.keys()], ['previous']);
  assert.deepEqual(context.calls, []);
});

test('valid pages invoke each consumer renderer once and may intentionally omit all output', async () => {
  const callbacks = [];
  const { loader } = fixture([0, 1].map(index => ({ content: [text(`text-${index}`, 'Prose')], markdown: wrap(`<callout>Prose ${index}</callout>`) })), { callout: block => { callbacks.push(block.markdown); return ''; } });
  const context = state();
  await loader.load(context);
  assert.deepEqual(callbacks, ['Prose 0', 'Prose 1']);
  assert.equal(context.entries.get('item').body.trim(), '');
  assert.deepEqual(context.calls, ['parse', 'render', 'clear', 'set']);
});

// The normalizer removes metadata, so this detects a source budget independently
// of the final output budget and proves that it accumulates across items.
test('retained source bytes are capped across the whole sync, including metadata-only exports', async () => {
  const original = globalThis.fetch;
  const body = `<collectionItem>\n  <title>${'x'.repeat(7 * 1024 * 1024)}</title>\n</collectionItem>`;
  globalThis.fetch = async (url, init) => {
    if (url.pathname.endsWith('/items')) return Response.json({ items: [0, 1, 2, 3, 4].map(index => ({ id: `item-${index}`, title: 'Synthetic', properties: {} })) });
    return init.headers.Accept === 'application/json'
      ? Response.json({ id: url.searchParams.get('id'), type: 'collectionItem', content: [] }) : new Response(body);
  };
  let loader;
  try { loader = craftCollection(connection); } finally { globalThis.fetch = original; }
  const context = state();
  await assert.rejects(loader.load(context), /source Markdown size exceeds/);
  assert.deepEqual([...context.entries.keys()], ['previous']);
  assert.ok(!context.calls.includes('clear'));
});
