# Multiline wrapper fence regression

Observed during the local chudy.me preview on 2026-10-04. No private content,
connection settings, identifiers, or media references are included here.

Craft can emit an opening fence on the same line as `<callout>` and append
`</callout>` to the closing fence. The previous boundary scan missed both forms
and failed with an unclosed-wrapper error. An invented fixture reproduced the
failure before the change; it now passes for callout/caption wrappers, backtick
and tilde fences, and fences following a prose paragraph. Literal wrapper and
highlight text within fenced code remains unchanged. Missing wrappers, shorter
closing delimiters, and unrelated page/card boundaries remain protected.

The change is restricted to boundary scanning in `src/normalize.ts`. It adds no
public option and contains no consumer-specific labels, styles, or schema rules.

Reproduce:

```sh
pnpm test
pnpm typecheck
node scripts/verify-package.mjs 7.3.3 --blog /path/to/chudy-me
```

Runtime: Node 26.10.0, TypeScript 6.0.3, Astro 7.3.3, Sätteri adapter 0.4.1 on
macOS arm64. The focused clean consumer verifies npm packing/install, export and
type boundaries, default/custom/blog rendering, invalid schemas, and stale-entry
removal. The prior six-version matrix is retained in package-validation.md;
this follow-up does not claim a fresh full-matrix or Node 24 validation.
