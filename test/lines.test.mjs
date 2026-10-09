import assert from 'node:assert/strict';
import test from 'node:test';
import { craftCollection } from '../dist/index.js';
import { collectNativeLines, normalizeItemMarkdown } from '../dist/normalize.js';

const wrap = body => `<collectionItem>\n  <content>\n${body.split('\n').map(line => `    ${line}`).join('\n')}\n  </content>\n</collectionItem>`;
const line = (id, markdown = '*****', metadata = {}) => ({ id, type: 'line', markdown, ...metadata });
const bindings = (...content) => collectNativeLines({ id: 'item', type: 'collectionItem', content });

test('separators are opt-in and default output preserves consecutive rules exactly', () => {
  const body = 'Before\n\n*****\n*****\n\n---\n\n___\n\n===';
  assert.equal(normalizeItemMarkdown(wrap(body)), body);
  // Invalid separator payloads are irrelevant when no line callback is configured.
  assert.equal(normalizeItemMarkdown(wrap(body), {}, [], [{ block: {}, used: false }]), body);
});

test('line callback receives native metadata in document order, including repeated markers and nested containers', () => {
  const content = bindings(
    line('first', '*****', { lineStyle: 'light', separatorStyle: 'doodle' }),
    { id: 'page', type: 'page', content: [line('nested', '*****', { lineStyle: 'strong' })] },
    line('last', '*****', { separatorStyle: 'line' }),
  );
  const seen = [];
  const source = '*****\n\n<page>\n  <pageTitle>Nested</pageTitle>\n  <content>\n    <callout>*****</callout>\n  </content>\n</page>\n\n+ Details\n  *****';
  const html = normalizeItemMarkdown(wrap(source), { line: block => {
    seen.push(block);
    return `<hr data-native="${block.blockId}">`;
  } }, [], content);
  assert.deepEqual(seen, content.map(binding => binding.block));
  assert.deepEqual(seen.map(block => block.blockId), ['first', 'nested', 'last']);
  assert.match(html, /<aside[^>]*>\s*<hr data-native="nested">\s*<\/aside>/);
  assert.match(html, /<details>[\s\S]*<hr data-native="last">/);
  assert.ok(content.every(binding => binding.used));
});

test('line callbacks share fallback, omission, invalid-return and single-insertion behavior', () => {
  const normalize = renderer => normalizeItemMarkdown(wrap('*****'), { line: renderer }, [], bindings(line('one')));
  assert.equal(normalize(() => undefined), '*****');
  assert.equal(normalize(() => ''), '');
  assert.equal(normalize(() => '*****'), '*****');
  assert.equal(normalize(() => '<callout>Consumer output</callout>'), '<callout>Consumer output</callout>');
  for (const value of [null, 42, {}, Promise.resolve('async')]) assert.throws(() => normalize(() => value), /line renderer must return/);
});

test('fences, indented code, comments, raw HTML, inline code spans and heading underlines never consume native lines', () => {
  const examples = [
    '```md\n*****\n```', '~~~md\n---\n~~~', '    *****',
    '<!--\n*****\n-->', '<pre>\n*****\n</pre>', '<script>\n*****\n</script>',
    '<style>\n*****\n</style>', '<textarea>\n*****\n</textarea>', '<code>\n*****\n</code>',
    '<div>\n*****\n</div>', '<div>Literal HTML</div>\n*****', '<hr>', 'Use `literal\n*****\nend` here.',
    '<?processing\n\n*****\n?>', '<![CDATA[\n\n*****\n]]>', '<!DECLARATION\n*****\n>',
    'Heading\n---', 'Heading\n===', 'Two-line\nheading\n-----',
  ];
  for (const example of examples) {
    const source = `${example}\n\n*****`;
    const seen = [];
    const result = normalizeItemMarkdown(wrap(source), { line: block => { seen.push(block.blockId); return '<hr>'; } }, [], bindings(line('real')));
    assert.deepEqual(seen, ['real'], example);
    assert.ok(result.startsWith(example), example);
  }
});

test('native page breaks render only as matched blocks and mismatches fail without exposing data', () => {
  assert.equal(normalizeItemMarkdown(wrap('==='), { line: () => '<hr class="page-break">' }, [], bindings(line('break', '===', { lineStyle: 'pageBreak' }))), '<hr class="page-break">');
  for (const native of [[], bindings(line('private-id', '---'))]) {
    assert.throws(() => normalizeItemMarkdown(wrap('*****'), { line: () => '<hr>' }, [], native), error => {
      assert.doesNotMatch(error.message, /private-id/);
      return /native separators do not match/.test(error.message);
    });
  }
  assert.throws(() => bindings({ id: 'private-id', type: 'line' }), /missing its Markdown/);
});

test('loader shares bindings across pagination, updates style-only digests and retains its snapshot on failures', async () => {
  let style = 'light';
  let missing = false;
  const seen = [];
  const renderers = { line: block => { seen.push(block); return `<hr data-style="${block.lineStyle}">`; } };
  const saved = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    if (url.pathname.endsWith('/items')) return Response.json({ items: [{ id: 'item', title: 'Synthetic', properties: {} }] });
    if (init.headers.Accept !== 'application/json') return new Response(wrap(missing ? 'Body without the rule.' : '*****'));
    const second = url.searchParams.has('cursor');
    return Response.json({ id: 'item', type: 'collectionItem', content: [line(second ? 'second' : 'first', '*****', { lineStyle: second ? 'strong' : style, separatorStyle: 'doodle' })], ...(second ? {} : { nextCursor: 'second-page' }) });
  };
  let loader;
  try { loader = craftCollection({ apiUrl: 'https://connect.craft.do/link/synthetic/api/v1', apiKey: 'synthetic', collectionId: 'synthetic', renderers }); }
  finally { globalThis.fetch = saved; }
  const entries = new Map();
  const context = {
    parseData: async ({ data }) => data,
    renderMarkdown: async body => ({ html: body }),
    generateDigest: value => JSON.stringify(value),
    store: { entries: () => [...entries], clear: () => entries.clear(), set: entry => entries.set(entry.id, entry) },
    logger: { info() {} },
  };
  await loader.load(context);
  assert.deepEqual(seen.map(block => [block.blockId, block.lineStyle, block.separatorStyle]), [['first', 'light', 'doodle'], ['second', 'strong', 'doodle']]);
  const first = entries.get('item');
  style = 'regular';
  await loader.load(context);
  const second = entries.get('item');
  assert.notEqual(first.digest, second.digest);
  assert.match(second.rendered.html, /data-style="regular"/);
  missing = true;
  await assert.rejects(loader.load(context), /native separators do not match/);
  assert.equal(entries.get('item'), second);
  missing = false;
  renderers.line = () => { throw new Error('Consumer divider failure'); };
  await assert.rejects(loader.load(context), /Consumer divider failure/);
  assert.equal(entries.get('item'), second);
});
