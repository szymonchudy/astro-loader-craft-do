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
export function createCraftClient(connection: CraftConnection, request: typeof fetch = fetch) {
  const base = connectionUrl(connection.apiUrl);
  if (typeof connection.apiKey !== 'string' || !connection.apiKey.trim() ||
      /[\r\n]/.test(connection.apiKey)) {
    throw new Error('Craft apiKey must be a nonempty API key without line breaks.');
  }
  const apiKey = connection.apiKey.trim();

  async function read(path: string, accept: string, operation: string): Promise<Response> {
    let response: Response;
    try {
      response = await request(new URL(path, base), {
        method: 'GET',
        redirect: 'error',
        signal: AbortSignal.timeout(20_000),
        headers: { Accept: accept, Authorization: `Bearer ${apiKey}` },
      });
    } catch {
      // Upstream exception messages/causes can contain URLs or credentials.
      throw new Error(`Craft request failed or timed out while ${operation}. Check network access and connection settings.`);
    }
    if (!response.ok) {
      // Do not read or include the error body; even cancellation can reject.
      try { await response.body?.cancel(); } catch { /* Preserve the safe HTTP error. */ }
      throw httpError(response.status, operation);
    }
    return response;
  }

  return {
    async listCollectionItems(collectionId: string): Promise<CraftItem[]> {
      requireId(collectionId);
      const path = `collections/${encodeURIComponent(collectionId)}/items?maxDepth=0`;
      const response = await read(path, 'application/json', 'reading Collection items');
      let value: unknown;
      try {
        value = await response.json();
      } catch {
        throw new Error('Craft Collection items response could not be read as JSON.');
      }
      return parseItems(value);
    },

    async getItemMarkdown(itemId: string): Promise<string> {
      requireId(itemId);
      const query = new URLSearchParams({ id: itemId, maxDepth: '-1' });
      const response = await read(`blocks?${query}`, 'text/markdown', 'reading item Markdown');
      try {
        // Preserve wrappers and whitespace for the normalization slice.
        return await response.text();
      } catch {
        throw new Error('Craft item Markdown response could not be read.');
      }
    },
  };
}
