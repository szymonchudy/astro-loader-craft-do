# Changelog

## 0.1.0-alpha.1 (release candidate)

- Reject inconsistent empty or metadata-only Markdown for each structured root continuation before consumer callbacks.
- Validate reserved wrappers equally with optional separator rendering.
- Decode every GIF/WebP frame within explicit frame, pixel, byte and time limits, preserving original media bytes.
- Bound collection sizes, paginated API operations, streaming bodies, normalized and retained Markdown, media reads and whole synchronization.
- Retry transient idempotent reads with a maximum of three attempts, deadline-aware backoff and Retry-After handling.
- Restore the previous complete collection, including Astro asset/import metadata, if committing the staged snapshot fails. Persistent store failures during restoration are reported explicitly.
- Patch Sharp to 0.35.5; preserve the experimental interface, consumer schemas and exact Astro peers.
- Pack once and validate the same archive on Node 24/26 before trusted publication.

## 0.1.0-alpha.0

First experimental release. APIs may change between alpha releases.

- Load Craft Docs Collections into Astro with consumer-authored schemas and types.
- Render Craft Markdown, semantic callouts, nested toggles, highlights, and captions.
- Customize rendering with synchronous consumer callbacks.
- Download and fully validate native images; bundle exact source bytes through Astro assets.
- Retry temporary media failures and preserve the previous complete snapshot on failed syncs.
- Support Node 24 and 26 and the six exact Astro versions listed in package metadata.

Internal Craft route mapping, exhaustive block/property coverage, large-Collection
behavior, and general API-read retries remain outside this alpha's guarantees.
