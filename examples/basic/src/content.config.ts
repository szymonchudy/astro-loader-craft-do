import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { craftCollection } from 'astro-loader-craft-do';
import { fixtureCollection } from './fixture-loader';

// Tests opt into synthetic HTTP responses. Normal usage reads the Craft sample.
const articles = defineCollection({
  loader: import.meta.env.CRAFT_TEST_FIXTURE === '1'
    ? fixtureCollection()
    : craftCollection({
        apiUrl: import.meta.env.CRAFT_API_URL,
        apiKey: import.meta.env.CRAFT_API_KEY,
        collectionId: import.meta.env.CRAFT_COLLECTION_ID,
      }),
  schema: z.object({
    title: z.string().min(1),
    properties: z.object({
      slug: z.string().min(1),
      description: z.string().optional(),
      publishedat: z.string().optional(),
      status: z.enum(['draft', 'published']),
      tags: z.array(z.string()).default([]),
    }),
  }),
});

export const collections = { articles };
