You are acting as both:

1. the lead maintainer of a new open-source TypeScript package integrating **Craft Docs** with the **Astro Content Layer**
2. my mentor for my first personally owned open-source project

The goal is not only to ship a production-quality OSS package.

I want to understand how and why we build, package, publish, document, launch, promote, and maintain it.

Treat this as an educational OSS project where I remain the owner and maintainer rather than simply delegating all decisions to you.

The project should become a real public package on GitHub and npm.

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
- package exports and TypeScript declarations
- semantic versioning
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
- attracting users and contributors
- building credibility around an OSS project
- promoting a project without becoming spammy
- interpreting stars, downloads, issues and adoption signals

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

- package name
- repository name
- public API shape
- license
- minimum supported Astro version
- compatibility policy
- whether a feature belongs in v0.1
- semantic versioning decisions
- release strategy
- branding and positioning
- public README messaging
- major architectural tradeoffs
- accepting a breaking change
- governance if contributors eventually appear

For those decisions:

1. explain the choice
2. show the main options
3. recommend one
4. explain why
5. ask me to make the final decision when appropriate

Do not stop for every minor implementation detail.

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

This will also help me learn why the repository looks the way it does.

---

# Phase 0: inspect first, then ask me questions

Before implementing anything:

- inspect the repository
- inspect existing package configuration
- inspect current tooling
- research anything that can be determined independently

Then ask me **one concise initial batch of questions**.

Do not ask questions whose answers can be obtained from:

- the repository
- official documentation
- npm
- GitHub
- Craft's API
- installed tooling

Likely questions include:

1. npm package name/scope
2. GitHub account or organization
3. license, with MIT as a likely default
4. whether v0.1 should only support Collections
5. whether simplicity or configurability should dominate the initial API
6. whether real Craft credentials are available for read-only integration testing
7. package manager preference
8. whether I want my own name prominently associated with the package or prefer project-first branding

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
- Is the package name discoverable?
- What language do users currently search for?
- What existing pain points can our README directly address?

Do not abandon the project merely because adjacent solutions exist.

Instead identify a crisp positioning statement.

Example:

> Use Craft Docs Collections as typed Astro Content Collections.

Aim for a one-sentence explanation that a developer understands immediately.

Record this positioning for later README and launch work.

---

# Phase 3: define the boundary

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

# Phase 4: design the public API

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

Give me the proposed v0.1 API and let me review it before treating it as stable.

---

# Phase 5: keep it generic

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

---

# Phase 6: content rendering

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

# Phase 7: Craft normalization

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

For v0.1 choose between:

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

If robust asset localization is too much for v0.1, expose an appropriate extension point and document the limitation.

Teach me the distinction between:

- linking remote assets
- downloading assets at build time
- bundling assets
- Astro image optimization
- CDN responsibilities

---

# Phase 8: caching and incremental behavior

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

# Phase 9: TypeScript design

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

# Phase 10: dependencies

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

# Phase 11: errors and DX

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

# Phase 12: package architecture

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

# Phase 13: tests

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

# Phase 14: example application

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

# Phase 15: README as a product surface

Treat the README as one of the most important parts of the project.

Someone arriving from GitHub should understand the project within approximately 30 seconds.

Above the fold, aim for:

```text
astro-loader-craft-do

Use Craft Docs Collections as Astro Content Collections.

[small working code example]
```

Clearly state:

> Craft Docs, not Craft CMS.

README sections should approximately be:

1. concise value proposition
2. installation
3. 60-second example
4. Craft setup
5. Astro setup
6. rendering
7. TypeScript/schema behavior
8. transforms/filtering
9. links
10. images/assets
11. security
12. API reference
13. limitations
14. example project
15. contributing
16. compatibility
17. license

Avoid filler.

Teach me how README quality affects:

- adoption
- GitHub stars
- npm conversion
- support burden
- contributor quality

---

# Phase 16: OSS repository quality

Before public launch add appropriate project hygiene:

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

# Phase 17: contributor experience

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

Teach me what makes an OSS project "contributor friendly."

---

# Phase 18: semantic versioning

Before the first release, explain semantic versioning using this project itself.

Give examples such as:

```text
Adding a backwards-compatible option:
minor

Fixing incorrect Markdown normalization:
patch

Renaming craftCollection() to craftDocsCollection():
major
```

Discuss whether `0.x` versions should be treated as unstable and what compatibility promise we want to communicate.

Recommend a practical policy for this project.

Do not use version numbers mechanically without explaining what they signal.

---

# Phase 19: CI

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

# Phase 20: publishing

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
- package name available
- metadata correct

Install the tarball into a clean Astro application.

Do not assume the monorepo/local development environment represents npm consumers.

Explain to me why `npm pack` testing catches problems normal tests often miss.

---

# Phase 21: secure releases

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

# Phase 22: release readiness review

Before making the project public, produce:

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

Launch
✓ ...

Remaining decisions
- ...

Proposed version
v0.1.0
```

Then show me:

- package name
- repository name
- package description
- GitHub description
- keywords
- public API
- compatibility policy
- known limitations
- release notes

Ask for my explicit approval before irreversible publishing actions.

---

# Phase 23: launch strategy

This project should not merely be uploaded to npm and forgotten.

Create a deliberate launch plan.

Our goals are:

1. find real users
2. validate whether the integration solves a real problem
3. get actionable feedback
4. attract GitHub stars organically
5. establish the project as the obvious Astro + Craft Docs integration
6. help me learn how developers discover OSS

Do not optimize for vanity metrics at the expense of usefulness.

---

# Positioning

Develop a crisp message.

Potential direction:

> Use Craft Docs Collections as Astro Content Collections.

Supporting explanation:

> Write and organize content in Craft. Build and render it with Astro.

Keep the pitch technically precise.

Avoid suggesting Craft sponsors, endorses, or officially supports this package unless that becomes true.

---

# Naming and discoverability

Research how developers actually search for this functionality.

Consider search terms such as:

- Astro Craft
- Craft Docs Astro
- Astro content loader
- Craft Docs API
- Craft headless CMS
- Craft blog Astro

Avoid confusion with Craft CMS.

Optimize:

- npm package name
- GitHub repository name
- description
- README headings
- npm keywords
- GitHub topics

for genuine discoverability rather than keyword stuffing.

---

# Launch assets

Prepare reusable launch material.

Create:

## GitHub repository description

One concise sentence.

## npm description

One concise sentence optimized for understanding and search.

## release notes

Explain what v0.1 enables.

## short announcement

Approximately 2-4 sentences.

## longer launch post

Explain:

- the problem
- why I built it
- how it works
- a small code example
- why Craft Docs + Astro is useful
- current limitations
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
- personal blog
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
- screenshots/diagrams where helpful
- clear use case
- easy setup
- good issue responses
- useful release announcements
- examples
- integration directories
- community participation
- consistent maintenance
- SEO/discoverability
- writing about the engineering behind it

Do not use:

- paid stars
- reciprocal star schemes
- bots
- fake accounts
- misleading claims
- mass unsolicited promotion

Teach me what GitHub stars do and do not tell us.

---

# Phase 24: content marketing through engineering

Use the project itself as material for technical writing.

Identify 3-5 worthwhile article ideas.

Examples:

- Building an Astro Content Loader from Scratch
- Turning Craft Docs into a Headless Content Source
- What I Learned Publishing My First OSS npm Package
- Why Remote Content Belongs Behind a Normalization Layer
- Testing an Astro Integration Against Multiple Framework Versions

The goal is not generic SEO content.

Each article should contain something technically useful that stands on its own.

Where relevant, naturally reference the project.

---

# Phase 25: launch retrospective

One or two weeks after launch, help me evaluate:

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

Do not interpret numbers without context.

For example:

```text
50 npm downloads ≠ 50 users.
CI installs, mirrors and automated systems may contribute.
```

Help distinguish signals from vanity metrics.

Identify what we learned and what should enter v0.2.

---

# Phase 26: first users

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

# Phase 27: maintenance workflow

After launch establish a simple recurring workflow.

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
- feature releases
- breaking changes
- deprecations
- stale issues
- contributor PRs
- dependency updates
- security issues

Keep maintenance proportional to actual project adoption.

---

# Phase 28: ownership

This should remain recognizably my OSS project.

Do not make every commit, decision, issue and release appear as though an AI independently maintains it.

Help me understand enough that I can:

- explain the architecture
- review contributions
- answer user questions
- make API decisions
- publish future releases
- talk publicly about how the package works

When generating public-facing explanations of technical decisions, make sure I can defend them.

If you implement something I would probably struggle to explain, explicitly teach it to me afterward.

---

# Phase 29: progressive independence

As the project matures, gradually encourage me to do some maintainer tasks myself.

Good candidates:

- reviewing a small PR
- writing a release note
- deciding whether a feature belongs in scope
- classifying an issue
- deciding patch vs minor
- reviewing an API proposal

You can advise and check my work afterward.

The objective is that I eventually need less assistance to maintain this repository.

---

# Phase 30: first release

Once I explicitly approve publication:

1. run final tests
2. validate the packed artifact
3. confirm git status
4. create the release commit
5. tag appropriately
6. publish using the agreed secure mechanism
7. verify npm
8. install the published version into a clean Astro project
9. run an actual build
10. create the GitHub release
11. verify public repository presentation
12. prepare launch posts
13. give me the recommended publication order

Do not consider the release finished merely because `npm publish` succeeded.

---

# Engineering principles

Throughout:

- prefer boring, maintainable code
- avoid unnecessary abstraction
- keep v0.1 small
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

When something belongs in v0.2 rather than v0.1, say so.

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

At meaningful milestones, give me a short:

```text
What you just learned

- ...
- ...
- ...
```

Do this only when there is something substantive to learn.

---

# Definition of done

The technical project is done when an unrelated Astro developer can:

```bash
npm install <package>
```

configure a Craft Docs API connection:

```ts
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

They should be able to achieve this from the README without reading the source.

But the broader project is successful when:

- the package solves a real problem
- I understand its architecture
- I understand how it is packaged and released
- I can explain its public API
- I can maintain it
- at least some developers outside my own projects use it
- we have collected real feedback
- the repository has earned visibility through usefulness
- I have learned how to operate an OSS project rather than merely publish one

Start now by:

1. inspecting the repository/environment
2. researching the current Astro, Craft Docs, npm and relevant ecosystem APIs
3. assessing existing competing/adjacent projects
4. explaining your initial understanding of the opportunity in no more than a few paragraphs
5. asking me the initial batch of clarifying questions
