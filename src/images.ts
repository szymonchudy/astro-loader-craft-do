import { createHash } from 'node:crypto';
import { mkdir, writeFile, rename, rm } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { checkLimit, deadline, limits, type Deadline } from './budget.js';
import { requestBytes } from './transport.js';
import sharp from 'sharp';
import type { CraftBlock } from './craft-client.js';
import { normalizeCaption } from './normalize.js';

/** Generic metadata. Resolve src through the consumer's Astro image() schema. */
export interface CraftImage {
  blockId: string;
  src: string;
  altText?: string;
  captionMarkdown?: string;
  isFirstBlock: boolean;
}
export interface NativeImageRendering {
  image: CraftImage;
  sourceMarkdown: string;
  sourceUrl: string;
  sourceCaptions: string[];
  markdown: string;
  used: boolean;
}
const escapeAlt = (text: string) => text.replaceAll('&', '&amp;').replace(/[\\[\]*_`]/g, character => '\\' + character).replaceAll('<', '&lt;').replaceAll('>', '&gt;').replace(/[\r\n]/g, ' ');

/** Downloads only refreshed URLs read during this sync. Never attaches API credentials. */
export async function localizeImages(root: CraftBlock, cache: URL, request: typeof fetch, parent?: Deadline): Promise<NativeImageRendering[]> {
  const images: NativeImageRendering[] = [];
  const downloads = new Map<string, string>();
  async function download(source: string): Promise<string> {
    const existing = downloads.get(source);
    if (existing) return existing;
    let url: URL;
    try { url = new URL(source); } catch { throw new Error('Craft returned an invalid image URL.'); }
    if (url.protocol !== 'https:' || url.username || url.password || url.port || !['r.craft.do', 'res.craft.do', 'res.luki.io'].includes(url.hostname)) throw new Error('Craft image URL uses an unsupported media origin.');
    const time = deadline(limits.mediaMs, parent);
    try {
      const bytes = await requestBytes(url, request, {
        maximum: limits.mediaBytes, milliseconds: limits.mediaMs, parent: time,
        failure: 'Craft image download failed or timed out.',
        httpError: status => new Error(`Craft image download failed: HTTP ${status}.`),
      });
      let format: string;
      try {
        const metadata = await time.wait(sharp(bytes, { failOn: 'warning', limitInputPixels: limits.pixels }).metadata());
        const rasterFormat = metadata.format === 'heif' && metadata.compression === 'av1' ? 'avif' : metadata.format;
        if (!metadata.width || !metadata.height || !['jpeg', 'png', 'webp', 'avif', 'gif'].includes(rasterFormat ?? '')) throw new Error();
        const frames = metadata.pages ?? 1;
        checkLimit(frames, limits.frames, 'image frame count');
        checkLimit(metadata.width * (metadata.pageHeight ?? metadata.height) * frames, limits.pixels, 'decoded image pixels');
        // pages:-1 makes GIF/WebP decode every frame, including corrupt later frames.
        const decoder = sharp(bytes, { failOn: 'warning', pages: -1, limitInputPixels: limits.pixels })
          .timeout({ seconds: Math.max(1, Math.ceil(time.remaining() / 1000)) });
        try { await time.wait(decoder.raw().toBuffer()); }
        finally { decoder.destroy(); }
        format = rasterFormat === 'jpeg' ? 'jpg' : rasterFormat!;
      } catch { throw new Error('Craft image is not a complete supported raster image.'); }
      const digest = createHash('sha256').update(bytes).digest('hex');
      const name = `${digest}.${format}`;
      await mkdir(cache, { recursive: true });
      const temporary = new URL(`${name}.${randomUUID()}.tmp`, cache);
      try {
        await writeFile(temporary, bytes, { signal: time.signal });
        time.check();
        await rename(temporary, new URL(name, cache));
      } finally { await rm(temporary, { force: true }); }
      const src = `./${name}`;
      downloads.set(source, src);
      return src;
    } finally { time.close(); }
  }
  async function visit(blocks: CraftBlock[], topLevel: boolean) {
    for (let index = 0; index < blocks.length; index++) {
      const block = blocks[index]!;
      if (block.type === 'image') {
        if (!block.url || !block.markdown) throw new Error('Craft native image is missing its source data.');
        const captions: string[] = [];
        while (blocks[index + 1]?.type === 'text' && blocks[index + 1]?.textStyle === 'caption' && (blocks[index + 1]?.indentationLevel ?? 0) === (block.indentationLevel ?? 0)) {
          const caption = blocks[++index]!;
          if (!caption.markdown) throw new Error('Craft image caption is missing Markdown.');
          captions.push(caption.markdown);
        }
        const captionMarkdown = captions.map(normalizeCaption).join('\n\n');
        const image: CraftImage = {
          blockId: block.id, src: await download(block.url),
          ...(block.altText === undefined ? {} : { altText: block.altText }),
          ...(captionMarkdown ? { captionMarkdown } : {}),
          isFirstBlock: topLevel && blocks[0] === block && (block.indentationLevel ?? 0) === 0 && (!block.listStyle || block.listStyle === 'none'),
        };
        const markdown = `<figure data-craft-image="${block.id.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')}">\n\n![${escapeAlt(image.altText ?? '')}](${image.src})\n\n${captionMarkdown ? `<figcaption>\n\n${captionMarkdown}\n\n</figcaption>\n` : ''}</figure>`;
        images.push({ image, sourceMarkdown: block.markdown, sourceUrl: block.url, sourceCaptions: captions, markdown, used: false });
      }
      if (block.content) await visit(block.content, false);
    }
  }
  await visit(root.content ?? [], true);
  return images;
}
