# Native Craft Markdown export comparison

Date: 2026-10-03

Status: observations from the owner's Formatting playground ZIP and export-panel
screenshot; single-line callout conversion subsequently implemented experimentally.
The archive, content, identifiers, and media URLs are not copied into the repo.

## Observed in this export

- The ZIP contains one Markdown document and two PNG files. The Markdown's
  relative, percent-encoded image path resolves to an included PNG (4,667 bytes;
  PNG signature checked). This verifies packaging, not browser rendering.
- The screenshot preview uses a remote image URL and warns that attachment
  links require sign-in. The downloaded ZIP instead uses a bundled image.
  Do not generalize the preview warning to this ZIP's local image reference.
- The document starts with its title as H1. The nested page is flattened into
  another H1 and its body. The export panel has H1 selected for heading size.
- Ordinary headings, nested lists, and fenced code use standard Markdown.
  The code fence has no language label; this does not establish whether export
  discarded one or the source never supplied one.
- The callout becomes a blockquote; highlighted text becomes plain text; the
  image caption becomes italic text. No HTML tags appear in this Markdown file.
- The internal document link still points to the Craft web editor. The export
  does not turn it into a route on the consuming Astro site.
- There is no Collection-properties block or YAML frontmatter in this file.
  It cannot by itself replace the loader's separate metadata read.

These observations apply to one sample and the selected export settings, not
every Craft block type or export mode.

## Comparison with the working loader

At the initial comparison checkpoint, the normalizer removed API wrappers and structural indentation. It
kept the title in entry metadata, converted nested page titles to H3, retained
callout/highlight/caption tags, and left image and internal-link URLs intact.
The example supplies styles for the retained tags.

The native export demonstrates a simpler, portable rendering policy, with some
formatting loss. It is useful as a reference for synthetic normalization tests.
It is not evidence that the API can return this same export representation.
The earlier review of Craft's [document API](https://connect.craft.do/api-docs/documents/)
and [space API](https://connect.craft.do/api-docs/space) did not find a documented
native Markdown ZIP export endpoint. This is a documentation finding, not proof
that no other export mechanism exists.

## Proposed next pairing step

Discuss converting a simple API callout into a standard Markdown blockquote.
If agreed, add a synthetic fixture, implement that one conversion, and verify
Astro produces a blockquote in the existing consumer check. Inspect together
before changing highlights, captions, or heading levels. Keep title/Collection
metadata separate so consumer Zod validation and inferred types remain intact.

Bundled assets suggest a separate future media-copying feature. Do not infer
that the current API loader already downloads or publishes images from the
fact that the manual ZIP export includes them.

## Follow-up checkpoint

The owner asked the agent to lead the next step. Single-line, standalone
`<callout>...</callout>` blocks now become Markdown blockquotes, including inside
flattened pages. Inline Markdown is preserved. Fenced and indented code and inline
tag examples remain unchanged. Multiline, attributed, and list-nested callouts
are outside this step; no general Craft HTML parser is claimed.

All 20 tests pass, including an Astro consumer assertion for blockquote HTML,
inline emphasis/code, and a following paragraph outside the quote. A live build
also succeeded; its HTML places the sample callout text inside a blockquote with
no remaining callout elements. This verifies rendering structure, not a new
visual browser inspection. Other rendering-policy proposals remain pending.

Subsequent work completed the consumer-configurable normalization milestone; see
[the current contract](../normalization.md) for updated defaults and supported forms.
