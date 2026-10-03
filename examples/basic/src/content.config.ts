import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { fixtureCollection } from './fixture-loader';

// This slice exercises the draft nested layout with synthetic data.
// Replace fixtureCollection with craftCollection({ apiUrl, apiKey, collectionId })
// once the package's client and normalization slices are implemented.
const articles = defineCollection({
  loader: fixtureCollection(),
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
