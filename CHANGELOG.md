# Changelog

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
