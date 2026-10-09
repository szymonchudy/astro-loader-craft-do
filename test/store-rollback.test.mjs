import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { MutableDataStore } from '../node_modules/astro/dist/content/mutable-data-store.js';
import { craftCollection } from '../dist/index.js';

function loader(items) {
  const original = globalThis.fetch;
  globalThis.fetch = async (url, init) => url.pathname.endsWith('/items') ? Response.json({ items })
    : init.headers.Accept === 'application/json' ? Response.json({ id: url.searchParams.get('id'), type: 'collectionItem', content: [] }) : new Response('');
  try { return craftCollection({ apiUrl: 'https://connect.craft.do/synthetic', apiKey: 'synthetic', collectionId: 'collection' }); }
  finally { globalThis.fetch = original; }
}
const items = [0, 1].map(index => ({ id: `next-${index}`, title: 'Synthetic', properties: {} }));
const context = store => ({
  config: { root: new URL('file:///tmp/synthetic-site/'), cacheDir: new URL('file:///tmp/synthetic-site/.astro/') },
  store, parseData: async ({ data }) => data, renderMarkdown: async () => ({ html: '' }), generateDigest: JSON.stringify, logger: { info() {} },
});

for (const failureAt of ['first', 'second', 'clear', 'log']) {
  test(`restores every previous entry after ${failureAt} commit failure`, async () => {
    const previous = [{ id: 'old-1', data: { value: 1 }, body: 'Old body' }, { id: 'old-2', data: { value: 2 }, digest: 'old' }];
    const entries = new Map(previous.map(entry => [entry.id, entry]));
    const failure = new Error('Synthetic commit failure');
    let failed = false;
    const store = {
      entries: () => [...entries],
      clear() { entries.clear(); if (failureAt === 'clear' && !failed) { failed = true; throw failure; } },
      set(entry) {
        // Fail after mutation too: callers cannot assume a throwing write did nothing.
        entries.set(entry.id, entry);
        if (!failed && (failureAt === 'first' && entry.id === 'next-0' || failureAt === 'second' && entry.id === 'next-1')) { failed = true; throw failure; }
      },
    };
    const state = context(store);
    if (failureAt === 'log') state.logger.info = () => { throw failure; };
    await assert.rejects(loader(items).load(state), error => error === failure);
    assert.deepEqual([...entries.values()], previous);
  });
}

test('real Astro set traversal failure restores old entries, image field paths and asset/module imports', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'craft-rollback-'));
  const mutable = new MutableDataStore();
  const store = mutable.scopedStore('synthetic');
  try {
    store.set({ id: 'old-image', data: { thumbnail: '__ASTRO_IMAGE_./old.png', nested: [{ image: '__ASTRO_IMAGE_./nested.webp' }] }, filePath: 'src/old.md', body: 'Old body', digest: 'old-digest', rendered: { html: '<p>Old body</p>', metadata: { imagePaths: ['./old.png'], headings: [] } } });
    store.set({ id: 'old-module', data: { title: 'Old module' }, deferredRender: true, filePath: 'src/old.astro' });
    const previous = structuredClone(store.entries());
    const assetsPath = join(directory, 'assets.mjs');
    const modulesPath = join(directory, 'modules.mjs');
    await mutable.writeAssetImports(assetsPath);
    await mutable.writeModuleImports(modulesPath);
    const assets = await readFile(assetsPath, 'utf8');
    const modules = await readFile(modulesPath, 'utf8');
    const deep = {};
    let tail = deep;
    for (let depth = 0; depth < 2000; depth++) tail = tail.n = {};
    const state = context(store);
    state.parseData = async ({ id, data }) => ({ ...data, thumbnail: id === 'next-0' ? '__ASTRO_IMAGE_./new.png' : undefined });
    await assert.rejects(loader([items[0], { ...items[1], properties: deep }]).load(state), /call stack|recursion/i);
    assert.deepEqual(store.entries(), previous);
    await mutable.writeAssetImports(assetsPath);
    await mutable.writeModuleImports(modulesPath);
    assert.equal(await readFile(assetsPath, 'utf8'), assets);
    assert.equal(await readFile(modulesPath, 'utf8'), modules);
    assert.deepEqual(store.get('old-image').imageImports, [['thumbnail'], ['nested', 0, 'image']]);
  } finally {
    await mutable.waitUntilSaveComplete();
    await rm(directory, { recursive: true, force: true });
  }
});

test('reports rollback failure explicitly when the store also rejects restoration', async () => {
  const entries = new Map([['old', { id: 'old', data: { title: 'Old' } }]]);
  const store = { entries: () => [...entries], clear: () => entries.clear(), set() { throw new Error('Persistent store failure'); } };
  await assert.rejects(loader(items).load(context(store)), /previous.*could not be restored/i);
});
