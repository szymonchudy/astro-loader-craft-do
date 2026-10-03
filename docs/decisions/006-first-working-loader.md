# First working Craft-to-Astro checkpoint

Date: 2026-10-03

Status: Working experimental implementation on Astro 7.3.5; not beta-ready.

## Context and implementation

The owner requested moving past the client-abstraction discussion to a visible
working result. Complete one vertical checkpoint connecting the sample to the
Astro example, then pause. Retain native fetch; no new dependency was added.

Export `craftCollection({ apiUrl, apiKey, collectionId })` and its options type.
The existing nested `title`/`properties` proposal is implemented experimentally,
not accepted as a beta compatibility commitment. Consumers supply their Zod
schema; all loaded entries pass through awaited `parseData`, and its returned
data is stored. Property names and values pass through without conversion.
Exhaustive Craft property-type support remains unverified.

Fetch and prepare entries sequentially, including normalized body, Astro-rendered
content, and digest. Replace the store only after preparation succeeds. This
removes deleted entries while avoiding partial replacement after validation or
fetch failure. Revalidate unchanged entries; no incremental fetching is claimed.

Normalization follows the directly observed two-space Craft nesting structure:
extract the outer item's content, remove its structural four-space body indent,
and flatten nested pages/cards into headings plus Markdown. Preserve relative
list/code indentation, hard line breaks, and fenced literal wrapper examples.
Empty metadata-only items become empty bodies. Malformed wrappers and truncated
previews fail explicitly. Initially callout/highlight/caption HTML remained in the
content. Following the native-export comparison, standalone single-line callouts
become standard blockquotes; highlight/caption tags retain example styles. See the
[export comparison](../research/native-markdown-export.md) for scope and evidence.

## Verification and alternatives

A new safe structure probe confirmed three items and wrapper indentation. The
actual loader then fetched the prepared sample and built a static Astro page.
The localhost browser showed all three entries, nested lists, code, a quote,
callout/highlight content, and a nested page. Generated HTML contains the image
element and no Collection/property/content wrappers. Its remote URL lifetime
is not verified. No Craft data was mutated or copied into committed fixtures.

Synthetic checks exercise the public loader via a test-only fetch substitution,
consumer schema inference/defaults, invalid-data build failure, normalization,
stale-entry removal, unchanged-entry revalidation, and failed-snapshot preservation.
The substitution restores global fetch immediately after the factory captures
it, before asynchronous Astro loading. It is not a public fetch option.

The root example launcher loads the ignored environment file into the app
process; the library never loads credentials implicitly. Preview serves the
previous build, allowing owner inspection without another live fetch.

A full Craft-style renderer or public transform hooks would expand this
checkpoint beyond demonstrated needs. Cross-version builds and packed-artifact
installation are deferred. Keep media lifetime, link handling, property types,
large Collections, and rate-limit behavior as explicit remaining uncertainties.

The later normalization milestone supersedes the initial rendering limits above.
See [the current normalizer contract](../normalization.md) and decision 007.

The subsequent [package validation](../research/package-validation.md) completes
the clean tarball and exact-version Astro checks deferred at this checkpoint.
