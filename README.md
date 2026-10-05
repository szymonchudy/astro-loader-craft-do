# astro-loader-craft-do

Use Craft.do Collections as Astro Content Collections.

This integrates with **Craft Docs / craft.do**, not Craft CMS.

## Project status

Experimental alpha. Szymon Chudy is building this first personally
owned OSS package to use Craft as an Astro content source and learn the full
package maintenance lifecycle. The API is evolving and may change between alpha
releases. Dogfooding and external feedback will inform beta and eventual stability.

The first working loader now renders the dedicated three-item Craft sample in
a fresh Astro consumer. The package exports `craftCollection` and its options
type. The nested `properties` layout is implemented experimentally and remains
subject to API review before beta. Clean npm-tarball consumers pass on Astro
5.9.0, 5.18.2, 6.0.0, 6.4.8, 7.3.3, and 7.3.5. The peer dependency admits exactly
these versions; other Astro versions are unverified. Node 24 and 26 are supported.
CI validates synthetic consumers on Linux; local checks also cover macOS arm64.
This is experimental compatibility evidence, not a beta promise.

## Install the alpha

```sh
npm install --save-exact astro-loader-craft-do@0.1.0-alpha.0
# or
pnpm add --save-exact astro-loader-craft-do@0.1.0-alpha.0
```

The `alpha` tag tracks experimental releases. Pin an exact version when dogfooding.
Set up a Craft selected-documents API connection with access to your Collection,
then supply its URL, API key, and Collection ID through server/build environment
variables. Keep credentials out of client-side code. The library never loads env
files itself. See the [sample setup](https://github.com/szymonchudy/astro-loader-craft-do/blob/main/docs/sample-collection.md).

## Try the checkpoint

```sh
pnpm install
pnpm test
pnpm test:package
pnpm example:build
pnpm example:preview
pnpm dev
```

The tests verify schema-inferred types, rendering through `getCollection()` and
`render()`, explicit schema defaults, and build failure for malformed synthetic
data. No credentials are required. See [the example](https://github.com/szymonchudy/astro-loader-craft-do/blob/main/examples/basic/README.md).
For live example commands, configure the root's ignored `.env.local` using
`.env.example` and your dedicated sample connection. The package receives
settings explicitly; it does not load environment variables itself.

`pnpm test:package` needs npm registry access. It runs `npm pack`, checks the exact
shipped file list, and installs that tarball into six temporary Astro consumers
with their own dependencies. These checks use no workspace links or package-source
imports. See [package validation](https://github.com/szymonchudy/astro-loader-craft-do/blob/main/docs/research/package-validation.md) for evidence,
reproduction, and the optional isolated blog-renderer check.

## Experimental consumer API

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
  schema: ({ image }) => z.object({
    title: z.string().min(1),
    properties: z.object({
      slug: z.string().min(1),
      description: z.string().optional(),
      publishedat: z.string().optional(),
      status: z.enum(['draft', 'published']),
      tags: z.array(z.string()).default([]),
    }),
    images: z.array(z.object({
      blockId: z.string(),
      src: image(),
      altText: z.string().optional(),
      captionMarkdown: z.string().optional(),
      isFirstBlock: z.boolean(),
    })),
  }),
});

export const collections = { articles };
```

These are example application fields, not package requirements. The schema
infers `status` as `'draft' | 'published'` and `tags` as `string[]`. Missing
required values and invalid values fail the build. Defaults are supplied only
by the consumer's schema. Property keys retain Craft's API spelling.

Pages consume the schema's inferred output directly:

```astro
---
import { getCollection, render } from 'astro:content';
const [article] = await getCollection('articles');
if (!article) throw new Error('Expected an article');
const status: 'draft' | 'published' = article.data.properties.status;
const tags: string[] = article.data.properties.tags;
const { Content } = await render(article);
---
<h1>{article.data.title}</h1>
<p>{status} · {tags.length} tags</p>
<Content />
```

For example, an upstream `status: 'unknown'` fails the build with Astro's
`InvalidContentEntryDataError`; it is never silently skipped. The package supplies
no Zod dependency or generated schema: use the Zod export belonging to your Astro.

### Consumer-owned rendering

Optional `renderers` callbacks customize Craft callouts, toggles, pages, captions,
and highlights before Astro renders the result. All have useful defaults:
callouts become semantic asides, toggles become closed details, pages become headings,
captions become emphasis, and highlights become marks.

For example, add this to the loader options above:

```ts
renderers: {
  callout: ({ markdown }) => markdown.split('\n')
    .map((line, index) => `> ${index === 0 ? '**Note:** ' : ''}${line}`)
    .join('\n'),
  highlight: ({ markdown }) => `<strong>${markdown}</strong>`,
},
```

Return `undefined` to use a default or `''` to omit content. Callbacks are
synchronous; errors fail the load without committing a partial snapshot.
`CraftRenderers` is exported for adapters defined in separate files. Metadata
still uses your Zod schema and its inferred types.

### Native images

Native Craft image blocks are downloaded on every successful sync using the
current media URLs. The loader validates a complete raster decode and saves the
downloaded bytes unchanged under SHA-256 filenames in Astro's cache. API credentials
are never sent to media hosts. Duplicate bytes share an asset; changed bytes create
a new asset. Old files remain available when a later sync fails.

The `images` array preserves document order. `isFirstBlock` means the image is the
first top-level body block; it does not assign a blog-specific role. Adjacent native
caption blocks at the same nesting level become rich `captionMarkdown`. Native
`altText` is preserved literally. The default body renderer emits a figure and
caption, with a local Markdown image that Astro bundles and optimizes. Use `image()`
in the consumer schema to resolve each metadata `src` into Astro's ImageMetadata.

An optional `renderers.image` callback receives `CraftImage` metadata plus the
default figure as `markdown`. Returning `undefined` uses that figure; `''` omits
the image and its adjacent captions. For example, a blog can return `''` when
`isFirstBlock` is true and display that image in its own article header. Rich
caption rendering and responsive sizes remain consumer choices.

This separates four steps: Craft stores the authored image; sync downloads it;
Astro bundles the local asset; the configured image service/CDN creates visitor
variants. A signed Craft URL is not a production asset. See the
[native image contract](https://github.com/szymonchudy/astro-loader-craft-do/blob/main/docs/native-images.md).

See the [normalization contract](https://github.com/szymonchudy/astro-loader-craft-do/blob/main/docs/normalization.md) for callback inputs,
nesting, code protection, summary-label behavior, and supported syntax. The
[blog adapter fixture](https://github.com/szymonchudy/astro-loader-craft-do/blob/main/scripts/fixtures/blog-renderers.mjs) shows consumer-owned
insights and styled details; those conventions are not baked into the package.

## Current limits

Connection URLs must use HTTPS on `connect.craft.do`. Native image downloads accept
the observed HTTPS media origins `r.craft.do`, `res.craft.do`, and `res.luki.io`;
redirects fail closed. Ordinary authored remote Markdown images and Craft links
remain unchanged. Local link rewriting remains unverified. The loader normalizes
observed wrappers and nested pages, rather
than reproducing Craft's full appearance. All property values are passed to
the consumer schema without conversion; exhaustive property-type support is
not established. Large-Collection behavior, API-read retries, incremental fetching,
and exhaustive Craft coverage remain pending. Leading frontmatter-like body text
is rendered on the tested Astro 5 versions and stripped by Astro 6/7; body
frontmatter does not replace validated Collection metadata. Node versions outside
24 and 26 and platforms beyond the recorded checks are unverified.

## Repository guide

- `src/`: reusable package code; compiled JavaScript and declarations go to `dist/`.
- `examples/basic/`: separate Astro consumer; its schema and pages belong to the app.
- `test/`: automated consumer checks using synthetic data.
- `scripts/verify-package.mjs`: clean tarball installs, compatibility builds, and type checks.
- `package.json`: local scripts and the package's intended import boundary.
- `pnpm-workspace.yaml`: links the consumer to the local package.
- `START_PROMPT.md`: preserved original product and mentoring charter.
- `AGENTS.md`: concise working agreement for continuing implementation.
- `docs/STATUS.md`: current checkpoint and next slice.
- `docs/decisions/`: durable reasoning and explicitly marked proposals.

Development proceeds through research, scope and API design, implementation,
consumer verification, package validation, beta, dogfooding, and stabilization.
The portable workspace suite and the networked tarball matrix are separate checks.

Licensed under [MIT](LICENSE).
