# Local package and consumer boundary

Date: 2026-10-03

Status: Implemented local development setup; no release or compatibility promise.
This records the original scaffold checkpoint. A subsequent working-loader
checkpoint exports `craftCollection` and `CraftCollectionOptions`; see decision 006.

## Context and decision

Keep one pnpm workspace with the package at the root and a fresh Astro app at
`examples/basic`. Compile strict TypeScript with `tsc`, emitting ESM JavaScript
and declarations to `dist/`. The package export points at that output; consumers
must not use aliases into `src/`.

The package is private and uses `0.0.0` as a local placeholder. This is not a
release-version recommendation. It currently exports no API. The synthetic
object loader lives only in the example while the Craft implementation is built
in later pairing slices.

Astro 7.3.5 is an exact local verification target, not a minimum supported version.
Astro is a package development dependency and an example application dependency.
A published peer range and Node support policy remain pending actual evidence
and owner review. There are no package runtime dependencies yet.

Use TypeScript 6.0.3: the installed `@astrojs/check` 0.9.10 declares TypeScript
5/6 peers and explicitly rejected TypeScript 7.0.2 in the initial check. pnpm's
`allowBuilds` enables only the required esbuild install script. Commit the lockfile
so later installs reproduce this toolchain.

## Alternatives and consequences

A source alias would be convenient but bypass the package's exports and emitted
declarations. A separate repository for the example would add coordination work
before the loader exists. A bundler and additional test framework are unnecessary
for this first slice: `tsc` and Node's test runner cover the present needs.

The example owns Zod validation and routing. It exercises the proposed nested
`properties` layout without approving that public layout. The harness proves
Astro's parse/store/render workflow, schema type inference, explicit defaults,
and invalid-data build failure; it does not establish Craft API correctness.

Workspace linking does not replace clean tarball installation tests before beta.

The subsequent [package-validation milestone](../research/package-validation.md)
now tests clean npm installs of the tarball, including emitted declarations and
exact Astro peer versions. `prepack` builds the package before packaging. The
placeholder version and private flag remain; no release was created.
Keep the example small enough to extract later: the owner suggested promoting
it to a separate Astro + Craft starter (working name `astro-craft-stater`). This
is a future possibility, not part of the loader's current scope.
