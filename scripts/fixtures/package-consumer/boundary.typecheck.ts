import { craftCollection, type CraftCollectionOptions, type CraftRenderers } from 'astro-loader-craft-do';
import type { Loader } from 'astro/loaders';

const options: CraftCollectionOptions = { apiUrl: '', apiKey: '', collectionId: '' };
const loader: Loader = craftCollection(options);
void loader;
// @ts-expect-error Connection settings are required.
craftCollection({});
// @ts-expect-error Renderer callbacks must be synchronous.
const asyncRenderer: CraftRenderers = { callout: async () => '' };
void asyncRenderer;
// @ts-expect-error Internal helpers are not public exports.
import { normalizeItemMarkdown } from 'astro-loader-craft-do';
void normalizeItemMarkdown;
// @ts-expect-error Package subpaths are deliberately closed.
import { createCraftClient } from 'astro-loader-craft-do/dist/craft-client.js';
void createCraftClient;
