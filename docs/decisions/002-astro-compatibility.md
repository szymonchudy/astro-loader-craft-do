# Astro compatibility investigation

Date: 2026-10-03

Status: Provisional implementation target; runtime compatibility is unverified.

## Context

The owner prefers the earliest practical Astro major and can upgrade the
private blog independently. The loader should use Astro's supported rendering
facilities and avoid maintaining its own Markdown renderer.

## Direction

Target Astro 5.9 and later within majors 5, 6, and 7 for investigation. Do not
advertise a supported range or publish a broad peer dependency until type
checks and fresh consumer builds pass.

Start with the shared object-loader contract: `name`, `load`, `parseData`,
`generateDigest`, `store`, and `renderMarkdown`. Let consumer applications
provide their schemas. Avoid exposing Astro/Zod schema types in our public
options or automatically generating a schema in the first implementation.
The exact public API and data representation still need review.

Pass Astro's returned rendered content into the store. Raw `body` alone does
not enable consumer `render(entry)` calls.

## Alternatives

- Astro 7 only would reduce testing, but is not yet justified by an API need.
- Astro 5.0-5.8 has object loaders but lacks the native context Markdown
  helper. A separate renderer or compatibility fallback would add maintenance
  and could diverge from a consumer's Markdown configuration.
- Automatically generated schemas would introduce additional compatibility
  work around Zod versions and Astro's newer `createSchema` contract.

## Evidence and consequences

The official reference dates `LoaderContext.renderMarkdown` to Astro 5.9.
Versioned source types show the required basic methods and optional loader
schema in majors 5, 6, and 7. This supports feasibility, not runtime correctness.

Markdown behavior differs: 5.9 renders the supplied input directly, 6 and 7
parse frontmatter first, and 7 uses the configured Markdown processor. Test
leading frontmatter-like content deliberately, along with ordinary Markdown,
headings, code, links, and images. Do not assume byte-identical generated HTML.

Validate the exact minimum, the current 5.x release, and selected 6.x and 7.x
releases with schema validation, `getCollection`, `render(entry)`, and removal
of stale entries. Test the packed artifact, including its declarations.

Astro compatibility does not automatically mean supporting every historical
Node version accepted by those Astro releases. Choose and document a separate
Node support policy before packaging.

## Sources

- [Loader reference](https://docs.astro.build/en/reference/content-loader-reference/#loadercontextrendermarkdown)
- [Astro 5.9 loader types](https://github.com/withastro/astro/blob/astro%405.9.0/packages/astro/src/content/loaders/types.ts)
- [Astro 6 loader types](https://github.com/withastro/astro/blob/astro%406.0.0/packages/astro/src/content/loaders/types.ts)
- [Astro 7 loader types](https://github.com/withastro/astro/blob/astro%407.0.0/packages/astro/src/content/loaders/types.ts)
- [Astro 5.9 content layer](https://github.com/withastro/astro/blob/astro%405.9.0/packages/astro/src/content/content-layer.ts)
- [Astro 6 content layer](https://github.com/withastro/astro/blob/astro%406.0.0/packages/astro/src/content/content-layer.ts)
- [Astro 7 content layer](https://github.com/withastro/astro/blob/astro%407.0.0/packages/astro/src/content/content-layer.ts)
