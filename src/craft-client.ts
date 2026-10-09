import { checkLimit, limits, type SyncBudget } from './budget.js';
import { requestBytes } from './transport.js';
/** Internal transport configuration; the library does not load environment files. */
interface CraftConnection {
  apiUrl: string;
  apiKey: string;
}

/** Validated transport shape. Property semantics belong to later layers. */
export interface CraftItem {
  id: string;
  title: string;
  properties: Record<string, unknown>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}


/** Structured blocks are read only at the transport boundary. */
export interface CraftBlock {
  id: string;
  type: string;
  markdown?: string;
  url?: string;
  altText?: string;
  textStyle?: string;
  indentationLevel?: number;
  listStyle?: string;
  lineStyle?: string;
  separatorStyle?: string;
  content?: CraftBlock[];
  /** Internal continuation hint; never exposed as consumer metadata. */
  nextCursor?: string;
}

function cursorOf(value: Record<string, unknown>): string | undefined {
  if (value.pagination !== undefined && value.pagination !== null && !isRecord(value.pagination)) throw new Error('Craft returned invalid pagination fields.');
  const pagination = isRecord(value.pagination) ? value.pagination : value;
  const cursor = pagination.nextCursor;
  if (cursor === undefined || cursor === null) return undefined;
  if (typeof cursor !== 'string' || !cursor) throw new Error('Craft returned an invalid pagination cursor.');
  return cursor;
}
function parseBlock(value: unknown, depth = 0, budget?: SyncBudget): CraftBlock {
  budget?.block();
  if (depth > 64) throw new Error('Craft structured blocks exceed the supported nesting depth.');
  if (!isRecord(value) || typeof value.id !== 'string' || !value.id.trim() || value.id === '.' || value.id === '..' || typeof value.type !== 'string' || !value.type.trim()) throw new Error('Craft returned invalid structured blocks.');
  for (const key of ['markdown', 'url', 'altText', 'textStyle', 'listStyle', 'lineStyle', 'separatorStyle']) {
    if (value[key] !== undefined && typeof value[key] !== 'string') throw new Error('Craft returned invalid structured block fields.');
  }
  if (value.indentationLevel !== undefined && (!Number.isInteger(value.indentationLevel) || Number(value.indentationLevel) < 0 || Number(value.indentationLevel) > 5)) throw new Error('Craft returned invalid block indentation.');
  if (value.content !== undefined && !Array.isArray(value.content)) throw new Error('Craft returned invalid block children.');
  const nextCursor = cursorOf(value);
  return { id: value.id, type: value.type,
    ...(value.indentationLevel === undefined ? {} : { indentationLevel: value.indentationLevel as number }),
    ...(value.listStyle === undefined ? {} : { listStyle: value.listStyle as string }),
    ...(nextCursor ? { nextCursor } : {}),
    ...(value.markdown === undefined ? {} : { markdown: value.markdown as string }),
    ...(value.url === undefined ? {} : { url: value.url as string }),
    ...(value.altText === undefined ? {} : { altText: value.altText as string }),
    ...(value.textStyle === undefined ? {} : { textStyle: value.textStyle as string }),
    ...(value.lineStyle === undefined ? {} : { lineStyle: value.lineStyle as string }),
    ...(value.separatorStyle === undefined ? {} : { separatorStyle: value.separatorStyle as string }),
    ...(value.content === undefined ? {} : { content: (value.content as unknown[]).map(child => parseBlock(child, depth + 1, budget)) }),
  };
}

function requireId(id: string): void {
  if (typeof id !== 'string' || !id.trim() || id === '.' || id === '..') {
    throw new Error('Craft item and Collection IDs must be nonempty identifiers.');
  }
}

function connectionUrl(apiUrl: string): URL {
  let base: URL;
  try {
    base = new URL(apiUrl);
  } catch {
    throw new Error('Craft apiUrl must be a valid HTTPS connection URL.');
  }
  // Match the connection used in the recorded probe. Alternate hosts remain
  // an explicit future decision before this becomes a public API commitment.
  if (base.protocol !== 'https:' || base.hostname !== 'connect.craft.do' ||
      base.port || base.username || base.password || base.search || base.hash) {
    throw new Error('Craft apiUrl must be an HTTPS connect.craft.do URL without credentials, a custom port, query, or fragment.');
  }
  base.pathname = base.pathname.replace(/\/+$/, '') + '/';
  return base;
}

function parseItems(value: unknown): CraftItem[] {
  if (!isRecord(value) || !Array.isArray(value.items)) {
    throw new Error('Craft returned an invalid Collection items response: expected an items array.');
  }
  const ids = new Set<string>();
  return value.items.map((item: unknown, index: number) => {
    if (!isRecord(item) || typeof item.id !== 'string' || !item.id.trim() ||
        item.id === '.' || item.id === '..' || typeof item.title !== 'string' ||
        !isRecord(item.properties)) {
      // Include a row index for diagnosis, never remote IDs or field values.
      throw new Error(`Craft returned an invalid Collection item at index ${index}: expected id, title, and a properties object.`);
    }
    if (ids.has(item.id)) {
      throw new Error(`Craft returned a duplicate Collection item ID at index ${index}.`);
    }
    ids.add(item.id);
    return { id: item.id, title: item.title, properties: item.properties };
  });
}

function httpError(status: number, operation: string): Error {
  let hint: string;
  switch (status) {
    case 401: hint = 'Check the API key.'; break;
    case 403: hint = 'Check the connection permissions and document scope.'; break;
    case 404: hint = 'Check the connection URL and the requested Collection or item ID.'; break;
    case 429: hint = 'Craft rate limit reached; retry later.'; break;
    default: hint = 'Check Craft availability and the connection settings.';
  }
  return new Error(`Craft HTTP ${status} while ${operation}. ${hint}`);
}

/**
 * Internal read-only client. An injectable fetch keeps checks credential-free.
 * Neither the client nor its types are exported from the package entry point.
 */
export function createCraftClient(connection: CraftConnection, request: typeof fetch = fetch, budget?: SyncBudget) {
  const base = connectionUrl(connection.apiUrl);
  if (typeof connection.apiKey !== 'string' || !connection.apiKey.trim() ||
      /[\r\n]/.test(connection.apiKey)) {
    throw new Error('Craft apiKey must be a nonempty API key without line breaks.');
  }
  const apiKey = connection.apiKey.trim();

  async function read(path: string, accept: string, operation: string): Promise<string> {
    const bytes = await requestBytes(new URL(path, base), request, {
      init: { method: 'GET', headers: { Accept: accept, Authorization: `Bearer ${apiKey}` } },
      maximum: limits.apiBytes, milliseconds: limits.apiMs,
      ...(budget ? { parent: budget.time } : {}),
      failure: `Craft request failed or timed out while ${operation}; response could not be read.`,
      httpError: status => httpError(status, operation),
    });
    return bytes.toString('utf8');
  }
  let blockCount = 0, continuationCount = 0;
  function continuation() {
    checkLimit(++continuationCount, limits.continuationPages, 'continuation page count');
    budget?.continuation();
  }

  const itemCursors = new Map<string, (string | undefined)[]>();

  async function markdownPage(itemId: string, cursor?: string): Promise<string> {
    const query = new URLSearchParams({ id: itemId, maxDepth: '-1', ...(cursor ? { cursor } : {}) });
    const response = await read(`blocks?${query}`, 'text/markdown', 'reading item Markdown');
    return response;
  }

  async function* iterateItemMarkdownPages(itemId: string): AsyncGenerator<string> {
    requireId(itemId);
    for (const cursor of itemCursors.get(itemId) ?? [undefined]) yield await markdownPage(itemId, cursor);
  }

  return {
    iterateItemMarkdownPages,
    async listCollectionItems(collectionId: string): Promise<CraftItem[]> {
      requireId(collectionId);
      const items: CraftItem[] = [];
      const seen = new Set<string>();
      let cursor: string | undefined;
      do {
        const query = new URLSearchParams({ maxDepth: '0', ...(cursor ? { cursor } : {}) });
        const response = await read(`collections/${encodeURIComponent(collectionId)}/items?${query}`, 'application/json', 'reading Collection items');
        let value: unknown;
        try { value = JSON.parse(response); } catch { throw new Error('Craft Collection items response could not be read as JSON.'); }
        items.push(...parseItems(value));
        checkLimit(items.length, limits.entries, 'Collection entry count');
        cursor = cursorOf(value as Record<string, unknown>);
        if (cursor && seen.has(cursor)) throw new Error('Craft returned a repeated pagination cursor.');
        if (cursor) { seen.add(cursor); continuation(); }
      } while (cursor);
      if (new Set(items.map(item => item.id)).size !== items.length) throw new Error('Craft returned duplicate Collection items across pages.');
      return items;
    },

    async getItemBlocks(itemId: string): Promise<CraftBlock> {
      requireId(itemId);
      const active = new Set<string>();
      async function complete(id: string, depth = 0): Promise<CraftBlock> {
        if (active.has(id) || depth > 64) throw new Error('Craft returned cyclic or excessively nested blocks.');
        active.add(id);
        let root: CraftBlock | undefined;
        let cursor: string | undefined;
        const seen = new Set<string>();
        const cursors: (string | undefined)[] = [];
        do {
          cursors.push(cursor);
          const query = new URLSearchParams({ id, maxDepth: '-1', ...(cursor ? { cursor } : {}) });
          const response = await read(`blocks?${query}`, 'application/json', 'reading structured item blocks');
          let value: unknown;
          try { value = JSON.parse(response); } catch { throw new Error('Craft structured blocks response could not be read as JSON.'); }
          const block = parseBlock(value, 0, budget);
          function count(node: CraftBlock) { checkLimit(++blockCount, limits.blocks, 'structured block count'); for (const child of node.content ?? []) count(child); }
          count(block);
          if (id === itemId && (block.type !== 'collectionItem' || !block.content)) throw new Error('Craft returned an invalid structured item root.');
          if (block.id !== id || (root && root.type !== block.type)) throw new Error('Craft returned inconsistent block pagination.');
          if (!root) root = block;
          else root.content = [...(root.content ?? []), ...(block.content ?? [])];
          cursor = block.nextCursor;
          if (cursor && seen.has(cursor)) throw new Error('Craft returned a repeated block pagination cursor.');
          if (cursor) { seen.add(cursor); continuation(); }
        } while (cursor);
        // maxDepth=-1 already includes descendants. Re-read only an explicitly
        // incomplete subtree; do not redownload every inline nested page.
        async function expand(block: CraftBlock) {
          for (let i = 0; i < (block.content?.length ?? 0); i++) {
            const child = block.content![i]!;
            const isPage = child.type === 'page' || child.type === 'card' || child.textStyle === 'page' || child.textStyle === 'card';
            if (child.nextCursor || (isPage && child.content === undefined)) block.content![i] = await complete(child.id, depth + 1);
            else await expand(child);
          }
        }
        delete root!.nextCursor;
        await expand(root!);
        active.delete(id);
        if (id === itemId) itemCursors.set(itemId, cursors);
        return root!;
      }
      const root = await complete(itemId);
      const ids = new Set<string>();
      function validate(block: CraftBlock) {
        if (ids.has(block.id)) throw new Error('Craft returned duplicate structured block IDs.');
        ids.add(block.id);
        for (const child of block.content ?? []) validate(child);
      }
      validate(root);
      return root;
    },

    async getItemMarkdown(itemId: string): Promise<string> {
      requireId(itemId);
      return markdownPage(itemId);
    },

    /** Match root JSON pagination so a continuation never silently loses prose. */
    async getItemMarkdownPages(itemId: string): Promise<string[]> {
      requireId(itemId);
      const pages: string[] = [];
      for await (const page of iterateItemMarkdownPages(itemId)) pages.push(page);
      return pages;
    },
  };
}
