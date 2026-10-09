# Bounded, complete synchronization

Accepted for the owner-approved production-readiness alpha on 2026-10-09.
The public configuration, consumer schemas, optional separator renderer, exact
Astro peers, and Node 24/26 policy remain unchanged.

A successful HTTP response is not proof of complete content. Structured item
roots must have the Collection-item type and a children array. Empty or
metadata-only Markdown is rejected when structured descendants demonstrate
content; a genuinely empty item remains valid. This check precedes consumer
callbacks, which may intentionally omit content. Reserved Craft wrapper tags
cannot escape validation through the optional separator renderer's HTML handling.

The loader stages the complete collection, then replaces the store only after
all downloads, validation, normalization, schema parsing and rendering succeed.
A failure retains the previous collection. Old content-addressed image files
remain usable; unsuccessful atomic cache writes remove their temporary files.

## Internal resource policy

These are safety limits, not new consumer options:

| Resource | Limit |
| --- | --- |
| Collection entries | 500 |
| Received structured blocks across one sync | 25,000 |
| Continuation pages per individual paginated operation | 100 |
| Each API response | 8 MiB |
| Total normalized Markdown, including callback output | 32 MiB |
| Each downloaded media file | 32 MiB |
| Frames per media file | 200 |
| Total decoded pixels across all frames of one media file | 40,000,000 |
| Whole sync | 5 minutes |
| Each API operation, including all retries/body reads | 20 seconds |
| Each media operation, including retries/decode | 30 seconds |
| Attempts for a request | 3 |

Reads remain sequential. Response bodies are counted incrementally and canceled
on overflow. Pagination cannot evade limits using a new cursor each time. Each Collection
listing and root/subtree traversal gets its own continuation allowance; independent
operations do not consume one another's allowance. The whole-sync deadline and
block budget still accumulate across all operations.
Markdown pages are normalized incrementally so retained source strings cannot
grow with every page before the Markdown budget is checked.

API and media requests retry transport/body interruptions and HTTP
408/429/500/502/503/504. Backoff starts at 250 ms then 750 ms. A valid Retry-After
is respected only if it fits the remaining deadline; otherwise the operation
fails immediately. Permanent HTTP failures, malformed success responses,
oversized responses and invalid raster data are never retried. Errors omit
remote URLs, IDs, credentials, payloads and upstream causes.

Deadlines propagate cancellation and bound awaited transports/hooks, including
custom implementations that ignore AbortSignal. Native decoding also receives
Sharp's processing timeout. JavaScript callbacks remain synchronous user code;
as with other in-process hooks, a callback that blocks the event loop cannot be
preempted by a timer. Deadline checks prevent a late callback from committing.

GIF and WebP validation decodes every frame, not just the first. The cache stores
the exact original bytes after validation, preserving animation. Sharp is pinned
to 0.35.5, the patched version in the maintainer's
[September advisory](https://github.com/lovell/sharp/security/advisories/GHSA-wq5f-xc86-pv6w).

## Alternatives and evidence

Unbounded requests risk hung builds and resource exhaustion. Configurable limits
would enlarge the experimental API without a demonstrated consumer need.
Serving old bytes after a failed download could conceal broken source content.
The chosen policy fails explicitly and retains only the last complete snapshot.

Synthetic regressions first reproduced the empty-body, root and wrapper defects.
Additional tests demonstrate first-frame decode success followed by later-frame
failure in GIF and WebP, byte identity, finite unique-cursor pagination,
incremental byte caps, Retry-After, interrupted-body retries, cancellation,
frame/pixel limits and cache cleanup. No live/private content is needed.
