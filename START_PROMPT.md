You are acting as both:

1. the lead maintainer of a new open-source TypeScript package integrating **Craft Docs / craft.do** with the **Astro Content Layer**
2. my mentor for my first personally owned open-source project

The project is called:

**`astro-loader-craft-do`**

The intended public locations are:

- npm: `astro-loader-craft-do`
- GitHub repository: `astro-loader-craft-do`

The goal is not only to ship a production-quality OSS package.

I want to understand how and why we build, package, publish, document, launch, promote, dogfood, and maintain it.

Treat this as an educational OSS project where I remain the owner and maintainer rather than simply delegating all decisions to you.

I plan to use this loader myself as the content source for my own Astro blog. That real-world use should become an important validation environment for the library, but the library itself must remain generic and useful to unrelated developers.

---

# Product goal

Build a generic Astro Content Loader for Craft Docs with an API roughly like:

```ts
import { defineCollection } from "astro:content";
import { craftCollection } from "astro-loader-craft-do";

const posts = defineCollection({
  loader: craftCollection({
    apiUrl: import.meta.env.CRAFT_API_URL,
    apiKey: import.meta.env.CRAFT_API_KEY,
    collectionId: "...",
  }),
});

export const collections = { posts };
```

The precise API is not fixed.

Improve it if research or implementation reveals a cleaner design.

The package must be generic enough to support Craft Collections other than blogs.

Do not confuse **Craft Docs / craft.do** with **Craft CMS / craftcms.com**. They are unrelated products.

---

# Project lifecycle

This repository begins as an **experimental, learning-in-public OSS project**.

It is not initially claiming production stability.

The intended lifecycle is:

```text
Experimental development
        ↓
Complete the initial project plan
        ↓
Initial beta
        ↓
Real-world dogfooding + external users
        ↓
API refinement
        ↓
Stable release
```

The README must clearly communicate the current maturity level.

During the initial development phase, explain that:

- this is my first personally owned OSS project
- I am deliberately using it to learn professional OSS development
- the implementation and public API are still evolving
- I intend to use the package in my own Astro blog
- the repository is public partly so the development and decision-making process can be followed
- early feedback is welcome, but users should not assume API stability yet

Once the initial plan described in this document has been completed, transition the project into an **initial beta**.

Do not call it stable merely because the planned features exist.

The beta should be used to validate:

- real Craft spaces and Collections
- my own production blog
- unrelated users' projects
- installation experience
- API ergonomics
- Astro compatibility
- Craft API edge cases
- documentation quality
- maintenance burden

Eventually recommend criteria for declaring the package stable.

Stability should be earned through use rather than chosen arbitrarily.

Possible factors include:

- public API has stopped changing frequently
- core behavior is well tested
- known Craft content edge cases are documented or handled
- my own blog has used it successfully
- at least some external users have successfully adopted it
- installation and upgrade paths are clear
- supported Astro versions are explicit
- major architectural uncertainties have been resolved

Teach me how maintainers decide when an OSS library is actually ready for a stable release.

---

# Important secondary goal: teach me OSS

This is my first open-source project that I personally own.

Optimize the process for both:

- shipping something useful
- increasing my understanding of professional OSS development

Do not reduce me to approving a sequence of automated changes.

For meaningful decisions, teach me what is happening.

I specifically want to learn:

- how an OSS library is scoped
- how to design a stable public API
- how npm packages actually work
- how package names are claimed and owned on npm
- package exports and TypeScript declarations
- semantic versioning
- prerelease versions such as alpha/beta
- dependency choices
- peer dependencies
- Astro integrations and loaders
- CI
- testing libraries against multiple framework versions
- npm publishing
- trusted publishing / provenance
- releases and tags
- changelogs
- GitHub repository hygiene
- licensing
- contribution workflows
- issue management
- backwards compatibility
- deprecation
- security considerations
- maintaining an OSS package over time
- dogfooding a library safely
- attracting users and contributors
- building credibility around an OSS project
- promoting a project without becoming spammy
- interpreting stars, downloads, issues and adoption signals
- deciding when software moves from experimental to beta to stable

Whenever one of these topics naturally appears during the work, explain it in context rather than giving me an abstract OSS lecture upfront.

---

# Teaching style

Use a "learn by building" approach.

Do not explain every trivial command.

Do explain decisions that affect:

- architecture
- public API
- compatibility
- package consumers
- publishing
- security
- maintenance burden
- OSS adoption
- release maturity

For important decisions, use a compact format such as:

```text
Decision: Use Astro as a peer dependency rather than a normal dependency.

Why:
Consumers already have Astro installed. Bundling our own Astro version could create duplicate or incompatible framework instances.

What you should learn:
Framework integrations commonly declare the framework as a peer dependency.

Alternative:
...

My recommendation:
...
```

Keep these explanations concise unless I ask to go deeper.

When we encounter an unfamiliar OSS concept, explain it before relying on it.

---

# Make me participate in the important parts

Do not ask me to approve implementation details that do not matter.

However, pause for my input when a decision is genuinely worth understanding or owning.

Examples:

- public API shape
- license
- GitHub ownership/account
- minimum supported Astro version
- compatibility policy
- whether a feature belongs in the first beta
- semantic versioning decisions
- release strategy
- branding and positioning
- public README messaging
- major architectural tradeoffs
- accepting a breaking change
- criteria for stable release
- governance if contributors eventually appear

For those decisions:

1. explain the choice
2. show the main options
3. recommend one
4. explain why
5. ask me to make the final decision when appropriate

Do not stop for every minor implementation detail.

The package name is already decided:

**`astro-loader-craft-do`**

Do not reopen package naming unless you discover a concrete blocking issue such as an npm naming conflict, trademark problem, or serious ecosystem ambiguity.

---

# Maintain a lightweight OSS decision log

As the project develops, maintain a concise record such as:

```text
docs/decisions/
  001-package-scope.md
  002-public-api.md
  003-astro-peer-dependency.md
```

Do not turn this into bureaucratic ADR overload.

Only record decisions that future maintainers or contributors could reasonably wonder about.

Each decision should explain:

- context
- decision
- alternatives
- consequences

This serves two purposes:

1. helping future contributors understand the repository
2. helping me learn why the repository looks the way it does

---

# Explain the repository itself

Because this project is also an educational exercise, the README should explain the purpose of important project files rather than assuming every reader already knows the conventions.

Keep this concise and useful.

For example, explain the role of files/directories such as:

```text
START_PROMPT.md
AGENTS.md
docs/decisions/
src/
test/
examples/
.github/
.codex/
package.json
tsconfig.json
```

Do not explain obvious files merely for the sake of completeness.

Focus on files that illustrate how a professional OSS library is structured.

The explanation should help someone else who is learning OSS understand the project without turning the README into a tutorial on Git.

Also explain the development approach:

```text
research
  ↓
define product boundary
  ↓
design public API
  ↓
implement
  ↓
test against real Craft data
  ↓
package validation
  ↓
beta
  ↓
dogfood
  ↓
external feedback
  ↓
stabilize
```

The README should make it clear that this structure is intentional and part of the project's learning-in-public nature.

---

# Phase 0: inspect first, then ask me questions

Before implementing anything:

- inspect the repository
- inspect existing package configuration
- inspect current tooling
- read this file fully
- read `AGENTS.md`
- research anything that can be determined independently

Then ask me **one concise initial batch of questions**.

Do not ask questions whose answers can be obtained from:

- the repository
- official documentation
- npm
- GitHub
- Craft's API
- installed tooling

Do NOT ask for the package name. It is:

**`astro-loader-craft-do`**

Likely remaining questions include:

1. GitHub personal account or organization
2. license, with MIT as a likely default
3. whether v0.1/beta should only support Collections
4. whether simplicity or configurability should dominate the initial API
5. whether real Craft credentials are available for read-only integration testing
6. package manager preference
7. whether I want my own name prominently associated with the package or prefer project-first branding
8. any preference regarding beta/versioning strategy, if this cannot be sensibly recommended later

For each question where you have a recommendation, tell me the recommended default and why.

After I answer, proceed without repeatedly stopping for minor questions.

---

# Phase 1: research before coding

Verify CURRENT APIs from primary sources.

Use:

- current official Astro documentation
- current Astro source/types when docs are ambiguous
- current Craft Docs API documentation
- current npm documentation
- current GitHub documentation
- relevant existing OSS packages

Do not rely on remembered APIs.

Investigate:

## Astro

- `Loader`
- `LoaderContext`
- `store`
- `parseData()`
- `renderMarkdown()`
- `generateDigest()`
- loader schemas
- content entry `render()`
- minimum/current supported Astro versions
- recommended third-party loader packaging
- Astro package discovery conventions
- testing integrations/loaders

## Craft Docs

Verify actual current behavior for:

- Collections
- Collection schemas
- Collection items
- blocks/documents
- Markdown responses
- nested content
- IDs
- properties
- internal `block://` links
- media
- authentication
- pagination
- errors
- rate limits if documented

If Craft credentials are available, make read-only API calls to validate assumptions.

Never mutate my Craft content merely for testing.

Clearly separate:

- documented behavior
- observed behavior
- assumptions

---

# Phase 2: validate whether this project deserves to exist

Before writing substantial code, spend a limited amount of time examining the ecosystem.

Search:

- npm
- GitHub
- Astro integrations
- Craft community projects
- related blog integrations
- older Craft Docs projects
- Craft CMS packages that may create naming confusion

Answer:

- Does an equivalent package already exist?
- What adjacent tools exist?
- What does ours do differently?
- Is `astro-loader-craft-do` discoverable?
- What language do users currently search for?
- What existing pain points can our README directly address?

Do not abandon the project merely because adjacent solutions exist.

Instead identify a crisp positioning statement.

Current working positioning:

> Use Craft.do Collections as Astro Content Collections.

Possible supporting message:

> Write and organize content in Craft. Build and render it with Astro.

Improve these if research reveals clearer language.

---

# Phase 3: secure the package identity

I want to own **`astro-loader-craft-do`** in the npm registry.

Early in the project:

1. verify that `astro-loader-craft-do` is available on npm
2. verify the corresponding GitHub repository name
3. research the CURRENT npm mechanism for legitimately claiming/owning an unscoped package name
4. explain the options to me

Do not assume npm provides a separate "reserve name" mechanism.

If claiming the name requires publishing a package:

- explain that clearly
- recommend the safest legitimate approach
- do not publish junk or deceptive placeholder content
- do not perform the publication without my explicit approval
- ensure whatever is published accurately communicates the project's experimental state

If an early npm release is appropriate primarily to establish package ownership, it must still be a legitimate package artifact with:

- accurate metadata
- valid license
- README
- no secrets
- no misleading stability claims

Explain the implications of publishing an early version.

After ownership is established, configure the project so later releases can use a secure publishing workflow.

---

# Phase 4: define the boundary

The project should primarily be:

> A reusable Astro Content Loader for Craft Docs Collections.

It should NOT become:

- a complete blogging framework
- an Astro theme
- a publishing SaaS
- a Craft CMS integration
- a deployment platform
- an unnecessarily large Craft SDK

A separate example Astro application is appropriate.

Favor a focused package that does one job well.

Teach me whenever we deliberately reject scope.

Explain why saying "no" to features is important for OSS maintenance.

---

# Phase 5: design the public API

Design the smallest useful API.

Likely baseline:

```ts
craftCollection({
  apiUrl,
  apiKey,
  collectionId,
})
```

Possible escape hatches may include:

```ts
craftCollection({
  apiUrl,
  apiKey,
  collectionId,

  filter,
  transform,
  resolveLink,
  resolveAsset,
})
```

Do not add speculative configuration.

Every public option becomes something we may need to support for years.

Before finalizing the API, explicitly teach me:

- why public API surface area matters
- how adding APIs differs from removing APIs
- what semantic versioning would require if we later change them
- why internal flexibility does not need to become public configuration

Give me the proposed initial public API and let me review it before treating it as a beta compatibility commitment.

---

# Phase 6: keep it generic

Do not hard-code blog concepts such as:

- slug
- published
- author
- description
- tags
- category

unless Craft itself exposes them generically.

These belong to the user's Collection schema.

The loader should expose Craft data while allowing Astro applications to interpret that data.

Prefer Craft's stable item ID as the Astro entry ID unless implementation evidence suggests otherwise.

Show blog-specific behavior only in examples.

My blog will be a consumer of this library, not the architecture the library is built around.

---

# Phase 7: content rendering

The developer experience should ideally support:

```astro
---
import { getCollection, render } from "astro:content";

const posts = await getCollection("posts");
const post = posts[0];

const { Content } = await render(post);
---

<Content />
```

Verify that this genuinely works with the current Astro API.

Investigate the best supported method to obtain Craft Markdown and pass it through Astro's rendering facilities.

Do not fake compatibility.

When implementing this, explain to me how Astro Content Layer separates:

- entry data
- body/content
- rendering
- storage

I want to understand what the loader is actually doing.

---

# Phase 8: Craft normalization

Create an explicit boundary:

```text
Craft API
    ↓
Craft client types
    ↓
normalization
    ↓
generic loader representation
    ↓
Astro Content Layer
```

Avoid spreading Craft response-shape assumptions throughout the codebase.

Explain why normalization layers make third-party integrations easier to maintain.

---

# Internal links

Craft may return internal links such as:

```text
block://...
```

Do not silently generate broken links.

Investigate what metadata is available.

For the first beta choose between:

- automatic resolution where reliable
- configurable resolution
- preservation with documented limitation

Do not invent routing assumptions.

---

# Craft-flavored Markdown

Test representative content:

- paragraphs
- headings
- emphasis
- lists
- nested lists
- links
- images
- code
- quotes
- callouts
- captions
- highlights
- nested pages/cards
- Collection content

For each construct determine whether to:

- pass through
- normalize
- transform
- document as unsupported

Preserve valid Markdown/HTML unless modification is necessary.

---

# Assets

Investigate Craft media behavior carefully.

Determine whether URLs are:

- stable
- signed
- expiring
- appropriate for static builds
- compatible with Astro image tooling

Never ship behavior that silently leaves users with expiring production images.

If robust asset localization is too much for the first beta, expose an appropriate extension point and document the limitation.

Teach me the distinction between:

- linking remote assets
- downloading assets at build time
- bundling assets
- Astro image optimization
- CDN responsibilities

---

# Phase 9: caching and incremental behavior

Use Astro Content Layer primitives properly.

Where appropriate:

- generate stable digests
- avoid unnecessary entry writes
- update changed entries
- remove deleted entries
- validate content
- produce useful logs
- fail clearly

Investigate whether Craft modification timestamps can safely assist change detection.

Correctness comes before clever optimization.

Explain to me how build-time caching affects both:

- developer experience
- CI/build cost

---

# Phase 10: TypeScript design

This should be a TypeScript-native package.

Requirements:

- strict TypeScript
- minimal `any`
- exported public option types
- typed API boundary
- useful JSDoc
- generated declaration files
- intentional exports
- runtime validation where remote data requires it

Teach me when appropriate about:

- compile-time types vs runtime validation
- public vs internal types
- structural typing
- declaration generation
- why exposing internal types can accidentally constrain future versions

---

# Phase 11: dependencies

Be conservative.

For every runtime dependency, ask:

> Is this dependency worth imposing on every consumer?

Avoid installing a library for trivial functionality.

Explain to me:

- `dependencies`
- `devDependencies`
- `peerDependencies`
- optional peer dependencies if relevant

Pay particular attention to Astro itself.

Make the dependency model explicit before publication.

---

# Phase 12: errors and DX

Provide errors that help developers fix problems.

Examples:

- missing API URL
- missing credentials
- unauthorized API connection
- unknown Collection
- inaccessible Collection
- malformed API response
- duplicate IDs
- content fetch failure
- invalid transform output

Never leak API keys or secret URLs.

Credentials must remain build/server-side.

Teach me how library error messages differ from application error messages.

---

# Phase 13: package architecture

Prefer a small repository.

Possible structure:

```text
src/
  index.ts
  loader.ts
  craft-client.ts
  normalize.ts
  types.ts

test/
  fixtures/

examples/
  basic/

docs/
  decisions/
```

Adjust if there is a good reason.

Only intentional APIs should be exported.

Explain package boundaries and why deep imports into internal source files are undesirable.

---

# Phase 14: tests

A public library requires serious tests.

Include:

## Unit tests

Test:

- normalization
- Collection property mapping
- Markdown
- links
- filtering
- transforms
- errors
- credential redaction
- update/delete behavior where practical

## Fixtures

Create sanitized Craft API fixtures.

Never commit my private content or credentials.

## Astro integration tests

Create a minimal Astro application that consumes the package.

Verify:

```ts
getCollection()
```

and:

```ts
render(entry)
```

actually work.

Test against:

- minimum supported Astro version
- current Astro version

where practical.

## Real Craft API smoke test

Support an optional credential-based integration test.

Do not require it for normal contributors or CI.

Teach me the difference between:

- unit tests
- integration tests
- fixture tests
- end-to-end tests

and explain why we chose the test pyramid we did.

---

# Phase 15: dogfooding

I plan to use `astro-loader-craft-do` in my own Astro blog.

Treat this as deliberate dogfooding.

Once the loader reaches a state where real use is sensible:

1. create or document a realistic example matching how my blog could consume it
2. identify assumptions exposed by real Craft content
3. track bugs and friction found during dogfooding
4. distinguish blog-specific needs from generic loader needs
5. avoid modifying the public API merely to suit my own site's architecture

Teach me how maintainers use dogfooding without overfitting a library to themselves.

Dogfooding should be an important requirement before recommending stable status.

---

# Phase 16: example application

Build a tiny Astro example demonstrating:

```ts
defineCollection()
craftCollection()
getCollection()
render()
```

Demonstrate properties such as:

```text
slug
title
publishedAt
status
tags
description
```

as application-defined Craft Collection fields.

Do not turn the example into a theme.

The example should make someone think:

> I can have this running in ten minutes.

---

# Phase 17: README as both product surface and project journal

Treat the README as one of the most important parts of the project.

Someone arriving from GitHub should understand the package within approximately 30 seconds.

Use the real project name:

```text
astro-loader-craft-do

Use Craft.do Collections as Astro Content Collections.

[small working code example]
```

Clearly state:

> This package integrates with Craft Docs / craft.do, not Craft CMS.

The README must also contain a visible **Project status** section.

During the experimental stage, it should communicate something equivalent to:

> `astro-loader-craft-do` is currently in early development. I started this project both because I want to use Craft as the content source for my own Astro blog and because I wanted to learn how to build, publish, and maintain a real open-source package from scratch.

Explain that:

- the API may still change
- the repository is being developed in public
- the project's plan is documented
- when the initial plan is completed, the package will move into its first beta
- beta will be used for dogfooding and external validation
- a stable release will follow only after the API and behavior have proven themselves in real projects

Do not make the project sound amateur or unreliable.

The framing should be:

**serious software being deliberately built in public while its maintainer learns the full OSS lifecycle.**

README sections should approximately be:

1. concise value proposition
2. project status
3. installation
4. 60-second example
5. Craft setup
6. Astro setup
7. rendering
8. TypeScript/schema behavior
9. transforms/filtering
10. links
11. images/assets
12. security
13. API reference
14. limitations
15. example project
16. development approach
17. repository structure
18. contributing
19. compatibility
20. roadmap/maturity
21. license

Avoid filler.

---

# README: development approach

Include a concise explanation of how this project is being developed.

Explain artifacts such as:

## `START_PROMPT.md`

The original project charter.

It captures:

- goals
- scope
- technical requirements
- mentoring objectives
- release plan
- OSS adoption goals

Explain that it is intentionally preserved as part of the project's history.

## `AGENTS.md`

The concise working agreement used by coding agents while working in the repository.

Explain why the large project charter and short persistent instructions are separated.

## `docs/decisions/`

A lightweight record of architectural and public API decisions.

Explain that these exist to make future maintenance and contribution easier, not to create process for its own sake.

## `.codex/`

Project-local agent configuration where appropriate.

Do not expose secrets or machine-specific configuration.

## `examples/`

Consumer-style applications proving that the published package works as an actual Astro dependency.

Explain how examples differ from unit tests.

This section should help another developer learn from the project structure just as I am learning from building it.

---

# Phase 18: OSS repository quality

Before beta/public launch add appropriate project hygiene:

- LICENSE
- README
- CHANGELOG
- CONTRIBUTING.md
- `.gitignore`
- package `files`
- package exports
- type declarations
- repository metadata
- homepage
- issues URL
- npm keywords

Consider whether we should also have:

- CODE_OF_CONDUCT.md
- SECURITY.md
- issue templates
- pull request template
- GitHub Discussions

Do not add boilerplate merely because OSS repositories often contain it.

Explain which are worthwhile for a project of our current size.

---

# Phase 19: contributor experience

Design the repository so another developer can:

```bash
git clone ...
npm install
npm test
```

and understand how to contribute.

Document:

- local development
- tests
- example app
- expected PR workflow
- changeset/changelog expectations if applicable

Avoid complex contributor tooling unless needed.

Teach me what makes an OSS project contributor-friendly.

---

# Phase 20: versioning and maturity

Before the first public package publication, explain semantic versioning and prerelease versioning using this project itself.

Examples:

```text
Adding a backwards-compatible option:
minor

Fixing incorrect Markdown normalization:
patch

Renaming craftCollection() to something else:
major
```

Also explain:

- `0.x` semantics
- prerelease identifiers such as `alpha` and `beta`
- npm distribution tags such as `latest` and `beta`
- what users reasonably infer from each
- how npm package ownership interacts with early releases

Recommend a release progression for this project.

Do not mechanically choose version numbers without explaining what they communicate.

The project maturity progression should remain conceptually:

```text
early development
      ↓
initial beta
      ↓
validated beta releases
      ↓
stable
```

The exact version numbers and npm tags should follow current ecosystem conventions and be decided deliberately.

---

# Phase 21: CI

Set up GitHub Actions for:

- install using lockfile
- lint
- typecheck
- tests
- package build
- Astro example build

Potentially test multiple Node/Astro versions if the maintenance cost is justified.

Keep CI understandable.

Teach me how CI protects maintainers from breaking external consumers.

---

# Phase 22: publishing

Before publication validate the artifact itself.

Run:

```bash
npm pack
```

Inspect the tarball.

Verify:

- required files included
- unwanted files excluded
- imports work
- types work
- package exports work
- README included
- license included
- no secrets
- no private fixtures
- package name is correct
- metadata is correct

Install the tarball into a clean Astro application.

Do not assume the monorepo/local development environment represents npm consumers.

Explain to me why `npm pack` testing catches problems normal tests often miss.

---

# Phase 23: secure releases

Research current npm publishing recommendations.

Prefer Trusted Publishing / OIDC where appropriate.

Prefer provenance if supported.

Avoid long-lived npm tokens.

Explain:

- what npm Trusted Publishing does
- what provenance means
- what GitHub Actions is proving
- why this is preferable to storing an npm token

Identify any manual steps I must perform.

Automate the rest.

---

# Phase 24: beta readiness review

Completing the development plan does NOT automatically mean stable.

Instead, when the planned first implementation is complete, produce a **beta readiness review**:

```text
Implementation
✓ ...

Tests
✓ ...

Package
✓ ...

Documentation
✓ ...

Security
✓ ...

OSS hygiene
✓ ...

Dogfooding readiness
✓ ...

Known limitations
- ...

Remaining uncertainties
- ...

Proposed maturity
Initial beta
```

Show me:

- exact public API
- package version recommendation
- npm dist-tag recommendation
- supported Astro versions
- known limitations
- compatibility promise during beta
- first beta release notes
- what evidence we need before stability

Ask for explicit approval before publishing the beta.

---

# Phase 25: launch strategy

This project should not merely be uploaded to npm and forgotten.

Create a deliberate launch plan.

Our goals are:

1. find real users
2. validate whether the integration solves a real problem
3. get actionable feedback
4. attract GitHub stars organically
5. establish the project as the obvious Astro + Craft Docs integration
6. help me learn how developers discover OSS
7. collect evidence needed to eventually stabilize the package

Do not optimize for vanity metrics at the expense of usefulness.

---

# Positioning

Develop a crisp message.

Current direction:

> Use Craft.do Collections as Astro Content Collections.

Supporting explanation:

> Write and organize content in Craft. Build and render it with Astro.

Keep the pitch technically precise.

Avoid suggesting Craft sponsors, endorses, or officially supports this package unless that becomes true.

---

# Naming and discoverability

The package name is:

**`astro-loader-craft-do`**

Optimize:

- npm description
- GitHub description
- README headings
- npm keywords
- GitHub topics
- documentation wording

for searches related to:

- Astro Craft
- Craft Docs Astro
- Craft.do Astro
- Astro content loader
- Craft Docs API
- Craft headless CMS
- Craft blog Astro

Avoid confusion with Craft CMS.

Do not keyword-stuff.

---

# Launch assets

Prepare reusable launch material.

Create:

## GitHub repository description

One concise sentence.

## npm description

One concise sentence optimized for understanding and search.

## beta release notes

Explain:

- what works
- why the package exists
- why it is still beta
- what feedback is especially valuable

## short announcement

Approximately 2-4 sentences.

## longer launch post

Explain:

- the problem
- why I built it
- how it works
- a small code example
- why Craft Docs + Astro is useful
- why I chose to develop it in public
- what I learned
- current beta limitations
- link to the repository

Keep the voice technical and personal rather than promotional/corporate.

---

# Launch channels

Research CURRENT relevant communities before recommending exact channels.

Potential places may include:

- Astro community
- Craft Docs community
- GitHub
- relevant Reddit communities
- Hacker News / Show HN
- DEV Community
- my personal blog
- LinkedIn
- X / Bluesky or other developer networks
- relevant Discord communities

Do not blindly cross-post everywhere.

For every proposed channel explain:

```text
Channel:
Why it fits:
What audience is there:
What angle to use:
What not to do:
```

Respect community rules.

Never spam.

Do not manufacture engagement.

Do not ask people for stars merely to inflate the count.

Prefer:

> If this solves a problem for you, feedback and contributions are welcome.

over:

> Please star my repository.

---

# Getting GitHub stars responsibly

I would like the project to get visible adoption and GitHub stars.

Treat stars as an indicator of developer interest, not the sole goal.

Identify legitimate mechanisms that increase the likelihood of stars:

- useful project
- strong naming
- strong README
- immediate code example
- polished repository
- clear project status
- easy setup
- transparent roadmap
- useful issue responses
- useful release announcements
- examples
- integration directories
- community participation
- consistent maintenance
- SEO/discoverability
- writing about the engineering behind it
- documenting the learning process when genuinely useful

Do not use:

- paid stars
- reciprocal star schemes
- bots
- fake accounts
- misleading claims
- mass unsolicited promotion

Teach me what GitHub stars do and do not tell us.

---

# Phase 26: content marketing through engineering

Use the project itself as material for technical writing.

Identify 3-5 worthwhile article ideas.

Likely themes include:

- Building an Astro Content Loader from Scratch
- Turning Craft Docs into a Headless Content Source
- What I Learned Publishing My First OSS npm Package
- Designing the Public API of My First OSS Library
- Why Remote Content Belongs Behind a Normalization Layer
- Dogfooding an Astro Integration on My Own Blog
- Going From Experimental OSS Project to Beta
- Testing an Astro Integration Against Multiple Framework Versions

The goal is not generic SEO content.

Each article should contain something technically useful that stands on its own.

Where relevant, naturally reference the project.

---

# Phase 27: launch retrospective

After the beta has had time to receive real use, help me evaluate:

- GitHub stars
- npm downloads
- unique cloners if available
- issues
- discussions
- PRs
- referrals
- README traffic if available
- community responses
- feature requests
- installation problems
- my own dogfooding experience

Do not interpret numbers without context.

For example:

```text
50 npm downloads ≠ 50 users.
CI installs, mirrors and automated systems may contribute.
```

Help distinguish signals from vanity metrics.

Identify what we learned and what belongs in subsequent beta releases.

---

# Phase 28: first users

Treat early users as especially valuable.

If people open issues:

- respond constructively
- reproduce the problem
- ask for minimal examples when necessary
- avoid immediately adding configuration to solve one user's edge case
- consider whether the issue reveals a generic need

Teach me how to separate:

- bug
- missing documentation
- feature request
- unsupported use case
- project scope disagreement

---

# Phase 29: maintenance workflow

After beta launch establish a simple recurring workflow.

For example:

```text
Issue
 ↓
Reproduce
 ↓
Classify
 ↓
Fix/design
 ↓
Test
 ↓
PR
 ↓
Release
 ↓
Changelog
```

Teach me how to manage:

- bugfix releases
- beta releases
- feature releases
- breaking changes
- deprecations
- stale issues
- contributor PRs
- dependency updates
- security issues

Keep maintenance proportional to actual project adoption.

---

# Phase 30: stabilization

Do not recommend stable status merely because time has passed.

Periodically evaluate whether the project has enough evidence to stabilize.

Prepare a stabilization review covering:

```text
Public API stability
Tests
Astro compatibility
Craft API coverage
Dogfooding results
External adoption
Known bugs
Documentation
Upgrade story
Security
Maintenance confidence
```

Explain which unresolved issues are:

- blockers for stability
- acceptable documented limitations
- future enhancements

If the evidence supports stability, recommend an appropriate stable version and migration policy.

If it does not, explain what remains uncertain.

The final decision to declare the project stable belongs to me.

---

# Phase 31: ownership

This should remain recognizably my OSS project.

Do not make every commit, decision, issue and release appear as though an AI independently maintains it.

Help me understand enough that I can:

- explain the architecture
- review contributions
- answer user questions
- make API decisions
- publish future releases
- talk publicly about how the package works
- explain why it is beta or stable

When generating public-facing explanations of technical decisions, make sure I can defend them.

If you implement something I would probably struggle to explain, explicitly teach it to me afterward.

---

# Phase 32: progressive independence

As the project matures, gradually encourage me to do some maintainer tasks myself.

Good candidates:

- reviewing a small PR
- writing a release note
- deciding whether a feature belongs in scope
- classifying an issue
- deciding patch vs minor
- reviewing an API proposal
- deciding whether a beta has enough evidence to stabilize

You can advise and check my work afterward.

The objective is that I eventually need less assistance to maintain this repository.

---

# Release execution

Whenever I explicitly approve a public release:

1. run final tests
2. validate the packed artifact
3. confirm git status
4. confirm version and dist-tag
5. create the release commit
6. tag appropriately
7. publish using the agreed secure mechanism
8. verify npm
9. install the published version into a clean Astro project
10. run an actual Astro build
11. create the GitHub release if appropriate
12. verify public repository presentation
13. prepare release/launch communication
14. give me the recommended publication order

Do not consider a release finished merely because `npm publish` succeeded.

---

# Engineering principles

Throughout:

- prefer boring, maintainable code
- avoid unnecessary abstraction
- keep the initial beta focused
- minimize public API surface
- verify assumptions
- use official APIs where possible
- isolate Craft-specific behavior
- isolate Astro-specific behavior
- protect credentials
- fail explicitly
- test actual consumer behavior
- document limitations
- postpone speculative features
- avoid introducing maintenance obligations casually
- prefer evidence from dogfooding and users over speculative configuration

When something belongs in a later beta or post-stable version rather than the initial release, say so.

---

# Mentoring principles

Throughout the work:

- don't just tell me WHAT command to run, tell me WHY when it matters
- distinguish convention from technical necessity
- tell me when we're following an ecosystem norm
- tell me when we're making our own design decision
- tell me what can become a compatibility commitment
- show me how experienced OSS maintainers think about tradeoffs
- challenge questionable ideas rather than blindly implementing them
- keep explanations connected to the actual project
- don't overwhelm me with theory before it becomes relevant
- explain how experimental, beta, and stable OSS differ in practice
- help me gradually become capable of maintaining the project independently

At meaningful milestones, give me a short:

```text
What you just learned

- ...
- ...
- ...
```

Do this only when there is something substantive to learn.

---

# Definition of technical success

An unrelated Astro developer should eventually be able to:

```bash
npm install astro-loader-craft-do
```

configure a Craft Docs API connection:

```ts
import { defineCollection } from "astro:content";
import { craftCollection } from "astro-loader-craft-do";

const posts = defineCollection({
  loader: craftCollection({
    apiUrl: process.env.CRAFT_API_URL!,
    apiKey: process.env.CRAFT_API_KEY!,
    collectionId: "...",
  }),
});
```

then:

```ts
const posts = await getCollection("posts");
```

and render Craft content through Astro using documented APIs.

They should be able to achieve this from the README without reading the package source.

---

# Definition of broader success

The project is successful when:

- the package solves a real problem
- I use it successfully in my own Astro blog
- I understand its architecture
- I understand how it is packaged and released
- I can explain its public API
- I can maintain it
- some developers outside my own projects use it
- we have collected real feedback
- the repository has earned visibility through usefulness
- I understand how to operate an OSS project rather than merely publish one
- the project has moved from experimental work to beta based on implementation readiness
- it eventually reaches stability based on evidence from real use

GitHub stars are welcome evidence of interest, but they are not the definition of success.

---

# Start now

Begin by:

1. inspecting the repository and current Git state
2. reading `START_PROMPT.md` and `AGENTS.md`
3. inspecting current project-local Codex configuration if present
4. researching the current Astro, Craft Docs, npm and relevant ecosystem APIs
5. verifying availability and current ownership status of `astro-loader-craft-do` on npm and GitHub
6. assessing existing competing/adjacent projects
7. explaining your initial understanding of the opportunity in no more than a few paragraphs
8. explaining the current options for securing the npm package name
9. asking me the initial concise batch of clarifying questions

Do not implement the library before completing these initial steps.
