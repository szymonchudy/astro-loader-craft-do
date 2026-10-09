# Craft body normalization

This is the working experimental contract, not a stable-version promise. The
loader accepts Craft Collection-item Markdown from the API, extracts the body,
and renders it through the consumer's configured Astro Markdown processor.
Collection metadata still goes through the consumer's Zod schema independently.

## Supported conversions

| Craft input | Default output | Consumer override |
| --- | --- | --- |
| Collection/item metadata and content wrappers | Body only, structural indentation removed | None; metadata belongs in entry data |
| `<page>` / `<card>` | H3 title followed by normalized body | `page({ title, markdown })` |
| `<callout>` | HTML `<aside data-craft-callout role="note">`, including multiline body | `callout({ markdown })` |
| `+ Summary` with two-space-indented descendants | Closed HTML details with summary and normalized body | `toggle({ summary, markdown })` |
| `<caption>` block | Emphasis using `<em>` | `caption({ markdown })` |
| `<highlight color="…">` or `==text==` | HTML `<mark>` | `highlight({ markdown, color })` |
| Native `line` block | Unchanged Markdown | Optional `line({ blockId, markdown, lineStyle?, separatorStyle? })` |

Lists, headings, quotations, tables, ordinary emphasis, fenced/indented code,
links, and images continue through Astro. Nested supported structures are processed
inside pages, callouts, toggles, lists, and quotations. Code examples, escaped
syntax, link destinations, and raw literal HTML regions are protected from
conversion. Ordinary HTML is passed through; normalization is not sanitization.

In this Craft dialect, `+` is a native toggle, not an ordinary Markdown bullet.
Descendants are subsequent indented blocks. `-` and `*` retain ordinary bullet
meaning. The live sample confirmed a toggle and its indented bullet in both REST
JSON and Markdown. Broader nesting cases are tested with synthetic fixtures.

Callouts and quotations remain distinct: a callout is an author note, while a
quotation stays a blockquote. The package emits a neutral data-craft-callout
marker; sites own the visual styling. The basic example gives callouts a shaded
panel and quotations a left border.

Default summaries are escaped text labels: inline Markdown in a toggle summary is
not rendered as formatting by the default. The `summary` callback argument retains
its source text. Default highlights preserve emphasis but do not reproduce Craft's
color palette; the `color` argument lets consumers choose their own mapping.
Default nested-page headings stay H3; consumers can choose a different treatment.

## Callback contract

`CraftRenderers` is exported for consumer adapters. Rendering callbacks share these
rules:

- Receive inner Markdown after supported child conversions. Toggle summaries are
  source text; page titles have inline highlight conversion applied.
- Return Markdown (which may include HTML understood by Astro's processor).
- Return `undefined` to use the default, or `''` to omit that element.
- Run synchronously. Async callbacks and other return types are unsupported.
- Output is inserted once and is never reinterpreted as Craft input.
- Throw to fail the load/build. The loader does not commit a partial new snapshot.
- Metadata validation, defaults, and inferred types come from the consumer schema;
  rendering callbacks cannot bypass `parseData`.

Callback output is included in the body digest. Changing a callback is applied on
next content sync even if Craft content is unchanged. These callbacks do not
install watchers, polling, or browser-side code.

### Optional native separators

`line` is opt-in: omitting it retains exact Markdown rules and consecutive-rule
behavior. With it, the loader matches standalone rules to structured native line
blocks in document order across nested containers and paginated exports. Matching
skips fenced/indented code, inline code spans, HTML literals, comments, and heading
underlines. Its `markdown` is the native block's separator source, `blockId` is its
stable ID, and optional `lineStyle`/`separatorStyle` values are preserved strings.
Unknown string values are left for the consumer to interpret. The callback does
not receive a document theme or inherited page styling.

The loader does not add CSS, SVGs, Doodles, or a size mapping. `undefined` preserves
the rule; `''` omits it. Metadata comes from the structured request already used
for images. Missing source, a different rule, an extra Markdown rule, or an unused
native line fails the opted-in load rather than assigning metadata to a different
separator. A style change reflected in callback output changes the content digest.

For a consumer-owned adapter:

```ts
import type { CraftRenderers } from 'astro-loader-craft-do';

export const renderers = {
  callout: ({ markdown }) => markdown.split('\n')
    .map((line, index) => `> ${index === 0 ? '**Note:** ' : ''}${line}`)
    .join('\n'),
  highlight: ({ markdown }) => `<strong>${markdown}</strong>`,
  // Omitted callbacks retain the package defaults, including closed details.
} satisfies CraftRenderers;
```

Pass `renderers` alongside the three connection settings in `craftCollection`.
See the [complete schema example](../README.md#experimental-consumer-api) for
collection configuration, inferred types, and invalid-data behavior.

The [blog adapter fixture](../scripts/fixtures/blog-renderers.mjs) demonstrates
consumer-owned insights and collapsible details. Simple insights reuse the blog's
Sätteri plugin; rich bodies use its HTML container structure so Markdown lists,
code, and nested details survive. Those classes and rules are not package defaults.
An Astro component name in a returned string does not execute an Astro component.

## Verification and scope

The portable suite and separate tarball matrix exercise actual Astro builds with default/custom output,
precise metadata types, and invalid-data failures. Fixtures cover nested toggles,
list/quote containers, multiline callouts, code literals, links, highlights,
captions, pages, malformed structures, and callback fallback/omission/errors.
An optional local probe tests the real chudy-me Sätteri plugin and a consumer
adapter with the same rich fixture:

```sh
pnpm test
pnpm test:package --blog /path/to/chudy-me
```

The tarball matrix installs clean consumers, including the blog's installed Astro
version, and copies only its renderer plugin to a temporary app. It uses synthetic
bodies and independently installed dependencies. See [package evidence](research/package-validation.md).
The older workspace-linked probe remains available for quick local renderer work:

```sh
node scripts/verify-blog-callout.mjs /path/to/chudy-me
```

The live sample was rebuilt and the native toggle was opened and closed in the
browser. The blog probe verifies its rendering pipeline and HTML shape, not the
full blog build, animation code, or visual design.

Leading frontmatter-like body text is passed through to Astro. The verified 5.x
versions render it as Markdown; verified 6.x/7.x versions strip it as frontmatter.
Collection metadata still comes from the separately validated API properties.

The normalizer supports the documented/observed forms above; it is not a complete
Craft export engine. Attributed callout/caption wrappers outside those forms fail
explicitly. Malformed structural wrappers, truncated previews, and excessive
nesting also fail instead of silently discarding content. Unknown ordinary HTML
is preserved. Comments, math, and other unrelated Markdown extensions are left to
the configured Astro processor. Images and Craft links keep their URLs: downloading
media and mapping internal links to site routes remain separate work.


## Fences at inline wrapper boundaries

Craft may export `<callout>```language` or `<caption>```language` and append the
matching wrapper directly to the closing fence delimiter. The normalizer scans
these boundaries separately from literal code, strips only the enclosing tags,
and gives the renderer the complete original fenced Markdown. Backtick and tilde
fences are covered, including literal wrapper/highlight tags within the code.
Shorter or mismatched closing fences do not close the enclosing Craft wrapper.
This behavior is reproduced with invented content in `test/normalize.test.mjs`.
