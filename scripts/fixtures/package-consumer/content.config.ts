import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { craftCollection, type CraftCollectionOptions, type CraftRenderers } from 'astro-loader-craft-do';
import type { Loader } from 'astro/loaders';
import fixtureBody from './fixture-body.txt?raw';
import { blogRenderers } from './blog-renderers.mjs';

const custom: CraftRenderers = {
  callout: ({ markdown }) => `> Consumer choice: ${markdown.replaceAll('\n', '\n> ')}`,
  toggle: ({ summary, markdown }) => `## Consumer details: ${summary}\n\n${markdown}`,
  page: ({ title, markdown }) => `## Consumer page: ${title}\n\n${markdown}`,
  caption: ({ markdown }) => `Caption: ${markdown}`,
  highlight: ({ markdown }) => `<strong>${markdown}</strong>`,
};
const failure = import.meta.env.PACKAGE_INVALID;
const properties: Record<string, unknown> = { slug: 'synthetic-article', status: 'published' };
if (failure === 'status') properties.status = 'unknown';
if (failure === 'slug') delete properties.slug;
if (failure === 'tags') properties.tags = 'wrong type';
const title = failure === 'title' ? '' : failure === 'refinement' ? 'Forbidden' : 'Synthetic article';
const body = import.meta.env.PACKAGE_FRONTMATTER === 'enabled'
  ? '<collectionItem>\n  <content>\n    ---\n    title: Body-only title\n    ---\n\n    ## After frontmatter\n  </content>\n</collectionItem>'
  : fixtureBody;

// Synthetic transport only. The public factory captures fetch before it is restored.
const saved = globalThis.fetch;
globalThis.fetch = async (input) => new URL(String(input)).pathname.endsWith('/items')
  ? Response.json({ items: import.meta.env.PACKAGE_EMPTY === 'enabled' ? [] : [{ id: 'synthetic-item', title, properties }] })
  : new Response(body);
let loader: Loader;
try {
  const options: CraftCollectionOptions = {
    apiUrl: 'https://connect.craft.do/link/synthetic/api/v1',
    apiKey: 'synthetic-key', collectionId: 'synthetic-collection',
    renderers: import.meta.env.PACKAGE_RENDERER === 'blog' ? blogRenderers
      : import.meta.env.PACKAGE_RENDERER === 'custom' ? custom : {},
  };
  loader = craftCollection(options);
} finally { globalThis.fetch = saved; }

export const collections = {
  articles: defineCollection({
    loader,
    schema: z.object({
      title: z.string().min(1).refine(value => value !== 'Forbidden'),
      properties: z.object({
        slug: z.string().min(1),
        description: z.string().optional(),
        status: z.enum(['draft', 'published']),
        tags: z.array(z.string()).default([]),
      }),
    }),
  }),
};
