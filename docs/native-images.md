# Native Craft images

Experimental contract, added 2026-10-05. The public runtime export remains
`craftCollection`; `CraftImage` is an exported type. The loader adds an ordered
`images` array to `{ title, properties }`, without changing property semantics.

Each image has `blockId`, a local relative `src`, optional literal `altText`,
optional rich `captionMarkdown`, and `isFirstBlock`. A leading native image is
identified by its position, not by a Collection property or blog convention.
Adjacent native caption blocks at the same indentation level are associated with
that image. Nested images never become a leading image for the outer item.

Use the schema callback's `image()` for metadata sources. The loader passes an
absolute virtual Markdown path to `parseData`, supplies the same file URL to
`renderMarkdown`, and stores the root-relative path and image imports. The file
is a resolution base; it does not contain a copy of private article prose.
Astro 5's renderer ignores `fileURL`; the loader promotes only its own known local
image tags into Astro's asset markers. Astro 6 and 7 use native markers. Asset
imports include the different metadata fields used by those versions.

A sync refreshes media URLs from structured blocks, exhausts root and explicit
nested continuations, and matches the Markdown body. Root Markdown reads follow
the same root cursors. Duplicate IDs, repeated cursors, inconsistent roots,
truncated wrappers and unmatched native images fail the load. Complete inline
nested content is traversed in memory instead of fetched repeatedly.

Media requests have no authorization header. Only observed HTTPS Craft media
origins are accepted, with redirects disabled and a timeout. A complete supported
JPEG/PNG/WebP/AVIF/GIF raster decode must succeed. Files keep the downloaded bytes,
use a SHA-256 filename, and deduplicate identical content. Craft may re-encode an
upload before the loader sees it; the loader does not re-encode the download.
API reads and media downloads retry temporary HTTP 408/429/500/502/503/504 and
transport/body interruptions at most three times within shared deadlines.
Permanent errors, malformed successful responses and invalid raster data fail
immediately. Animated GIF/WebP validation decodes every frame. Fixed limits bound
bytes, frames, pixels, entries, blocks, pagination and whole-sync duration; see
[the bounded-sync policy](decisions/009-bounded-complete-sync.md).
Retries use the current sync's media URL and never fall back to older image bytes.
Each sync refreshes the source rather than trusting an expired URL or an old
cached response. Changes to bytes, alt text or captions affect the entry digest.

The next complete parsed/rendered Collection snapshot is staged before replacing
Astro's store. Download, decode, schema, renderer or Markdown failures preserve
all previous entries. Existing content-addressed files are retained; automatic
cache pruning is intentionally absent. Clearing Astro's cache requires a sync
before the next build. Publication and serving never require Craft credentials.
If store replacement itself fails, entry restoration is attempted. Astro 5.9.0,
5.18.2 and 6.0.0 may retain unused imports in their private append-only inventory;
the newer supported peers restore that inventory too. See the
[rollback limitation](decisions/009-bounded-complete-sync.md).

`renderers.image` is synchronous and receives `CraftImage` plus default figure
`markdown`. `undefined` keeps the default; `''` omits the image and associated
captions. An invalid return or thrown error fails the sync. Consumers choose hero
placement, caption presentation, responsive widths, loading priority and CDN
configuration. Those choices belong outside this reusable package.

The six exact advertised Astro versions pass clean tarball builds with native
images, rich captions, literal alt punctuation and local asset delivery. Tests
also cover refreshed signatures, changed bytes, complete decode failure, cache
preservation, renderer omission, code-literal protection and nested pagination.
Cache pruning and support beyond the documented safety limits remain separate work.

Sources: [Craft API](https://connect.craft.do/api-docs/documents/) and
[Astro loader reference](https://docs.astro.build/en/reference/content-loader-reference/).
