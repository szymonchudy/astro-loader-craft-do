# Initial scope and ownership

Date: 2026-10-03

Status: Accepted for the decisions below; proposals remain explicitly pending.

## Context

This is a reusable Craft Docs (`craft.do`) integration for Astro's Content
Layer and the maintainer's first personally owned OSS project. Development
should teach the maintainer the reasoning behind public API, packaging, and
release decisions. `START_PROMPT.md` remains the original project charter.

## Decision

- Keep the package name `astro-loader-craft-do` and use the personal GitHub
  account `szymonchudy` for repository ownership.
- Limit the first beta to Craft Collections. Blog-specific fields and routing
  belong to consumer applications and examples.
- Users define their own Collection metadata fields in Craft and their own
  validation schema in Astro. Sample field names must not become a loader
  allowlist or required schema. Preserve user-defined fields within the
  supported property types; document unsupported types explicitly rather than
  silently discarding them. Exact mapping remains pending raw API validation.
- User-authored Zod schemas in Astro provide inferred types and runtime
  validation. Invalid or missing required data must fail the build; the loader
  must not silently skip failures or fill in missing fields. Optional values,
  defaults, and coercion are controlled by the consumer schema.
- Favor a small public API. Add configuration only when validated use cases
  demonstrate a need; the exact API remains subject to review.
- Use pnpm for development and contributor workflows.
- License the project under MIT, copyright 2026 Szymon Chudy. This matches
  common Astro ecosystem practice and permits broad reuse, including
  commercial use and closed-source modifications, with retained notices.
- Lead public presentation with the project, clearly credit its maintainer,
  and describe the learning-in-public process and experimental maturity.
- Develop the library in public. The maintainer's separate blog remains
  private; public examples and fixtures must use deliberately created sample
  content, not copied private content or application code.
- Use a dedicated sample Collection for read-only Craft validation when
  credentials are available. Do not mutate Craft content as part of testing.
- Validate in a fresh Astro consumer application first. Introduce the
  maintainer's private blog as a dogfooding environment later.
- Aim to support the earliest practical Astro major without unnecessary
  compatibility machinery. The private blog can upgrade when needed and does
  not determine the library's minimum version.

## Alternatives considered

- Supporting arbitrary documents, a blogging framework, or a broad Craft SDK
  would expand the first release and its long-term maintenance obligations.
- Speculative filtering, transformation, and resolution options would create
  public commitments before evidence establishes their required behavior.
- npm would reduce contributor prerequisites, but pnpm matches the owner's
  explicit preference.
- Organization ownership and a separate brand are unnecessary for the current
  personally maintained project.
- Apache-2.0 provides an explicit patent grant but adds conditions that were
  not needed for the owner's preferred simple permissive licensing model.

## Consequences

The initial implementation and examples can stay focused. Dogfooding informs
the library without making the private application its architecture or test
dependency. Additional configuration and broader content support require new
evidence and deliberate scope decisions.

Repository publication is welcome during experimental development. This does
not approve an npm release or imply API stability.

## Pending decisions and validation

- Compatibility: investigate Astro 5.9 and later, including majors 6 and 7,
  using the native Markdown-rendering helper. The supported version range
  remains conditional on actual consumer builds and type checks.
- Onboarding: investigate a duplicable Craft sample document containing a
  Collection and matching Astro example. Verify that duplication preserves
  property types and item bodies, and document how to find the copied
  Collection's ID and configure its API connection. This is a proposal, not
  verified behavior. CSV import and manual setup are fallback candidates.
- An npm account still needs to be created. Name ownership requires a genuine
  package publication; no name has been reserved.

## Sources

- [Astro license](https://github.com/withastro/astro/blob/main/LICENSE)
- [HiDeoo loader license](https://github.com/HiDeoo/astro-loader-npm-packages/blob/main/LICENSE)
- [LekoArts loader license](https://github.com/LekoArts/astro-loaders/blob/main/LICENSE)
- [Craft shared-document duplication announcement](https://www.craft.do/s/fegziZPWTrBfn0)
- [Craft Collection and CSV import update](https://www.craft.do/blog/craft-update-3-3-9)
- [npm package naming policy](https://docs.npmjs.com/policies/disputes/)
