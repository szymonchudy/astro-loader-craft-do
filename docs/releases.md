# Releasing an alpha

The first release is `0.1.0-alpha.0`, under the `alpha` npm tag. Its API remains
experimental. Runtime support is Node 24 and 26; Astro support is the exact peer
union in package.json. Do not expand compatibility without consumer checks.

## First publication

1. Create the maintainer's personal npm account, enable 2FA, and run `npm login`.
2. Commit the release metadata, changelog, and tests. Push the public repository
   and wait for both Node CI jobs to pass.
3. Run `npm pack --pack-destination /tmp/craft-release` once. Verify that exact
   tarball with `pnpm test:package --tarball /tmp/craft-release/astro-loader-craft-do-0.1.0-alpha.0.tgz`.
4. Review the 15-file allowlist and package integrity. Publish those same bytes:
   `npm publish /tmp/craft-release/astro-loader-craft-do-0.1.0-alpha.0.tgz --access public --tag alpha`.
5. Run `pnpm test:package --registry`, verify the registry version/tag/integrity,
   then create `v0.1.0-alpha.0` and the matching GitHub prerelease.

The initial local publish does not generate CI provenance. An npm version cannot
be overwritten; corrections require a new alpha version.

## Subsequent releases

In npm package settings, configure a GitHub trusted publisher with owner
`szymonchudy`, repository `astro-loader-craft-do`, workflow filename `publish.yml`,
and permission to publish. This relationship is now configured. The equivalent
CLI command is `npm trust github astro-loader-craft-do --file publish.yml --repo szymonchudy/astro-loader-craft-do --allow-publish --yes`.
No long-lived publishing token belongs in GitHub.
The workflow is manually dispatched from main, packs once, verifies that artifact,
publishes through OIDC, and tests the installed registry version. Public GitHub
OIDC publication generates npm provenance automatically.

Update the package version and changelog before dispatching. Keep the alpha tag
until a separate beta decision. See [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/).

## Alpha.1 candidate and controlled publication

The owner approved `0.1.0-alpha.1` and advancing both the `alpha` and existing
`latest` tags. This remains an experimental alpha; default installation does not
create a stable API commitment.

Dispatch `publish.yml` from main with `expected_sha` set to the complete reviewed
main commit and `expected_version` set to `0.1.0-alpha.1`. The workflow rejects a
superseded candidate, packs once, retains the archive/checksum artifact, validates
those same bytes on Node 24 and 26 against every advertised Astro version, then
publishes through the configured trusted publisher. Registry integrity and OIDC
provenance are checked after publication. The maintainer advances `latest` only
after those checks; publishing uses the `alpha` tag.

Local Node 24.21.0 validation passes all six clean exact-version consumers,
including the actual blog renderer on Astro 7.3.3. An isolated live blog build
using the candidate archive passes all 12 published articles, native media,
metadata, RSS, sitemap and internal links. No private Craft data is included in
the package or public release evidence. Linux runtime evidence and registry
publication remain pending.

The current local candidate contains 19 intended files. SHA-256:
`1da94dc7736576bdb83053e2560327d08393d59c3256a9c686de17a82800f0de`. Integrity: `sha512-PaQU1W9sS+++crhDELd1D26I0phlYRrFf2W52Dhafp2U3M1G7M5xDg0M/4gDDarmTXEVaF5XbRw+tC0cVJRGiQ==`.
These identify the local pre-publication artifact; the workflow's independently
packed artifact must have its own recorded checksum before publication.

## First release evidence

The native-image checkpoint is `680b3ec`; the verified release candidate is
`d84698be5ab1618f6ef427154d9cfa4b23ddaa95`.

- [Linux CI](https://github.com/szymonchudy/astro-loader-craft-do/actions/runs/37315371764):
  Node 24 and 26, 47 portable checks and all six exact Astro consumers pass.
- Local exact-artifact matrix: all six Astro versions pass on Node 26/macOS arm64.
  The isolated private-blog renderer check also passes on Astro 7.3.3.
- Artifact: `astro-loader-craft-do-0.1.0-alpha.0.tgz`, 18,032 bytes, 15 files.
- SHA-256: `042aae1982ba956578bd52d857d90cb8f70d2ba447d0c509d775969ad7d21793`.
- Packed integrity: `sha512-LJFUwgqdLfCw8e/ZsEQM7LY5GYiphsUX+ckUTXuHw9E51umBWG0QQYems5D3Cp9kcToFQCFSwW4spKbNDebKcg==`.
- A copy of the verified archive is kept at the repository root, ignored by Git,
  and was used for publication without repacking.

- [npm package](https://www.npmjs.com/package/astro-loader-craft-do/v/0.1.0-alpha.0):
  published with `--tag alpha`; registry integrity matches the value above.
  npm also assigned `latest` on the first publication; tag removal returned HTTP
  400, matching [npm CLI issue #8490](https://github.com/npm/cli/issues/8490).
  Install the exact alpha version rather than relying on the default tag.
  All six clean registry consumers pass. The private-blog renderer also passes
  against the registry archive on Astro 7.3.3.
- [GitHub prerelease](https://github.com/szymonchudy/astro-loader-craft-do/releases/tag/v0.1.0-alpha.0):
  tag `v0.1.0-alpha.0` points to the verified loader commit above.
- Trusted publisher: GitHub, `szymonchudy/astro-loader-craft-do`, `publish.yml`.
  The initial local publication has no CI provenance; subsequent OIDC releases can.
- Blog commit: `37f52374bda97c14e02bb1c7c34e6b6118ebe971` on `develop`.
  Its dependency is exactly `0.1.0-alpha.0`; obsolete vendor archives are removed.
  A fresh blog checkout installs and passes its isolated fixture build without
  `vendor/`, a neighboring loader checkout or private settings.
- [Verified immutable preview](https://chudy-5vkc7tcxz-szymonchudy1s-projects.vercel.app):
  all five deployed checks and native-image checks pass. Deployed Mermaid diagrams
  also render and update with theme changes. All 14 article routes,
  OG assets, RSS, draft badges/exclusion and noindex are verified. The deployment
  metadata matches the blog commit above. Production was not promoted.
- [Blog CI](https://github.com/szymonchudy/chudy-me/actions/runs/37329620585): passes, including Chromium, WebKit and Storybook.
