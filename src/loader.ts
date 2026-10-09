import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { relative } from 'node:path';
import { registerImageRendering } from './asset-rendering.js';
import { localizeImages } from './images.js';
import type { Loader } from 'astro/loaders';
import { createCraftClient } from './craft-client.js';
import { collectNativeLines, normalizeItemMarkdown, type CraftRenderers } from './normalize.js';

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
  const request = fetch;
  const client = createCraftClient(options, request);
  return {
    name: 'astro-loader-craft-do',
    async load({ config, parseData, renderMarkdown, store, generateDigest, logger }) {
      const items = await client.listCollectionItems(options.collectionId);
      // Prepare the complete next snapshot before replacing the current store.
      // Sequential reads keep the small initial sample from bursting requests.
      const entries = [];
      for (const item of items) {
        const blocks = await client.getItemBlocks(item.id);
        const cache = new URL('craft-images/', config?.cacheDir ?? new URL('./node_modules/.astro/', import.meta.url));
        const fileURL = new URL(`${createHash('sha256').update(item.id).digest('hex')}.md`, cache);
        const absolutePath = fileURLToPath(fileURL);
        const filePath = config ? relative(fileURLToPath(config.root), absolutePath).replaceAll('\\', '/') : absolutePath;
        const native = await localizeImages(blocks, cache, request);
        const data = await parseData({
          id: item.id, filePath: absolutePath,
          data: { title: item.title, properties: item.properties, images: native.map(({ image }) => image) },
        });
        const markdownPages = await client.getItemMarkdownPages(item.id);
        const lines = options.renderers?.line ? collectNativeLines(blocks) : [];
        const body = markdownPages.map(page => normalizeItemMarkdown(page, options.renderers, native, lines)).join('\n\n');
        if (lines.some(line => !line.used)) throw new Error('Craft native separators do not match complete item Markdown.');
        if (native.some(image => !image.used)) throw new Error('Craft native images do not match complete item Markdown.');
        const rendered = registerImageRendering(await renderMarkdown(body, { fileURL }), native.map(({ image }) => image));
        entries.push({ id: item.id, data, body, rendered, filePath, assetImports: rendered.metadata?.imagePaths ?? [], digest: generateDigest({ data, body }) });
      }
      store.clear();
      for (const entry of entries) store.set(entry);
      logger.info(`Loaded ${entries.length} Craft Collection entries.`);
    },
  };
}
