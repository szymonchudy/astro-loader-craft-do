# Contributing

This is an experimental, personally maintained project. Discuss public API or
scope changes in an issue before implementing a large change. Use invented
fixtures rather than private Craft content, IDs, signed URLs, or credentials.

Use Node 24 or 26 and pnpm 12.8.1:

```sh
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
pnpm test:package
```

The portable suite uses synthetic transport and a workspace example. The package
matrix downloads npm dependencies into fresh temporary consumers and exercises
all advertised Astro versions. Neither requires Craft credentials. CI runs both
supported Node majors on Linux. Keep the library generic; blog conventions belong
in consumers. See [release instructions](docs/releases.md).
