import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { createCraftClient } from '../dist/craft-client.js';

const connection = {
  apiUrl: 'https://connect.craft.do/link/synthetic-connection/api/v1',
  apiKey: 'synthetic-key',
};
const fixture = JSON.parse(readFileSync(new URL('./fixtures/collection-items.json', import.meta.url), 'utf8'));
const markdown = readFileSync(new URL('./fixtures/collection-item.md', import.meta.url), 'utf8');

test('reads items and raw Markdown using GET, authentication, and the connection base path', async () => {
  const calls = [];
  const client = createCraftClient(connection, async (url, options) => {
    calls.push({ url, options });
    return calls.length === 1 ? Response.json(fixture) : new Response(markdown);
  });
  assert.deepEqual(await client.listCollectionItems('collection /?#'), fixture.items);
  assert.equal(await client.getItemMarkdown('item /?#'), markdown);
  assert.equal(calls[0].url.pathname, '/link/synthetic-connection/api/v1/collections/collection%20%2F%3F%23/items');
  assert.equal(calls[0].url.searchParams.get('maxDepth'), '0');
  assert.equal(calls[1].url.pathname, '/link/synthetic-connection/api/v1/blocks');
  assert.equal(calls[1].url.searchParams.get('id'), 'item /?#');
  assert.equal(calls[1].url.searchParams.get('maxDepth'), '-1');
  for (const { options } of calls) {
    assert.equal(options.method, 'GET');
    assert.equal(options.redirect, 'error');
    assert.equal(options.headers.Authorization, 'Bearer synthetic-key');
    assert.ok(options.signal instanceof AbortSignal);
  }
  assert.equal(calls[0].options.headers.Accept, 'application/json');
  assert.equal(calls[1].options.headers.Accept, 'text/markdown');
});

test('base URL trailing slash does not change endpoint resolution', async () => {
  const client = createCraftClient({ ...connection, apiUrl: `${connection.apiUrl}/` }, async (url) => {
    assert.equal(url.pathname, '/link/synthetic-connection/api/v1/collections/collection/items');
    return Response.json({ items: [] });
  });
  assert.deepEqual(await client.listCollectionItems('collection'), []);
});

test('preserves empty Markdown for the normalization layer', async () => {
  const client = createCraftClient(connection, async () => new Response(''));
  assert.equal(await client.getItemMarkdown('item'), '');
});

test('rejects invalid configuration and IDs before any request', async () => {
  let requests = 0;
  const request = async () => { requests++; return Response.json({ items: [] }); };
  for (const apiUrl of [
    'invalid', 'http://connect.craft.do/link/example', 'https://example.com/',
    'https://connect.craft.do.evil.example/', 'https://secret@connect.craft.do/',
    `${connection.apiUrl}?secret=value`, `${connection.apiUrl}#secret`,
    'https://connect.craft.do:8443/link/example',
  ]) {
    assert.throws(() => createCraftClient({ ...connection, apiUrl }, request), /Craft apiUrl/);
  }
  for (const apiKey of ['', '  ', 'secret\nvalue']) {
    assert.throws(() => createCraftClient({ ...connection, apiKey }, request), /Craft apiKey/);
  }
  const client = createCraftClient(connection, request);
  for (const id of ['', ' ', '.', '..']) {
    await assert.rejects(client.listCollectionItems(id), /nonempty identifiers/);
    await assert.rejects(client.getItemMarkdown(id), /nonempty identifiers/);
  }
  assert.equal(requests, 0);
});

test('rejects malformed envelopes and rows instead of skipping bad entries', async () => {
  for (const value of [
    null, [], { data: fixture.items }, { items: null },
    { items: [null] },
    { items: [{ id: '', title: 'title', properties: {} }] },
    { items: [{ id: 'id', title: 42, properties: {} }] },
    { items: [{ id: 'id', title: 'title', properties: [] }] },
    { items: [{ id: 'id', title: 'title' }] },
    { items: [fixture.items[0], null] },
  ]) {
    const client = createCraftClient(connection, async () => Response.json(value));
    await assert.rejects(client.listCollectionItems('collection'), /invalid Collection/);
  }
});

test('rejects duplicate IDs before they could overwrite Astro entries', async () => {
  const client = createCraftClient(connection, async () => Response.json({ items: [fixture.items[0], fixture.items[0]] }));
  await assert.rejects(client.listCollectionItems('collection'), /duplicate Collection item ID/);
});

test('HTTP failures give useful hints and never expose upstream bodies or response URLs', async () => {
  for (const [status, hint] of [[401, /API key/], [403, /permissions/], [404, /requested Collection/], [429, /rate limit/], [500, /availability/]]) {
    const client = createCraftClient(connection, async () => new Response('sensitive upstream content', { status }));
    for (const operation of [() => client.listCollectionItems('private-collection'), () => client.getItemMarkdown('private-item')]) {
      await assert.rejects(operation, (error) => {
        assert.match(error.message, new RegExp(`HTTP ${status}`));
        assert.match(error.message, hint);
        assert.doesNotMatch(error.message, /sensitive|synthetic-key|synthetic-connection|private-collection|private-item/);
        assert.equal(error.cause, undefined);
        return true;
      });
    }
  }
});

test('network and timeout failures discard exception messages and causes', async () => {
  for (const failure of [
    new Error(`${connection.apiUrl} ${connection.apiKey}`, { cause: new Error('private body') }),
    new DOMException('private timeout details', 'TimeoutError'),
  ]) {
    const client = createCraftClient(connection, async () => { throw failure; });
    for (const operation of [() => client.listCollectionItems('collection'), () => client.getItemMarkdown('item')]) {
      await assert.rejects(operation, (error) => {
        assert.match(error.message, /failed or timed out/);
        assert.doesNotMatch(error.message, /synthetic-key|synthetic-connection|private/);
        assert.equal(error.cause, undefined);
        return true;
      });
    }
  }
});

test('invalid JSON is reported without exposing the response content', async () => {
  const client = createCraftClient(connection, async () => new Response('private invalid JSON'));
  await assert.rejects(client.listCollectionItems('collection'), (error) => {
    assert.match(error.message, /could not be read as JSON/);
    assert.doesNotMatch(error.message, /private/);
    return true;
  });
});

test('response stream failures are sanitized for both formats', async () => {
  function brokenResponse() {
    return new Response(new ReadableStream({
      start(controller) { controller.error(new Error('private response details')); },
    }));
  }
  const client = createCraftClient(connection, async () => brokenResponse());
  await assert.rejects(client.listCollectionItems('collection'), /could not be read as JSON/);
  await assert.rejects(client.getItemMarkdown('item'), /Markdown response could not be read/);
});
