import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { relative } from 'node:path';
import { registerImageRendering } from './asset-rendering.js';
import { localizeImages } from './images.js';
import type { Loader } from 'astro/loaders';
import { checkLimit, createSyncBudget, limits } from './budget.js';
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
  createCraftClient(options, request); // Validate configuration immediately.
  return {
    name: 'astro-loader-craft-do',
    async load({ config, parseData, renderMarkdown, store, generateDigest, logger }) {
      const budget = createSyncBudget();
      try {
        const client = createCraftClient(options, request, budget);
        const items = await client.listCollectionItems(options.collectionId);
        // Prepare the complete next snapshot before replacing the current store.
        // Sequential reads keep the small initial sample from bursting requests.
        const entries = [];
        let sourceBytes = 0;
        for (const item of items) {
          const blocks = await client.getItemBlocks(item.id);
          const cache = new URL('craft-images/', config?.cacheDir ?? new URL('./node_modules/.astro/', import.meta.url));
          const fileURL = new URL(`${createHash('sha256').update(item.id).digest('hex')}.md`, cache);
          const absolutePath = fileURLToPath(fileURL);
          const filePath = config ? relative(fileURLToPath(config.root), absolutePath).replaceAll('\\', '/') : absolutePath;
          // Validate all source pages before any consumer callback. Retained
          // source and final callback output have separate bounded byte totals.
          const sources: string[] = [];
          for await (const page of client.iterateItemMarkdownSources(item.id)) {
            budget.time.check();
            sourceBytes += Buffer.byteLength(page.markdown);
            checkLimit(sourceBytes, limits.markdownBytes, 'source Markdown size');
            const source = normalizeItemMarkdown(page.markdown);
            if (page.hasStructuredContent && !source.trim()) {
              throw new Error('Craft returned empty or incomplete item Markdown for structured content.');
            }
            sources.push(page.markdown);
          }
          const native = await localizeImages(blocks, cache, request, budget.time);
          const data = await budget.time.wait(parseData({
            id: item.id, filePath: absolutePath,
            data: { title: item.title, properties: item.properties, images: native.map(({ image }) => image) },
          }));
          const lines = options.renderers?.line ? collectNativeLines(blocks) : [];
          const bodies: string[] = [];
          for (const page of sources) {
            const normalized = normalizeItemMarkdown(page, options.renderers, native, lines);
            budget.markdown(Buffer.byteLength(normalized) + (bodies.length ? 2 : 0));
            bodies.push(normalized);
          }
          const body = bodies.join('\n\n');
          if (lines.some(line => !line.used)) throw new Error('Craft native separators do not match complete item Markdown.');
          if (native.some(image => !image.used)) throw new Error('Craft native images do not match complete item Markdown.');
          const rendered = registerImageRendering(await budget.time.wait(renderMarkdown(body, { fileURL })), native.map(({ image }) => image));
          entries.push({ id: item.id, data, body, rendered, filePath, assetImports: rendered.metadata?.imagePaths ?? [], digest: generateDigest({ data, body }) });
        }
        budget.time.check();
        // Astro's scoped set can throw while traversing schema output, after
        // earlier writes have succeeded. Keep all entry fields for restoration,
        // including assetImports/imageImports, rendered and deferred metadata.
        const previous = store.entries().map(([id, entry]) => ({ ...entry, id }));
        try {
          store.clear();
          for (const entry of entries) store.set(entry);
          logger.info(`Loaded ${entries.length} Craft Collection entries.`);
        } catch (error) {
          let rollbackFailed = false;
          try { store.clear(); } catch { rollbackFailed = true; }
          // Attempt every old entry even if the store rejects one restoration.
          for (const entry of previous) {
            try { store.set(entry); } catch { rollbackFailed = true; }
          }
          if (rollbackFailed) throw new Error('Craft Collection commit failed and the previous snapshot could not be restored.');
          throw error;
        }
      } finally { budget.time.close(); }
    },
  };
}
