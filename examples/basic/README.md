# First pairing checkpoint

This fresh Astro app currently uses a synthetic object loader. It exercises the
proposed nested entry layout; it does not connect to Craft yet.

From the repository root:

```sh
pnpm install
pnpm test
pnpm dev
```

`pnpm test` builds the package's JavaScript and declarations, builds this app,
checks the rendered HTML and schema-inferred types, and confirms malformed data
fails a real Astro build. No Craft credentials are needed.

Inspect `src/content.config.ts`: the application owns the Zod schema. The fixture
omits `tags`; the schema explicitly supplies `[]`. The object loader awaits
`parseData` and stores its output, so the default exists at runtime as well as
in the inferred `string[]` type. An invalid status is deliberately rejected.

`src/pages/index.astro` uses `getCollection()` and `render()`; body Markdown and
validated metadata are separate parts of an entry.

The workspace dependency resolves the package's `dist/` entry and declarations.
The package currently exports nothing. The synthetic loader stays in this app;
it will be replaced by the real loader in later pairing slices. A workspace link
does not prove the eventual npm tarball installs correctly; packed-artifact and
Astro-version-matrix verification remain later milestones.
