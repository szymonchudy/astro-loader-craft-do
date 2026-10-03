// Consumer-owned example adapter. These classes belong to chudy-me, not the loader.
// Paragraph insights reuse the blog's plugin. Rich containers use its HTML shape
// so Astro can still parse lists, code fences, and nested details in the body.
function escapeHtml(text) {
  return text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

/** @type {import('astro-loader-craft-do').CraftRenderers} */
export const blogRenderers = {
  callout: ({ markdown }) => markdown.includes('\n')
    ? `<aside class="callout-aside callout-aside--insight" role="note">\n<span class="callout-aside__label">Insight</span>\n\n${markdown}\n\n</aside>`
    : `|# insight\n| ${markdown}`,
  toggle: ({ summary, markdown }) => [
    '<details class="callout-collapsible">',
    `<summary>${escapeHtml(summary)}</summary>`,
    '<div class="callout-content"><div class="callout-content-inner">',
    '', markdown, '',
    '</div></div>',
    '</details>',
  ].join('\n'),
};
