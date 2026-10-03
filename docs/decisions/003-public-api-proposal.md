# Public API and entry data

Date: 2026-10-03

Status: User-authored Zod validation and build failure are confirmed requirements.
The nested data layout is now implemented experimentally in the working-loader
checkpoint. It remains a proposal for beta compatibility, pending owner review.

## Context

The loader must support user-defined Collection fields without requiring blog
concepts. Direct inspection confirms Craft separates an item's ID, title, and
property object. A property display name can differ from its API key.

## Proposal

Use Astro's standard collection schema for runtime validation and inferred
TypeScript types. The primary consumer example must show both the loader and
the schema, rather than suggesting the user receives an untyped property bag.
For example, on current Astro, using the proposed nested data layout:

```ts
import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { craftCollection } from 'astro-loader-craft-do';

const articles = defineCollection({
  loader: craftCollection({
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
      tags: z.array(z.string()),
    }),
  }),
});

export const collections = { articles };
```

The loader options remain the three required strings `apiUrl`, `apiKey`, and
`collectionId`. Schema validation is supplied through Astro's `schema` option.

The consumer passes credentials explicitly. The library does not read a
particular environment-variable name or load an environment file itself.

### Validation contract

- Call and await `LoaderContext.parseData({ id, data })` for every loaded entry
  before storing that entry. Store the parsed result so user-selected schema
  transforms/defaults are reflected in runtime data and TypeScript types.
- Missing required fields, incorrect types, invalid enum values, and failed
  refinements must cause the build to fail. Do not swallow validation failures,
  silently skip invalid entries, or substitute fallback values in the loader.
- Only the user's schema may make fields optional, supply defaults, or opt
  into coercion. Coercion should not be added implicitly by the loader.
- Revalidate entries even when remote content is unchanged: a consumer may
  have tightened the schema since the previous build.
- Type inference comes from the Astro collection schema. Verify it with a
  consumer type check in addition to runtime tests; do not cast unvalidated
  data to an asserted interface.
- Test build failure using deliberately malformed synthetic fixtures, without
  modifying the real Craft sample. The current empty-value sample will fail
  the example above because `tags` is required. This is expected. A consumer
  can deliberately choose `tags: z.array(z.string()).default([])` instead.

The nesting question is independent of validation: either nested or flattened
data must go through the user-supplied collection schema.

Represent an entry as:

```ts
{
  id: "<Craft item ID>",
  data: {
    title: "Item title",
    properties: {
      // User-defined fields under their actual Craft API keys.
    },
  },
  body: "<normalized item body Markdown>",
  // Astro's rendering result is also stored for render(entry).
}
```

The `properties` object has no hard-coded field names or blog requirements.
Supported values pass through without automatic date conversion or defaults.
User-authored Astro schemas define validation, coercion, and defaults; their
parsed output becomes entry data. If such a schema strips unknown fields,
that is a consumer choice rather than a loader allowlist.

Preserve API keys exactly. For the sample, the date field is
`entry.data.properties.publishedat`, despite its `publishedAt` display label.
Do not silently recase keys or derive them from labels.

Use Craft item IDs for entry identity. The sample's `slug` can influence the
example app's routes; it does not override the loader ID. The sample's `status`
does not cause the loader to filter entries.

Do not add filter, transform, link-resolution, asset-resolution, or schema
generation options speculatively. Rendering and asset experiments may reveal
a necessary extension point before beta; that would need a specific proposal.

## Alternatives

Flattening properties into `entry.data` would shorten access to fields such as
`slug`, but would mix user-defined names with the item's intrinsic title and
any future loader metadata. Nesting preserves a clear namespace at the cost of
one extra property access.

Mapping keys to display labels would look friendlier but would couple consumer
code to presentation labels and introduce collision and rename questions.

Automatically generating an Astro schema could reduce setup but requires
cross-version schema support and adds decisions about coercion and field
semantics. Consumer schemas are a smaller initial contract.

## Consequences

Users can define unrelated schemas such as products, recipes, articles, or
events while retaining the same loader API. Documentation and examples must
teach the difference between a Craft label and a property key.

Data layout becomes a compatibility commitment: changing from nested fields
to flattened fields, or changing key mapping, would break consumer schemas and
templates. It should be reviewed now rather than changed casually after beta.

Support for all Craft property types is not established by the five sample
fields. Unsupported types must be handled or documented explicitly.

## Evidence

See [the sample observations](../research/sample-observations.md) for the
documented distinction between connector output and directly observed REST
responses. Rendering, fresh tarball builds, schema defaults, exact inferred
types, and invalid-data failures now pass the
[package matrix](../research/package-validation.md). This verifies the proposed
experience without promoting the data layout to a beta compatibility promise.

- [Astro parseData contract](https://docs.astro.build/en/reference/content-loader-reference/#loadercontextparsedata)
- [Astro collection schemas and type inference](https://docs.astro.build/en/guides/content-collections/#defining-the-collection-schema)
