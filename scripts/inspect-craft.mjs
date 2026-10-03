// Read-only development probe. Run: node --env-file=.env.local scripts/inspect-craft.mjs
// Add --structure for tag names and indentation (no body text).
// Never print credentials, response bodies, item IDs, media URLs, or exception messages.
const env = process.env;

function report(label, value) {
  console.log(JSON.stringify({ check: label, ...value }));
}

function shape(value, depth = 0) {
  if (value === null) return 'null';
  if (Array.isArray(value)) {
    return { type: 'array', count: value.length, first: value.length ? shape(value[0], depth + 1) : undefined };
  }
  if (typeof value !== 'object') return typeof value;
  if (depth >= 4) return { keys: Object.keys(value) };
  return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, shape(child, depth + 1)]));
}

try {
  for (const key of ['CRAFT_API_URL', 'CRAFT_API_KEY', 'CRAFT_COLLECTION_ID']) {
    if (!env[key]?.trim()) throw new Error('Missing configuration');
  }
  const base = new URL(env.CRAFT_API_URL.trim());
  if (base.protocol !== 'https:' || base.hostname !== 'connect.craft.do' || base.username || base.password || base.search || base.hash) {
    throw new Error('Invalid connection URL');
  }
  base.pathname = base.pathname.replace(/\/$/, '') + '/';
  const collection = encodeURIComponent(env.CRAFT_COLLECTION_ID.trim());

  async function request(label, path, accept = 'application/json', authenticated = true) {
    const response = await fetch(new URL(path, base), {
      method: 'GET',
      redirect: 'error',
      signal: AbortSignal.timeout(20000),
      headers: {
        Accept: accept,
        ...(authenticated ? { Authorization: `Bearer ${env.CRAFT_API_KEY.trim()}` } : {}),
      },
    });
    report(label, { status: response.status, contentType: response.headers.get('content-type') });
    if (!authenticated) {
      await response.body?.cancel();
      return;
    }
    if (!response.ok) {
      await response.body?.cancel();
      throw new Error('Request rejected');
    }
    return accept === 'text/markdown' ? response.text() : response.json();
  }

  await request('unauthenticated schema access', `collections/${collection}/schema?format=schema`, 'application/json', false);
  const schema = await request('schema', `collections/${collection}/schema?format=schema`);
  report('schema shape', { shape: shape(schema) });
  // Only show the sample's field definitions, never its content or connection metadata.
  const definition = schema.schema ?? schema;
  const fields = definition.properties ?? definition.columns;
  if (Array.isArray(fields)) {
    report('field definitions', { fields: fields.map(({ key, name, type }) => ({ key, name, type })) });
  }
  const itemsResponse = await request('items', `collections/${collection}/items?maxDepth=0`);
  report('items shape', { shape: shape(itemsResponse) });
  const items = Array.isArray(itemsResponse) ? itemsResponse : itemsResponse.items ?? itemsResponse.data;
  if (!Array.isArray(items)) throw new Error('Unexpected items envelope');
  report('items summary', {
    count: items.length,
    entries: items.slice(0, 3).map((item, index) => ({
      index,
      hasTitle: typeof item.title === 'string' && item.title.length > 0,
      hasId: typeof item.id === 'string' && item.id.length > 0,
      properties: shape(item.properties),
    })),
  });
  for (const [index, item] of items.slice(0, 3).entries()) {
    if (typeof item.id !== 'string') throw new Error('Missing item ID');
    const path = `blocks?id=${encodeURIComponent(item.id)}&maxDepth=-1`;
    const blocks = await request(`item ${index} blocks`, path);
    report(`item ${index} block shape`, { shape: shape(blocks) });
    const markdown = await request(`item ${index} markdown`, path, 'text/markdown');
    report(`item ${index} markdown features`, {
      length: markdown.length,
      empty: !markdown.trim(),
      startsWithTitleHeading: typeof item.title === 'string' && markdown.trimStart().startsWith(`# ${item.title}`),
      headings: [...markdown.matchAll(/^#{1,6} /gm)].length,
      codeFences: [...markdown.matchAll(/^```/gm)].length,
      images: [...markdown.matchAll(/!\[/g)].length,
      blockLinks: [...markdown.matchAll(/block:\/\//g)].length,
      webEditorLinks: [...markdown.matchAll(/https:\/\/docs\.craft\.do\//g)].length,
      callouts: markdown.includes('<callout'),
      highlights: markdown.includes('<highlight'),
      nestedPages: markdown.includes('<page') || markdown.includes('<card'),
      previewTags: /<(?:contentPreview|itemsPreview)>/.test(markdown),
      structuralLines: process.argv.includes('--structure') ? markdown.split('\n').map((line) => ({
        indent: line.match(/^ */)[0].length,
        tags: [...line.matchAll(/<\/?([a-zA-Z][\w-]*)\b[^>]*>/g)].map(([tag, name]) => `${tag.startsWith('</') ? '/' : ''}${name}`),
        heading: /^\s*#{1,6} /.test(line),
        codeFence: /^\s*```/.test(line),
        blank: !line.trim(),
      })) : undefined,
    });
  }
} catch (error) {
  // The original message/cause can include a secret URL or upstream content.
  const code = error?.cause?.code;
  report('probe failed', {
    networkCode: ['ENOTFOUND', 'EAI_AGAIN', 'ECONNREFUSED', 'ETIMEDOUT'].includes(code) ? code : undefined,
    message: 'Inspect the preceding status/shape checks. Credentials and upstream errors were suppressed.',
  });
  process.exitCode = 1;
}
