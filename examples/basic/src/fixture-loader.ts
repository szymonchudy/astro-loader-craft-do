import type { Loader } from 'astro/loaders';
import { craftCollection } from 'astro-loader-craft-do';
import fixtureBody from './fixture-body.txt?raw';

// Test-only transport substitution: exercise the public loader without credentials.
export function fixtureCollection(): Loader {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    if (url.pathname.endsWith('/items')) {
      return Response.json({ items: [{
          id: 'synthetic-item',
          title: 'Synthetic article',
          properties: {
            slug: 'synthetic-article',
            status: import.meta.env.CRAFT_FIXTURE_INVALID === '1' ? 'unknown' : 'published',
            // Omitted tags exercise a default explicitly chosen by the schema.
          },
      }] });
    }
    if (url.pathname.endsWith('/blocks')) {
      return new Headers(init?.headers).get('Accept') === 'application/json' ? Response.json({ id: new URL(String(url)).searchParams.get('id'), type: 'collectionItem', content: [] }) : new Response(fixtureBody);
    }
    throw new Error('Unexpected synthetic request.');
  };
  try {
    // The factory captures fetch synchronously; restore it before Astro executes.
    return craftCollection({
      apiUrl: 'https://connect.craft.do/link/synthetic/api/v1',
      apiKey: 'synthetic-key',
      collectionId: 'synthetic-collection',
      renderers: import.meta.env.CRAFT_FIXTURE_RENDERER === 'custom' ? {
        callout: ({ markdown }) => markdown.split('\n').map((line, index) => `> ${index === 0 ? 'Consumer choice: ' : ''}${line}`).join('\n'),
        toggle: ({ summary, markdown }) => `## Consumer details: ${summary}\n\n${markdown}`,
        highlight: ({ markdown }) => `<strong>${markdown}</strong>`,
        caption: ({ markdown }) => `Caption: ${markdown}`,
        page: ({ title, markdown }) => `## Consumer page: ${title}\n\n${markdown}`,
      } : {},
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
}
