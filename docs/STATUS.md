# Project status

Updated: 2026-10-05

## Current checkpoint

Native-image milestone implemented locally. The loader downloads native images,
registers them with Astro assets, and exposes image metadata and an optional image
renderer. See [native-image contract](native-images.md). The consumer owns featured
image selection, layout, responsive widths and delivery quality. Complete content
and media snapshots are staged before replacing the content store.
The package remains experimental, private, version 0.0.0, and unpublished.
No beta compatibility commitment, push, publication, or release occurred.
The owner has now authorized preparing and publishing 0.1.0-alpha.0 under the
alpha tag, supporting Node 24 and 26, then adopting it in the private blog and
verifying a Vercel preview. Account setup and release validation are still pending.

Owner preference: complete coherent milestones autonomously, preserve owner edits,
keep updates concise, and ask only for consequential choices or genuine blockers.
Reserve mentoring checkpoints for impactful concepts. Do not repeat discovery.

## Read next

- [Scope](decisions/001-initial-scope.md) and [verified compatibility](decisions/002-astro-compatibility.md).
- [Package evidence and reproduction](research/package-validation.md).
- [Data and schemas](decisions/003-public-api-proposal.md): nested properties remains
  experimental; consumer Zod controls validation, defaults, and inferred types.
- [Working loader](decisions/006-first-working-loader.md),
  [consumer rendering](decisions/007-consumer-block-rendering-proposal.md), and
  [normalization contract](normalization.md).
- Recorded [sample evidence](research/sample-observations.md),
  [native export](research/native-markdown-export.md), and [sample guide](sample-collection.md).

START_PROMPT.md remains the charter for consequential decisions.

## Local preview follow-up

Native-media resilience follow-up: a user edit exposed a Craft media HTTP 500
that aborted development startup after one request. A synthetic 500-then-200
reproduction failed before the fix. Media downloads now retry temporary
500/502/503/504 and transport failures at most three times within one shared
30-second deadline. Permanent HTTP errors and corrupt raster data fail immediately;
exhausted failures still preserve the loader's previous complete snapshot.
All 47 portable checks, type checking and the clean Astro 7.3.3 tarball consumer
with the actual blog renderer pass. The prior six-version native-image matrix
remains recorded evidence; this framework-independent request fix reran the actual
consumer version. Live development confirms the owner's edited article's two
current native images, source-byte identity, alt text and updated caption.

The chudy.me local-preview milestone reproduced a normalizer defect with invented
fixtures: Craft may place a code fence immediately after a callout/caption opening
tag and append the closing wrapper to the closing fence. Boundary scanning now
accepts these forms while preserving literal code and rejecting unmatched wrappers.
No package API or blog convention was added. See
[reproduction and evidence](research/multiline-wrapper-fences.md).

The follow-up reruns 35 portable checks and the clean Astro 7.3.3 tarball consumer,
including the actual blog renderer. The prior six-version package matrix remains
recorded evidence; it was not rerun for this framework-independent parser fix.
The live sample environment and its Collection selection remain unchanged.

## Verified result

- Public exports: craftCollection, CraftCollectionOptions, CraftRenderers, CraftImage. Three
  required connection settings; optional synchronous block renderers. No blog
  conventions or schema-generation options in the package.
- Await parseData for every entry and store its returned defaults/transforms.
  Prepare the full rendered snapshot before replacement; failures preserve the
  previous snapshot and empty loads remove stale entries. Body changes affect digests.
- Defaults preserve callouts as semantic asides distinct from quotes, normalize
  nested pages/highlights/captions, and render nested toggles as closed details.
  Code literals and link destinations are protected. Consumers can override all
  block renderers before Astro processes Markdown, including native images with
  escaped literal alt text and adjacent rich captions.
- Native media is validated by full decoding, named by SHA-256 of exact downloaded
  bytes and atomically cached. Fresh signatures reuse identical content; changed
  bytes create a new asset. Pagination, nested block traversal and incomplete or
  corrupt media fail before snapshot replacement. Sharp is the runtime dependency.
- npm pack builds through prepack. The tarball contains exactly 15 intended files:
  emitted JS/declarations, package metadata, README, and license. Clean npm consumers
  have no workspace links or package-source imports; internal exports are closed.
- Exact Astro peers: 5.9.0, 5.18.2, 6.0.0, 6.4.8, 7.3.3, 7.3.5. Every version passes
  tarball installation, exports/declarations, precise schema inference/defaults,
  default/override rendering, five invalid-data builds, cached stale removal, and
  native images through the real Astro asset pipeline. This matrix was rerun for
  the native-image implementation, including the installed blog renderer.
  No untested intermediate/future version is advertised.
- Required blog case: installed Astro 7.3.3 with Sätteri 0.4.1 and its actual
  callout plugin passes isolated tarball rendering of insights, rich lists/code,
  distinct quotations, and nested closed details. Blog files were only read.
- Leading body frontmatter is visible Markdown on tested Astro 5 versions and
  stripped by 6/7. It never replaces validated Collection metadata.

## Reproduce and inspect

- pnpm test: 47 portable checks; no credentials or live API requests.
- pnpm typecheck and git diff --check: package types and patch whitespace.
- pnpm test:package: six clean temporary consumers; requires npm registry access.
- pnpm test:package --blog /Users/szymonchudy/Personal/chudy-me: same matrix plus
  the actual blog renderer. Prints tarball, results, and consumer artifact paths.
- Matrix runtime: Node 26.10.0, TypeScript 6.0.3, @astrojs/check 0.9.10, macOS arm64.
  Broader Node/platform policy remains beta planning, not inferred support.
- pnpm example:build / example:preview / dev remain the live sample workflow using
  ignored root .env.local. Earlier live checks verified three entries and the native
  toggle in the browser; no live refetch was needed for package validation.
  During dev, press s then Enter to sync Craft; use the dev URL printed by Astro.
- Test output uses dist-fixture and preserves the live dist preview. The library
  never loads env files itself. Never print or commit credentials, connection URLs,
  private bodies/IDs, or media URLs. Reuse synthetic fixtures and recorded research.

## Remaining milestones

Inspect this completed package checkpoint before beginning another milestone.
The native media and chudy.me image migration are part of this checkpoint.
Internal route mapping, exhaustive Craft block/property coverage,
large Collections/rate limits, and beta/release
hygiene remain separate work. The example may later become a starter.
Public API and longer-term compatibility/runtime commitments need owner review
before beta. The approved alpha preserves the current experimental API.

## Git and external state

Earlier local commits: 46fc950 (setup), 4fa9927 (client), 7edf6c9 (working loader
and package validation). The next checkpoint records native images, media
resilience, and normalization fixes; inspect git log for its commit ID.
No push, package publication, or release occurred. Repository publication was
previously authorized but remains outside this milestone; recheck availability
before any future external action.
