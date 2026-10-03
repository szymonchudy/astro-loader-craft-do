# Initial sample observations

Date: 2026-10-03

Scope: read-only inspection of the deliberately created sample through the
connected Craft app. These are connector observations, not captured raw HTTP
responses and not yet evidence of a working standalone Astro integration.
No Craft content was changed. Connection identifiers and media URLs are omitted.

## Observed

- The sample Collection contains three items covering ordinary content,
  formatting, and empty values.
- The schema identifies the display name `publishedAt` with the key
  `publishedat`. Display names and property keys are not interchangeable.
- The block JSON view returns titles separately from the `properties` object.
- Populated dates appear as date strings and multiple-select tags as arrays.
- The empty-value item omits its empty description, date, and tags from its
  properties object; it does not return them as empty strings or empty arrays.
- Rendered connector output includes callout and highlight tags, a nested
  page title, an image reference, and a Craft web-editor link. An internal
  link must not be assumed to always arrive as a `block://` URI.
- The Collection formatter reported untitled rows or substituted IDs for
  titles. Reading the corresponding blocks as JSON showed correct titles.
  Do not infer missing upstream titles from this formatter result.

## Implications to validate

- Keep user-defined properties generic; do not limit names to the sample.
- Decide how to expose property keys and labels after checking the raw schema
  and item endpoints. Avoid guessing camelCase keys from display labels.
- Let the consumer schema decide whether an omitted property is optional,
  receives a default, or makes an entry invalid.
- Validate raw REST responses independently of connector formatting before
  designing fixtures or implementing response-shape assumptions.
- Check full nested content and image/link behavior through the direct API.
  This inspection does not establish permanent image URLs or link rewriting.

## Direct REST validation

The local connection was subsequently tested with read-only HTTP requests by
`scripts/inspect-craft.mjs`. The probe logs structural summaries, not item IDs,
body text, media URLs, credentials, or raw error messages. It retains no raw
response files. The following are direct observations of this sample:

- A schema request without authentication returned HTTP 401. Supplying the
  local API key as `Authorization: Bearer ...` returned HTTP 200.
- Schema, item listing, and JSON/Markdown block reads for all three items
  succeeded. This establishes read access; it does not assert the credential
  is restricted to read operations.
- `GET /collections/{id}/schema?format=schema` returned an object containing
  `name` and a `properties` array. Each property has its own `name`, `key`, and
  `type`. The sample types were `text`, `date`, `singleSelect`, and `multiSelect`.
- `GET /collections/{id}/items?maxDepth=0` returned `{ items: [...] }`. Each
  item has `id`, `title`, and `properties`. All three titles were correct,
  confirming the earlier missing-title result was connector formatting.
- The direct responses confirmed `publishedat` as the key, string dates,
  arrays for populated tags, and omission of empty properties.
- `GET /blocks?id=...&maxDepth=-1` returned one block object, not the
  connector's `{ data: [...] }` wrapper. Nonempty item blocks contained a
  `content` array; the empty item did not.
- With `Accept: text/markdown`, a Collection item is wrapped in
  `<collectionItem>`, property tags, and a title tag. A populated item also
  has a `<content>` wrapper whose body is indented four spaces. An empty
  item's response contains metadata wrappers but no body content.
- The formatting sample contains nested page/content wrappers, callout and
  highlight tags, an image, and a Craft web-editor link. No `block://` link
  appeared in these particular sample items.

Do not send the unprocessed item response to Astro's Markdown renderer:
metadata wrappers and structural indentation are not article body content.
Normalization must distinguish an empty body from nonempty wrapper markup and
preserve meaningful indentation within lists and code. Handling nested Craft
constructs requires its own fixtures and rendering checks.

The three-item response did not demonstrate pagination. Large-Collection
completeness, unsupported property types, image URL lifetime, body normalization,
and Astro consumer builds remain unverified.

## Reproduce

With the sample connection configured in the ignored `.env.local`, run:

```sh
node --env-file=.env.local scripts/inspect-craft.mjs
```

Add `--structure` to inspect line indentation and tag names without printing
body text. This probe deliberately inspects at most three item bodies. It is a
development research tool, not the production client or a completeness test.

## Next validation step

Review the proposed public data mapping, implement body normalization with
synthetic fixtures, and validate a packed loader in a fresh Astro consumer
application before advertising rendering or version compatibility.
