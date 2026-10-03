# Consumer-owned rendering of Craft blocks

Date: 2026-10-03

Status: experimental implementation complete for callout, toggle, page, caption,
and highlight callbacks. Beta compatibility commitment remains pending. The
[current contract](../normalization.md) supersedes the initial prototype below.

## Concrete need and evidence

The first intended consumer, chudy-me, already renders typed asides and collapsible
details. Its `src/plugins/satteri-callout.mjs` recognizes `|# insight` followed by
`|` body lines, and `|> Summary` followed by `|` body lines. It generates the blog's
HTML classes and details structure. Its Astro configuration registers that plugin
through the Sätteri Markdown processor. These are repository observations, not a
successful Craft-to-blog integration test.

Astro's installed content layer invokes the configured Markdown processor from
`renderMarkdown`. This is consistent with the documented
[loader rendering contract](https://docs.astro.build/en/reference/content-loader-reference/#loadercontextrendermarkdown).
Reusing the blog's processor is therefore plausible; verify it in a consumer build.

Craft documents `<callout>` in its Markdown extensions and `listStyle: "toggle"`
in structured block responses. See the [Craft API](https://connect.craft.do/api-docs/documents/).
Our sample proves single-line callouts, but does not prove a complete native
toggle's summary/children representation or its Markdown equivalent. Do not infer
toggle identity from an ordinary nested page or a bullet list.

## Recommendation

Separate recognizing Craft structure from choosing its output. Offer a small,
typed, optional set of block rendering callbacks before default conversions discard
the original block kind. Keep these callbacks independent of any Markdown engine.
Do not expose a complete Craft document tree or a plugin framework at this stage.

Pipeline:

```text
Craft response -> recognize supported blocks -> consumer override or default
               -> Markdown -> configured Astro processor -> stored rendered HTML
```

Defaults remain useful without customization. For the observed callout form, the
default was initially a Markdown blockquote; it is now a semantic aside. The blog may map callouts to its own insight
syntax; the package must never know the words "insight", the blog's classes, or
its `|` convention. Other consumers may use different syntax or standard HTML.

This is a standardized package interface for consumer adapters, not a claim that
the blog's syntax is an industry standard. The output is Markdown processed by
Astro; a string containing an Astro component name does not execute that component.

## Draft consumer experience

This example now works experimentally for the observed callout form and simple
paragraph content. It is not yet a beta compatibility commitment.

```ts
// src/content.config.ts in a consumer
import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { craftCollection } from 'astro-loader-craft-do';

const articles = defineCollection({
  loader: craftCollection({
    apiUrl: import.meta.env.CRAFT_API_URL,
    apiKey: import.meta.env.CRAFT_API_KEY,
    collectionId: import.meta.env.CRAFT_COLLECTION_ID,
    renderers: {
      callout: ({ markdown }) =>
        '|# insight\n' + markdown.split('\n').map(line => `| ${line}`).join('\n'),
    },
  }),
  schema: z.object({
    title: z.string().min(1),
    properties: z.object({
      slug: z.string().min(1),
      status: z.enum(['draft', 'published']),
      tags: z.array(z.string()).default([]),
    }),
  }),
});

export const collections = { articles };
```

The consumer configures its existing Sätteri plugin in `astro.config.mjs`. No
Sätteri dependency or blog plugin is bundled in the loader. Usage remains:

```astro
---
import { getCollection, render } from 'astro:content';
const articles = await getCollection('articles');
const article = articles[0];
if (!article) throw new Error('Expected an article');
const status: 'draft' | 'published' = article.data.properties.status;
const tags: string[] = article.data.properties.tags;
const { Content } = await render(article);
---
<h1>{article.data.title}</h1>
<Content />
```

Consumer schemas still run through awaited `parseData`. Invalid status, missing
slug, or invalid title fails the build. Schema defaults and inferred types are
preserved. Body rendering callbacks cannot bypass metadata validation.

Draft callback contract: receive the supported block's inner Markdown, with Craft
structural indentation/wrappers removed and supported children processed first;
return a replacement Markdown string, or `undefined` to use the default. An empty
string intentionally omits that block. Insert the result as a block, then render
the assembled document once through Astro; do not reinterpret callback output as
Craft input. Callback errors fail the sync/build, preserving the previous store
snapshot. No async hooks or parsed metadata arguments proposed in the first step.
These rules require tests before becoming a compatibility commitment.

For chudy-me, mapping all Craft callouts to insights is the simplest starting
convention. If several aside types are needed, investigate an explicit authoring
label in the blog adapter rather than making visual color imply universal meaning.
Native toggles are the candidate source for details; their callback input shape
remains undecided until a real read-only sample proves how children are grouped.

## Alternatives and consequences

- Only an Astro Markdown plugin: reuse established infrastructure, but it cannot
  recover callout/toggle identity after a lossy default conversion. Preserving
  semantic tags for such a plugin is another viable design, but exposes a tag
  dialect to consumers and requires processor-specific parsing support.
- Whole-document string transform: a small signature, but makes consumers parse
  Craft wrappers, distinguish code from content, and handle nesting themselves.
- Full structured block renderer: potentially better for complex nesting, but
  exposes a much larger model and may require changing our content fetch strategy.

Callbacks add a compatibility obligation: input meaning, ordering, fallback, and
failure behavior must be documented. Prototype the two real consumers (default
rendering and blog rendering) before accepting the interface for beta. Arbitrary
nested lists/code inside the blog's custom callouts are not established by its
simple authoring examples; include them in later coverage before broad claims.

## Small next steps

1. Inspect one owner-provided native toggle through read-only JSON and Markdown,
   recording structural evidence only. No mutation of private Craft documents.
2. Prototype the callout callback and verify both default quotes and consumer
   insights, including an actual Sätteri consumer build, literal-code protection,
   callback failure, schema validation, and inferred types. Inspect together.
3. Add toggle/details mapping only after its data representation is proven.

Pause further lossy normalization choices (such as dropping highlight metadata)
until this customization direction is reviewed. Blog files are read-only evidence
for this proposal and have not been changed.

## Callout implementation checkpoint

Implemented `CraftCollectionOptions.renderers` and exported `CraftRenderers`.
Only `callout` is currently supported, with synchronous string/undefined return
values and the semantics above. Invalid JavaScript return values fail explicitly.
The current single-line scope has no nested child blocks inside the callout itself;
recursive child normalization is still a proposal for richer block support.

Validation: 23 automated tests pass, including default/custom output through the
Astro 7.3.5 consumer, exact metadata inference, invalid-data build failure, default
fallback/omission, literal code protection, nested-page callbacks, digest changes,
and previous-snapshot preservation after a callback throws.

An additional isolated synthetic build used the blog's installed Astro 7.3.3,
`@astrojs/markdown-satteri` 0.4.1, and actual `satteri-callout.mjs` plugin. The public
loader and insight adapter produced `aside.callout-aside--insight`, the Insight
label, bold/inline-code markup, a separate following paragraph, and an ordinary
blockquote for an ordinary quote. No blog content/configuration was changed and
no live Craft fetch was needed. This proves the rendering path, not the entire
blog build, full styling, MDX, or broader version compatibility.

Reproduce after `pnpm build` with:

```sh
node scripts/verify-blog-callout.mjs /path/to/chudy-me
```

This optional dogfood probe reads the existing plugin and installed dependencies,
builds a synthetic consumer in a temporary directory, and prints its artifact path.
It is not part of the portable test suite. Next: inspect this checkpoint, then
obtain structural evidence from one native Craft toggle before defining its hook.


## Completed normalizer milestone

The owner requested autonomous completion of the whole normalizer milestone, with
mentoring reserved for impactful checkpoints. The complete callback set now shares
one return/fallback/error contract. Defaults use standard Markdown/HTML and nested
children are normalized before their enclosing callback. No new runtime dependency
was needed. Code protection includes fenced/indented code, inline code spans,
escaped syntax, raw literal HTML regions, and link destinations.

Direct REST verification of the owner-authorized sample toggle found a text block
with listStyle=toggle followed by a bullet at indentationLevel=1. Markdown uses
`+ Summary` and a child indented two spaces, within the existing Collection content
wrapper. Normalization can therefore retain the existing Markdown fetch strategy.
Nested variants are covered by synthetic fixtures; they were not all observed live.

The blog probe now verifies rich insights and nested collapsible details through
its installed Sätteri processor. Its existing shorthand plugin is paragraph-based;
the consumer adapter emits the blog's HTML container structure for rich bodies so
lists/code/nested details are not flattened into text. This adapter stays outside
the package. No blog files were changed or full migration claimed.

The live example was rebuilt and its actual toggle was opened and closed in the
browser. The supported forms, known limits, and default choices are documented in
[normalization.md](../normalization.md). Packaging, media handling, internal routes,
and exhaustive Craft-export fidelity are separate work.

The owner observed that default callouts and quotations looked identical. The
callout default now preserves the distinction as an aside with role=note and a
neutral data-craft-callout marker. The example provides a shaded panel; ordinary
quotes retain blockquote markup. Consumer overrides still take precedence.
