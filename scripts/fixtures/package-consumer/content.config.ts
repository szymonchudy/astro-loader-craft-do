import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { craftCollection, type CraftCollectionOptions, type CraftRenderers } from 'astro-loader-craft-do';
import type { Loader } from 'astro/loaders';
import { readFileSync } from 'node:fs';
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
let body = import.meta.env.PACKAGE_FRONTMATTER === 'enabled'
  ? '<collectionItem>\n  <content>\n    ---\n    title: Body-only title\n    ---\n\n    ## After frontmatter\n  </content>\n</collectionItem>'
  : fixtureBody;

const native = import.meta.env.PACKAGE_NATIVE === 'enabled';
const source = 'https://r.craft.do/synthetic?signature=temporary';
const nativeBlock = { id: 'native', type: 'image', url: source, altText: 'Native *literal* _word_ `code` &copy; image', markdown: `![Native alt](${source})` };
const nativeCaption = { id: 'caption', type: 'text', textStyle: 'caption', markdown: '<caption>Native **rich** [credit](https://example.com/credit).</caption>' };
if (native) body = body.replace(/\n  <\/content>\n<\/collectionItem>/, `\n\n    ${nativeBlock.markdown}\n\n    ${nativeCaption.markdown}\n  </content>\n</collectionItem>`);

// Synthetic transport only. The public factory captures fetch before it is restored.
const saved = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  const url = new URL(String(input));
  if (url.hostname === 'r.craft.do') return new Response(new Uint8Array(readFileSync(new URL('./native.png', import.meta.url))));
  if (url.pathname.endsWith('/items')) return Response.json({ items: import.meta.env.PACKAGE_EMPTY === 'enabled' ? [] : [{ id: 'synthetic-item', title, properties }] });
  return new Headers(init?.headers).get('Accept') === 'application/json'
    ? Response.json({ id: 'synthetic-item', type: 'collectionItem', content: native ? [nativeBlock, nativeCaption] : [] }) : new Response(body);
};
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
    schema: ({ image }) => z.object({
      images: z.array(z.object({ blockId: z.string(), src: image(), isFirstBlock: z.boolean(), captionMarkdown: z.string().optional(), altText: z.string().optional() })),
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
