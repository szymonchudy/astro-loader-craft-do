# Sample Craft Collection

This is a preparation guide for read-only API validation and the first fresh
Astro example. The experimental loader now renders this sample. These are example application
fields, not required fields imposed by the library.

## Create the document and Collection

Create a new Craft document named **Astro loader sample**, containing a
Collection named **Articles**. Use invented content that can eventually be
shared publicly. Keep the document separate from private blog content.

Use the Collection's existing title/content column for item titles; do not add
a second title column. Open each item to write its body as ordinary Craft
content, rather than putting its body in a text property.

Add these properties with the following display names. The initial schema read
will tell us their actual API keys; do not assume display names are API keys.

| Property | Craft field type | Purpose |
| --- | --- | --- |
| `slug` | Text | Example route name; Craft's own item ID remains the proposed loader entry ID |
| `description` | Text | Short summary and an empty-value test |
| `publishedAt` | Date | Date serialization test; use a date without a time initially |
| `status` | Single select | Options: `draft`, `published` |
| `tags` | Multiple select | Options: `astro`, `craft`, `example` |

Select the corresponding field types in Craft's UI. This guide does not assume
the API uses those exact type names; the documented examples differ in their
select terminology, so the connection's schema must be checked.

## Add three items

| Title | slug | description | publishedAt | status | tags |
| --- | --- | --- | --- | --- | --- |
| Hello from Craft | hello-from-craft | A sample article written in Craft. | 2026-10-01 | published | astro, craft |
| Formatting playground | formatting-playground | Content used to inspect rendering. | 2026-10-02 | draft | example |
| Empty values | empty-values | Leave empty | Leave empty | draft | Leave empty |

“Leave empty” means leave the cell unset, not enter those words. Select tags
as separate options, not a comma-separated text value.

For **Hello from Craft**, add a few paragraphs, an H2 heading, bold and italic
text, a bulleted list, and a link to `https://astro.build`.

For **Formatting playground**, add a nested list, a code block, a quote, a
callout, highlighted text, one nested page/card, and an internal link to
**Hello from Craft**. Add one small image you own or created for this example,
with a caption if available. These exercise known uncertainty; inclusion does
not promise every construct will render with Craft's appearance in beta.

Leave **Empty values** with an empty body initially. This lets us distinguish
empty values, omitted properties, and missing content in real responses.

The loader must not assume what `status` means or automatically hide drafts.
Any published-only filtering belongs to the example application. Similarly,
`slug`, `publishedAt`, and `tags` are application choices.

Additional property types, duplicate titles, date-times, and links outside the
connection can be tested later. The three items above are enough to start.

## Connect for read-only validation

Create an API connection for this sample document in Craft's Imagine area.
Use API-key protection if offered. We will make only read requests; this does
not assume Craft offers a separate read-only credential permission.

Copy `.env.example` to `.env.local` if no local file exists, and fill in
`CRAFT_API_URL` and `CRAFT_API_KEY` using this document's generated connection.
`CRAFT_COLLECTION_ID` can be left empty during discovery. These are development
settings, not a promise that the library reads environment variables itself.

This repository ignores `.env.local`. Do not place either credential
value in the public sample document, an issue, a screenshot, or a commit.

We will discover the Collection ID through `GET /collections`, then inspect
its schema and items and fetch item Markdown. There is no need to guess IDs or
manually export API responses. No private content is needed for these checks.

Access through the connected Craft app can help inspect the sample, but it
does not supply credentials to a standalone Astro application. Direct REST
validation still needs the local connection settings above.

## Validate before promising template duplication

The desired onboarding flow is to duplicate this sample document into a
user's Craft space and connect it to the fresh Astro example. First verify:

- Property types and select options survive duplication.
- Item bodies, nested content, images, and internal links remain usable.
- The copied Collection and item IDs can be discovered independently.
- Each user creates a connection for their own copy; credentials are never
  included in the shared template.

Craft documents shared-document duplication and CSV import, but neither has
yet been validated for this sample. Keep this manual guide as the fallback;
CSV alone is not a complete representation of rich item bodies.

## Sources

- [Craft Selected Documents API](https://connect.craft.do/api-docs/documents/)
- [Craft shared-document duplication](https://www.craft.do/s/fegziZPWTrBfn0)
- [Craft Collections and CSV import](https://www.craft.do/blog/craft-update-3-3-9)
