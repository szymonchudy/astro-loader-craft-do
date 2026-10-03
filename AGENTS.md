# Project working agreement

## Project brief

`START_PROMPT.md` is the original project charter for this OSS project.

Read it fully when starting the project and consult it when making decisions about project scope, public API, releases, OSS strategy, mentoring goals, or other significant product decisions.

Do not reread the entire charter for routine implementation work. Persist durable architectural and product decisions in `docs/decisions/` so the repository becomes the source of truth as the project evolves.

## Ownership and mentoring

This is the owner's first personally owned OSS project. Treat development as both production work and a learning experience.

For decisions that materially affect the public API, compatibility, packaging, security, publishing, or long-term maintenance:

1. explain the decision,
2. explain why it matters,
3. describe meaningful alternatives,
4. recommend an option,
5. involve the owner when the choice creates a significant compatibility or ownership commitment.

Do not interrupt routine implementation for minor choices.

## Pairing workflow and continuity

The owner wants to build alongside the agent and learn during implementation.
Work in small, complete slices within one active milestone.

- Read `docs/STATUS.md` when continuing the project. Follow its references for
  decisions and evidence; do not repeat the initial interview or research
  already recorded unless new evidence requires it.
- Before a meaningful slice, briefly explain its purpose, the relevant OSS or
  package concept, and how success will be checked. Then handle routine work
  autonomously. Ask for input on consequential choices, not every edit.
- At each learning checkpoint, show the working result or focused diff,
  summarize validation, explain one or two concepts using the actual files,
  and give the owner an opportunity to inspect or try it before the next slice.
  Do not complete an entire multi-stage release plan unattended.
- When proposing an API, show the complete consumer experience, including its
  user-authored Zod schema, inferred types, and validation failure behavior.
- Keep `docs/STATUS.md` concise and current at checkpoints. Record durable
  reasoning in `docs/decisions/`; distinguish proposals from accepted choices
  and observations from unverified assumptions.
- Reuse synthetic fixtures and targeted checks. Repeat live API calls or broad
  research only when they answer an unresolved question or verify new work.
- Default to one implementation chat editing the checkout at a time. Use
  separate review or research work only when it materially improves the result.

## Research

Verify version-sensitive claims about Astro, Craft Docs, npm, GitHub, and other external systems against current primary sources.

Use parallel subagents for independent read-heavy research when this materially improves speed or quality. The primary agent should synthesize their findings and remain responsible for the final recommendation.

Clearly distinguish documented behavior, observed behavior, and assumptions.

## Engineering

Keep v0.1 focused and minimize public API surface.

Prefer maintainable code and established ecosystem conventions over unnecessary abstractions.

Run relevant tests and validation after changes.

Never expose credentials, tokens, private Craft content, or other secrets.

## External actions

Do not publish packages, create public repositories, create releases, push public changes, or perform other irreversible public actions without explicit owner approval.
