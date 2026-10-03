# Project status

Updated: 2026-10-03

## Current milestone

Build the first working loader in a fresh Astro consumer app, using the pairing
workflow in `AGENTS.md`. Discovery and the initial owner questions are complete.
Do not restart them. The package scaffold and synthetic Astro consumer are now
implemented; the Craft client and production loader are not implemented yet.

## Read next

- [Initial scope and ownership](decisions/001-initial-scope.md): accepted choices.
- [Astro compatibility investigation](decisions/002-astro-compatibility.md):
  provisional version targets, not tested support.
- [Public API proposal](decisions/003-public-api-proposal.md): user-authored Zod
  validation, inferred types, and build failure are confirmed requirements.
  Nested `properties` is still a proposed data layout, not a beta commitment.
- [Sample observations](research/sample-observations.md): direct REST evidence
  and unresolved rendering issues; do not infer raw API shapes from connector
  formatting.
- [Sample Collection guide](sample-collection.md): already prepared by the owner.
- [Local development boundary](decisions/004-local-development-boundary.md):
  implemented scaffold and first consumer validation evidence.

`START_PROMPT.md` remains the full charter. Consult it for significant scope
and release decisions, rather than replaying the completed "Start now" phase.

## Existing implementation and access

- `scripts/inspect-craft.mjs` is a read-only research probe, not the loader.
  It ran successfully against the sample. It reports shapes and suppresses
  credentials, IDs, body text, and media URLs. The package manifest, strict
  TypeScript build, pnpm workspace, and synthetic example tests now exist.
- `.env.local` contains working sample connection settings and is ignored by
  Git. Never print or commit its contents. Load it only into local processes.
- `gh` is authenticated as the intended owner. The repository lookup returned
  404 during setup. No remote repository, remote, npm account, or release was
  created in this work. Recheck external state before acting on it.
- Work is in the local checkout with uncommitted/untracked setup files and
  owner edits to `START_PROMPT.md`. Inspect Git status and preserve these.
  A new local chat on this directory can use them without a push.
- Model recommendation for the next chat: GPT-6.1 Sol / Medium. The existing
  `.codex/config.toml` still defaults to Astra / High; select the intended
  model explicitly in the new chat. No configuration was changed for this.

## Completed pairing checkpoint: first implementation slice

The root package compiles ESM JavaScript and declarations; `examples/basic` is
a fresh consumer linked through package exports. The package is private, has
no runtime dependencies, and exports no API yet. Its placeholder version is
not a release decision.

The consumer shows a complete `defineCollection({ loader, schema })` using a
synthetic object loader and the proposed nested `properties` layout. That
layout remains open for owner review. The fixture omits tags; only the user's
schema supplies their default. No Craft credentials or live calls were used.

Verified locally on Node 26.10.0, pnpm 12.8.1, Astro 7.3.5, TypeScript 6.0.3:

- `pnpm test`: package compilation, successful Astro build, HTML assertions for
  metadata/defaults and Markdown rendering, consumer type check with exact
  schema type assertions, invalid-status build failure naming the item/field,
  and restoration of the successful build. Invalid data was tested with the
  existing Astro cache, not only in a clean build.
- `pnpm typecheck` and `pnpm peers check`: passed.
- `git diff --check`: passed. Existing owner edits were preserved.

Run `pnpm dev` to inspect the synthetic example. See
`examples/basic/README.md` and `src/content.config.ts` inside that app.
Pause here for the owner's learning checkpoint before the next slice.

## Next implementation slice

Implement a small read-only Craft client using the recorded REST evidence and
synthetic fixtures. Validate response shapes and sanitized errors without
introducing a large SDK or public options. Do not repeat live sample requests
unless they answer a new unresolved question.

Progress toward the milestone in small slices: read-only client, normalization,
Astro loading/validation/rendering, then consumer verification. The milestone
is done when sample content renders through `getCollection()` and `render()`,
the schema gives real inferred types, and malformed synthetic data fails the
build. The intentional empty-value item may require explicitly optional/defaulted
fields in the successful example. Do not weaken the schema silently or mutate
Craft content to make tests pass.

Markdown wrappers and indentation need normalization. Image lifetime, internal
links, large-Collection completeness, and cross-version builds remain unverified.
The private blog will be used for later dogfooding, not as the initial fixture.
The owner suggested later extracting the basic example into an Astro + Craft
starter; keep that possibility separate from the current loader milestone.

Repository publication during development was authorized by the owner, but
publishing is not part of this first implementation slice. No npm publication
has been approved.
