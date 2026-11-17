# Faster synchronization

Accepted 2026-11-17. No public configuration or consumer schema changes.

## Bounded concurrency

Items now load in a worker pool of at most four (`limits.concurrency`) instead
of one after another. Each item still reads blocks, then Markdown, then media;
entries keep Collection order. The first failure stops workers from starting
new items, and the existing staged snapshot, budgets and retries are unchanged.
Observed on an 18-item blog Collection: `astro sync` fell from 27.9s to 17.0s.

## Development reuse

During `astro dev` (Astro supplies `watcher` only there), an item whose source
digest matches the previous dev sync reuses its stored entry and skips the
Markdown read, media downloads, schema parsing and rendering. The digest covers
the listed item (ID, title, properties), the raw text of every blocks response
for that item, and the source text of consumer renderers.

- Raw responses, not the parsed tree: the parser keeps only known fields, so a
  change Craft expresses in another field would otherwise be missed.
- Craft's `lastModifiedAt` was rejected: in an observed Collection, one root was
  older than its newest child and one root had no metadata.
- Observed: block responses for 18 unchanged items were byte-identical across
  fetches 20 seconds apart, including media URLs.

Builds never reuse entries and delete the stored digests, so a later dev session
never reuses entries produced by a build (for example, by a consumer wrapper
that only applies in production). A warm dev start reused all 18 items and
reached synced content in 7.3s, down from roughly 28s.

Limitations: digests cannot see code imported by renderers, remark/rehype
plugins outside the Astro config, or schema files that Astro does not track.
Restart with `astro dev --force` after changing those. Reused items do not
refresh media; changed items still re-download and fully validate theirs.
