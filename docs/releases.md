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
and permission to publish. No long-lived publishing token belongs in GitHub.
The workflow is manually dispatched from main, packs once, verifies that artifact,
publishes through OIDC, and tests the installed registry version. Public GitHub
OIDC publication generates npm provenance automatically.

Update the package version and changelog before dispatching. Keep the alpha tag
until a separate beta decision. See [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/).

## First release evidence

The native-image checkpoint is `680b3ec`. The release commit, CI run, artifact
integrity, registry verification, and downstream preview are recorded after each
step succeeds. Publication is authorized by the owner's implementation request;
account authentication is completed by the owner in npm's own prompts.
