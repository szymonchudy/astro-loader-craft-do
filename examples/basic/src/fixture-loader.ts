import type { Loader } from 'astro/loaders';

// Synthetic data only. This harness is not a Craft client or a public export.
export function fixtureCollection(): Loader {
  return {
    name: 'synthetic-collection',
    async load({ parseData, renderMarkdown, store, generateDigest }) {
      const id = 'synthetic-item';
      const body = '## Synthetic body\n\nRendered through **Astro**.';
      const data = await parseData({
        id,
        data: {
          title: 'Synthetic article',
          properties: {
            slug: 'synthetic-article',
            status: import.meta.env.CRAFT_FIXTURE_INVALID === '1' ? 'unknown' : 'published',
            // Omitted tags exercise a default explicitly chosen by the schema.
          },
        },
      });
      const rendered = await renderMarkdown(body);
      store.clear();
      store.set({ id, data, body, rendered, digest: generateDigest({ data, body }) });
    },
  };
}
