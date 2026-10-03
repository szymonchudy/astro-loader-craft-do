# Read-only Craft client boundary

Date: 2026-10-03

Status: Implemented internally; verified with synthetic responses, not a new live run.

## Context and decision

`src/craft-client.ts` exposes two internal operations: list Collection items and
read an item's raw Markdown. Neither the factory nor its transport types is
exported through `src/index.ts` or a package subpath. No dependency was added.

Build requests using the supplied connection URL and API key, preserving its
base path. Use GET, Bearer authentication, an explicit Accept header, a 20-second
abort signal, and reject redirects. Match the existing probe's HTTPS
`connect.craft.do` host restriction, also excluding custom ports. This internal
restriction must be revisited when reviewing the public loader API; it does
not establish support for proxies or alternative Craft connection hosts.

Validate JSON as unknown data. Require the observed `{ items: [...] }` envelope
and rows with nonempty unique IDs, string titles, and a properties object.
Reject malformed rows and duplicate IDs rather than partially loading data.
Preserve property keys and unknown values; deciding supported property-value
types belongs to normalization, and application requirements belong to Astro's
consumer-authored Zod schema. Empty titles are structurally valid at this layer.

Return raw Markdown, including whitespace, wrappers, or an empty response.
The later normalization slice owns interpretation. Do not add schema discovery,
mutation methods, automatic retries, or pagination guesses for this slice.

Errors include an operation and actionable HTTP-status hints. They omit URLs,
IDs, API keys, raw upstream error bodies, exception messages, and causes.
Network, response-reading, and JSON-parsing failures are replaced with safe
messages. The client produces no logs.

## Alternatives and consequences

A large SDK or generic request API would expand the implementation without
helping this milestone. Adding Zod as a runtime dependency just for these few
transport-shape checks is unnecessary; small type guards establish the shape.
Consumer Zod validation remains essential and separate from these checks.

Injecting `fetch` into the internal factory lets tests control HTTP responses
without live credentials, global monkey-patching, or a public testing option.

Tests cover GET/authentication/base-path construction, encoded IDs, empty data,
malformed rows, duplicate IDs, HTTP 401/403/404/429/500, network/timeout errors,
invalid JSON, and failed response streams. The existing consumer checks pass.
Timeout-error handling is simulated; the suite does not wait 20 seconds to
measure cancellation against a real server.

## Evidence and remaining uncertainty

Reuse the [recorded direct REST sample](../research/sample-observations.md).
Synthetic fixture values were invented, not copied from private content.

A targeted official-documentation check confirms the Collection-items endpoint
and JSON/Markdown Accept headers for block reads. The current Collection-items
reference describes getting all items and shows a maxDepth parameter, with no
pagination parameter. Large-Collection completeness remains unverified; the
client makes one items request and does not claim a proven completeness policy.

- [Craft Get Collection Items](https://connect.craft.do/api-docs/documents/#get-collection-items)
- [Craft Fetch Blocks](https://connect.craft.do/api-docs/documents/#fetch-blocks)
