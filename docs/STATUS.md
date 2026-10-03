# Project status

Updated: 2026-10-03

## Current checkpoint

Package-validation milestone complete locally. The working loader, normalizer,
consumer examples, and clean tarball matrix are included in this local checkpoint.
The package remains experimental, private, version 0.0.0, and unpublished.
No beta compatibility commitment, push, publication, or release occurred.

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

## Verified result

- Public exports: craftCollection, CraftCollectionOptions, CraftRenderers. Three
  required connection settings; optional synchronous block renderers. No blog
  conventions or schema-generation options in the package.
- Await parseData for every entry and store its returned defaults/transforms.
  Prepare the full rendered snapshot before replacement; failures preserve the
  previous snapshot and empty loads remove stale entries. Body changes affect digests.
- Defaults preserve callouts as semantic asides distinct from quotes, normalize
  nested pages/highlights/captions, and render nested toggles as closed details.
  Code literals and link destinations are protected. Consumers can override all
  five supported block renderers before Astro processes Markdown.
- npm pack builds through prepack. The tarball contains exactly 11 intended files:
  emitted JS/declarations, package metadata, README, and license. Clean npm consumers
  have no workspace links or package-source imports; internal exports are closed.
- Exact Astro peers: 5.9.0, 5.18.2, 6.0.0, 6.4.8, 7.3.3, 7.3.5. Every version passes
  tarball installation, exports/declarations, precise schema inference/defaults,
  default/override rendering, five invalid-data builds, and cached stale removal.
  No untested intermediate/future version is advertised.
- Required blog case: installed Astro 7.3.3 with Sätteri 0.4.1 and its actual
  callout plugin passes isolated tarball rendering of insights, rich lists/code,
  distinct quotations, and nested closed details. Blog files were only read.
- Leading body frontmatter is visible Markdown on tested Astro 5 versions and
  stripped by 6/7. It never replaces validated Collection metadata.

## Reproduce and inspect

- pnpm test: 34 portable checks; no credentials or live API requests.
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
Full blog migration, media downloading/lifetime, internal route mapping, exhaustive
Craft block/property coverage, large Collections/rate limits, and beta/release
hygiene remain separate work. The example may later become a starter.
Public API and longer-term compatibility/runtime commitments need owner review
before beta. No npm publication is approved.

## Git and external state

Earlier local commits: 46fc950 (setup), 4fa9927 (client). This checkpoint preserves
and commits the previously uncommitted loader/normalizer/example/workflow edits
alongside package validation; inspect git log for its commit ID.
No push, package publication, or release occurred. Repository publication was
previously authorized but remains outside this milestone; recheck availability
before any future external action.
