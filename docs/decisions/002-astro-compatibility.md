# Astro compatibility investigation

Date: 2026-10-03

Status: Exact-version experimental compatibility verified by clean tarball consumers.

## Context

The owner prefers the earliest practical Astro major and can upgrade the
private blog independently. The loader should use Astro's supported rendering
facilities and avoid maintaining its own Markdown renderer.

## Package-validation decision

The owner requested resolving compatibility without advertising unverified
versions. The npm peer dependency admits exactly Astro 5.9.0, 5.18.2, 6.0.0,
6.4.8, 7.3.3, and 7.3.5. All passed fresh tarball installation, declaration and
schema inference checks, real rendering, invalid-data build failures, and cached
snapshot replacement on Node 26.10.0 with TypeScript 6.0.3. The blog's installed
7.3.3 also passed its isolated Sätteri renderer check. See the
[reproducible evidence](../research/package-validation.md).

Astro remains a peer because the consumer owns its framework and Markdown
processor. It is also a development dependency for compiling/testing the package.
Sharp is the sole runtime dependency, used to fully decode native images before
snapshot replacement. There are no renderer fallbacks.

The tested minimum is 5.9.0, but this does not mean every version after 5.9 is
supported. A broad `>=5.9 <8` or caret range would admit untested versions. Astro
7 only would discard working older consumers. Exact versions are deliberately
conservative during experimental development; expand them after targeted checks.
An enduring beta compatibility policy still requires owner review before release.

Observed output is semantically equivalent for the tested normalization fixture,
with serialization differences such as empty HTML attributes. Leading
frontmatter-like body text remains visible in the tested 5.x versions and is
stripped in 6.x/7.x, matching the recorded source investigation. Metadata remains
schema-controlled. Do not promise byte-identical HTML across framework versions.

This milestone verifies Node 26.10.0 only. It establishes no historical Node
support promise or new engine restriction; broader runtime policy belongs to beta
planning. No release or publication is authorized by these checks.

## Original investigation direction

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
