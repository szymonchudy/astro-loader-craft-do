# Packed-package consumer evidence

Updated: 2026-10-05

Status: Package-validation milestone complete locally; experimental and unpublished.
No live Craft requests, private content, blog writes, or remote media downloads.

## Reproduce

```sh
pnpm test
pnpm typecheck
pnpm test:package
# Include the installed blog version and its actual renderer plugin:
pnpm test:package --blog /path/to/chudy-me
# A targeted rerun (exact versions only):
pnpm test:package 7.3.3 --blog /path/to/chudy-me
```

The matrix needs npm registry access and pnpm for the package's `prepack` build.
It creates a temporary directory and prints its path. Each consumer has its own
package.json, npm lockfile, node_modules, generated types, build, and command log.
It retains the tarball and results.json (including artifact integrity) for local
inspection. Transitive dependencies are resolved at install time; preserve these
temporary lockfiles if exact reproduction of a run is needed.

## Observed matrix

All rows used Node 26.10.0, TypeScript 6.0.3, and @astrojs/check 0.9.10 on macOS
arm64. Exact 5.x/6.x upper test points were selected from targeted npm registry
queries; reuse this matrix without assuming they remain the latest releases.

| Astro | Clean tarball, exports/types, schemas, rendering, failure builds | Leading body frontmatter | Blog renderer |
| --- | --- | --- | --- |
| 5.9.0 | Pass | Visible Markdown | Not applicable |
| 5.18.2 | Pass | Visible Markdown | Not applicable |
| 6.0.0 | Pass | Stripped by Astro | Not applicable |
| 6.4.8 | Pass | Stripped by Astro | Not applicable |
| 7.3.3 | Pass | Stripped by Astro | Pass, Sätteri 0.4.1 |
| 7.3.5 | Pass | Stripped by Astro | Not applicable |

7.3.3 was read from `/Users/szymonchudy/Personal/chudy-me/node_modules/astro/package.json`,
not inferred from its manifest range. The optional blog run requires that installed
version in the matrix. It copies only the actual callout plugin into the temporary
consumer and installs the blog's exact Sätteri version from npm. The loader is still
installed from the tarball. This verifies renderer output, not the full blog,
animation, styling, MDX, or migration.

## Artifact and consumer checks

- `npm pack` runs `prepack` to build emitted JavaScript/declarations before packing.
  The exact 15-file allowlist is package.json, README.md, LICENSE, and JS/.d.ts for
  index, loader, normalizer, internal Craft client, images, and asset rendering. No source, fixtures, env
  files, blog code, credentials, or private content ships.
- Each consumer uses a real npm tarball install. The harness asserts the installed
  package is a directory inside that consumer, with no src directory or workspace
  link. Consumer imports use only `astro-loader-craft-do` and its emitted exports.
- Plain Node imports expose only `craftCollection`. Internal subpaths, source
  paths, and package.json imports fail with ERR_PACKAGE_PATH_NOT_EXPORTED. Metadata
  checks require the intended export/declaration paths, MIT, private 0.0.0,
  exact Astro peers, and Sharp as the sole runtime dependency.
- Consumer-authored Zod schemas infer precise status unions, optional descriptions,
  and defaulted string arrays. `astro check` verifies exact type equality (including
  protection against inference becoming any), renderer argument types, Loader
  assignability, required settings, rejected async callbacks, and closed subpaths.
- Builds verify schema defaults at runtime, getCollection/render, ordinary Markdown,
  callouts distinct from quotes, rich lists/code, nested closed details, highlights,
  captions, pages, tables, and preserved synthetic image/link URLs. A consumer
  override build replaces all five block defaults using the same cached consumer.
- Five deliberately invalid builds cover enum, missing required field, wrong type,
  empty title, and failed refinement. Every one exits unsuccessfully with
  InvalidContentEntryDataError and the expected synthetic entry/field.
- A leading-frontmatter build checks version-specific body behavior without
  overriding validated metadata. An empty snapshot build removes cached entries;
  a final valid build restores and verifies the default fixture.

The portable 47-check suite separately covers child-before-parent callbacks,
fallback/omission/errors, malformed input, literal-code protection, body digests,
unchanged-entry revalidation, previous-snapshot preservation on failure, native
image decoding/cache identity, complete pagination, and temporary media retries.
All six versions also pass native-image rendering through Astro's asset pipeline.

## Compatibility consequence and limits

The peer is the exact union `5.9.0 || 5.18.2 || 6.0.0 || 6.4.8 || 7.3.3 || 7.3.5`.
Do not infer support for intermediate/future versions, older Node runtimes, other
platforms, or TypeScript versions from these runs. The package delegates Markdown
to Astro, so equivalent HTML can differ in attribute serialization and whitespace.
No separate renderer or cross-version compatibility branch was needed.

This artifact is suitable for local consumer testing, not a release approval.
Beta API review, runtime policy, CI/release hygiene,
internal routes, exhaustive Craft coverage, and large-Collection behavior remain
separate work. Full blog migration is outside this milestone.

## Primary references

The earlier [compatibility investigation](../decisions/002-astro-compatibility.md)
records versioned Astro source. Targeted documentation checks for this milestone:

- [Astro loader reference](https://docs.astro.build/en/reference/content-loader-reference/#loadercontextrendermarkdown)
- [npm pack](https://docs.npmjs.com/cli/v11/commands/npm-pack/)

Documentation establishes the intended contracts; the matrix above records observed
consumer behavior. Feasibility alone is not counted as a passing version.
