# Optional native separator rendering

Date: 2026-10-06

Status: accepted experimental API, implemented locally; publication is separate.

The chudy.me consumer needs Craft line metadata to choose its own Doodle sizes.
The owner requested that multiple styles remain optional for other loader users.

Add `CraftRenderers.line({ blockId, markdown, lineStyle?, separatorStyle? })` with
the existing synchronous string/undefined contract. Native metadata is matched
to Markdown using the structured blocks already fetched for images. A shared
ordered binding list spans nested containers and pagination. Matching protects
literal regions and heading underlines, and fails before snapshot replacement
when the representations disagree. Without the callback, normalization of rules
is unchanged and no separator matching is performed.

A global styled-divider option would impose appearance on unrelated consumers.
Exposing the whole raw block tree would enlarge the public API unnecessarily.
The narrow callback keeps artwork, size mapping, colors, and unsupported-family
fallbacks in the consumer. It adds no dependencies or API requests. Page-wide
styling inheritance and Washi artwork remain outside this milestone.
