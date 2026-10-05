import type { CraftImage } from './images.js';
import type { LoaderContext } from 'astro/loaders';
type RenderedContent = Awaited<ReturnType<LoaderContext['renderMarkdown']>>;

/** Astro 5 ignores renderMarkdown's fileURL. Promote only our known local assets.
 * Astro 6+ already emits markers. Literal alt text is set before serialization.
 */
export function registerImageRendering(rendered: RenderedContent, images: CraftImage[]): RenderedContent {
  const sources = new Set(images.map(image => image.src));
  const byBlock = new Map(images.map(image => [image.blockId, image]));
  const figures: (CraftImage | undefined)[] = [];
  const metadata = rendered.metadata as Record<string, unknown> | undefined;
  const found = new Set<string>();
  for (const key of ['imagePaths', 'localImagePaths', 'remoteImagePaths']) {
    const paths = metadata?.[key];
    if (Array.isArray(paths)) for (const path of paths) if (typeof path === 'string') found.add(path);
  }
  const named: Record<string, string> = { quot: '"', apos: "'", lt: '<', gt: '>', amp: '&' };
  const decode = (value: string) => value.replace(/&(#x[0-9a-f]+|#[0-9]+|quot|apos|lt|gt|amp);/gi, (entity, code: string) => {
    if (!code.startsWith('#')) return named[code.toLowerCase()] ?? entity;
    const point = code[1]?.toLowerCase() === 'x' ? Number.parseInt(code.slice(2), 16) : Number.parseInt(code.slice(1), 10);
    return point > 0 && point <= 0x10ffff ? String.fromCodePoint(point) : entity;
  });
  // Astro decodes marker quotes, not other HTML entities. JSON Unicode escapes
  // preserve literal ampersands (including authored entity-like alt text).
  const imageTag = (props: Record<string, unknown>) => `<img __ASTRO_IMAGE_="${JSON.stringify(props).replaceAll('&', '\\u0026').replaceAll('<', '\\u003c').replaceAll('>', '\\u003e').replaceAll("'", '\\u0027').replaceAll('"', '&#x22;')}"/>`;
  const html = rendered.html.replace(/<\/?figure\b[^>]*>|<img\b[^>]*>/g, tag => {
    if (tag.startsWith('</figure')) { figures.pop(); return tag; }
    if (tag.startsWith('<figure')) {
      const id = tag.match(/data-craft-image="([^"]+)"/)?.[1];
      figures.push(id ? byBlock.get(decode(id)) : undefined);
      return tag;
    }
    const figure = figures.at(-1);
    const literalAlt = (src: string, value: unknown) => figure?.src === src ? figure.altText ?? '' : typeof value === 'string' ? decode(value) : '';
    const marker = tag.match(/__ASTRO_IMAGE_="([^"]+)"/);
    if (marker) {
      const props: Record<string, unknown> = JSON.parse(marker[1]!.replace(/&(?:#x22|quot);/g, '"').replace(/&(?:#x27|apos);/g, "'"));
      if (typeof props.src !== 'string' || !sources.has(props.src)) return tag;
      found.add(props.src);
      props.alt = literalAlt(props.src, props.alt);
      // HAST serializers may stringify array values. Astro image services need
      // numeric candidate widths, even when scalar dimensions remain numbers.
      if (Array.isArray(props.widths)) props.widths = props.widths.map(Number);
      return imageTag(props);
    }
    const attrs = Object.fromEntries([...tag.matchAll(/([\w-]+)="([^"]*)"/g)].map(([, key, value]) => [key!, decode(value!)]));
    const src = attrs.src;
    if (!src || !sources.has(src)) return tag;
    found.add(src);
    const props: Record<string, unknown> = { ...attrs, alt: literalAlt(src, attrs.alt) };
    for (const key of ['width', 'height', 'quality']) if (attrs[key]) props[key] = Number(attrs[key]);
    if (attrs.widths) props.widths = attrs.widths.split(',').map(Number);
    return imageTag(props);
  });
  return { ...rendered, html, metadata: { ...rendered.metadata, imagePaths: [...found] } };
}
