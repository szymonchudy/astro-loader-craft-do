# astro-loader-craft-do

Use Craft.do Collections as Astro Content Collections.

This integrates with **Craft Docs / craft.do**, not Craft CMS.

## Project status

Early experimental development. Szymon Chudy is building this first personally
owned OSS package to use Craft as an Astro content source and learn the full
package maintenance lifecycle. The API is evolving; no package has been
published. The initial plan leads to beta, followed by dogfooding and external
validation before considering stability.

The first implementation checkpoint sets up strict TypeScript, package output,
and a fresh Astro consumer with a synthetic validation harness. An internal
read-only Craft client is implemented and tested with synthetic HTTP responses.
Body normalization and the production Astro loader are still to be implemented.

## Try the checkpoint

```sh
pnpm install
pnpm test
pnpm dev
```

The tests verify schema-inferred types, rendering through `getCollection()` and
`render()`, explicit schema defaults, and build failure for malformed synthetic
data. No credentials are required. See [the example](examples/basic/README.md).
Client tests also check request construction, response structure, duplicate IDs,
and sanitized HTTP/network errors. These do not establish live client verification.

## Repository guide

- `src/`: reusable package code; compiled JavaScript and declarations go to `dist/`.
- `examples/basic/`: separate Astro consumer; its schema and pages belong to the app.
- `test/`: automated consumer checks using synthetic data.
- `package.json`: local scripts and the package's intended import boundary.
- `pnpm-workspace.yaml`: links the consumer to the local package.
- `START_PROMPT.md`: preserved original product and mentoring charter.
- `AGENTS.md`: concise working agreement for continuing implementation.
- `docs/STATUS.md`: current checkpoint and next slice.
- `docs/decisions/`: durable reasoning and explicitly marked proposals.

Development proceeds through research, scope and API design, implementation,
consumer verification, package validation, beta, dogfooding, and stabilization.
The current workspace check is not a packed-package or compatibility-matrix test.

Licensed under [MIT](LICENSE).
