# First pairing checkpoint

This fresh Astro app uses the package's experimental `craftCollection()` loader.
Normal usage reads the prepared Craft sample; tests substitute synthetic HTTP
responses while exercising the same public loader.

From the repository root:

```sh
pnpm install
pnpm test
pnpm example:build
pnpm example:preview
pnpm dev
```

`pnpm test` builds the package's JavaScript and declarations, builds this app,
checks the rendered HTML and schema-inferred types, and confirms malformed data
fails a real Astro build. No Craft credentials are needed for tests.

`pnpm example:build` and `pnpm dev` load the root's ignored `.env.local` into the
example process. Configure `CRAFT_API_URL`, `CRAFT_API_KEY`, and
`CRAFT_COLLECTION_ID` for your dedicated sample. `pnpm example:preview` serves
the last built site at localhost; it does not refetch Craft. To see new edits,
build again. The library itself never reads environment files.

During dev, Craft is fetched when the dev server starts and when Astro re-syncs
the Collection (for example after a content-config change). Remote edits alone
and browser reloads do not trigger fetching: this loader has no polling or
webhook refresh yet. After editing Craft, press `s` then Enter in the running
Astro dev terminal to sync the content layer without restarting the server.
Open the dev URL printed in its terminal, not a still-running static-preview URL.

Inspect `src/content.config.ts`: the application owns the Zod schema. The fixture
omits `tags`; the schema explicitly supplies `[]`. The object loader awaits
`parseData` and stores its output, so the default exists at runtime as well as
in the inferred `string[]` type. An invalid status is deliberately rejected.

`src/pages/index.astro` uses `getCollection()` and `render()`; body Markdown and
validated metadata are separate parts of an entry.

The workspace dependency resolves the package's `dist/` entry and declarations.
The package exports `craftCollection`, `CraftCollectionOptions`, and `CraftRenderers`. The
synthetic HTTP adapter stays in this app as a test harness. A workspace link
does not prove the npm tarball installs correctly. Run `pnpm test:package` from
the root for separate clean tarball installs and the verified Astro matrix; see
[the package evidence](../../docs/research/package-validation.md).

The experimental body normalizer removes Collection metadata wrappers and
structural indentation, and presents nested pages as headings and Markdown.
Callouts become semantic asides distinct from quotes; highlights become marks.
The example owns their styles. Image URLs and
Craft web-editor links remain remote; image lifetime and local link resolution
are not established. The loader fetches entries sequentially and replaces a
complete snapshot after successful validation/rendering; it does not implement
incremental fetches, automatic retries, or verified large-Collection support.
