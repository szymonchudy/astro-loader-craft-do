import type { Loader } from 'astro/loaders';
import { createCraftClient } from './craft-client.js';
import { normalizeItemMarkdown, type CraftRenderers } from './normalize.js';

/** Connection settings supplied by the Astro application at build time. */
export interface CraftCollectionOptions {
  /** The selected-documents API connection URL from Craft. */
  apiUrl: string;
  /** API key for that connection. Keep it server/build-side. */
  apiKey: string;
  /** The Collection's stable Craft ID. */
  collectionId: string;
  /** Experimental consumer overrides. Omit to use the default block rendering. */
  renderers?: CraftRenderers;
}

/** Experimental build-time Collection loader. Provide validation through Astro's schema. */
export function craftCollection(options: CraftCollectionOptions): Loader {
  const client = createCraftClient(options);
  return {
    name: 'astro-loader-craft-do',
    async load({ parseData, renderMarkdown, store, generateDigest, logger }) {
      const items = await client.listCollectionItems(options.collectionId);
      // Prepare the complete next snapshot before replacing the current store.
      // Sequential reads keep the small initial sample from bursting requests.
      const entries = [];
      for (const item of items) {
        const data = await parseData({
          id: item.id,
          data: { title: item.title, properties: item.properties },
        });
        const body = normalizeItemMarkdown(await client.getItemMarkdown(item.id), options.renderers);
        const rendered = await renderMarkdown(body);
        entries.push({ id: item.id, data, body, rendered, digest: generateDigest({ data, body }) });
      }
      store.clear();
      for (const entry of entries) store.set(entry);
      logger.info(`Loaded ${entries.length} Craft Collection entries.`);
    },
  };
}
