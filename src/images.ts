import { createHash } from 'node:crypto';
import { mkdir, writeFile, rename } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
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

/** Short, bounded retries for temporary media failures; the whole download has one deadline. */
async function downloadBytes(url: URL, request: typeof fetch): Promise<Buffer> {
  const signal = AbortSignal.timeout(30_000);
  const retryable = new Set([500, 502, 503, 504]);
  let failure = 'Craft image download failed or timed out.';
  for (let attempt = 0; attempt < 3; attempt++) {
    let response: Response;
    try {
      response = await request(url, { redirect: 'error', signal });
    } catch {
      failure = 'Craft image download failed or timed out.';
      if (signal.aborted || attempt === 2) throw new Error(failure);
      try { await delay(attempt === 0 ? 250 : 750, undefined, { signal }); }
      catch { throw new Error(failure); }
      continue;
    }
    if (!response.ok) {
      try { await response.body?.cancel(); } catch {}
      failure = `Craft image download failed: HTTP ${response.status}.`;
      if (!retryable.has(response.status) || attempt === 2) throw new Error(failure);
    } else {
      try { return Buffer.from(await response.arrayBuffer()); }
      catch {
        failure = 'Craft image download failed or timed out.';
        if (signal.aborted || attempt === 2) throw new Error(failure);
      }
    }
    try { await delay(attempt === 0 ? 250 : 750, undefined, { signal }); }
    catch { throw new Error(failure); }
  }
  throw new Error(failure);
}

/** Downloads only refreshed URLs read during this sync. Never attaches API credentials. */
export async function localizeImages(root: CraftBlock, cache: URL, request: typeof fetch): Promise<NativeImageRendering[]> {
  const images: NativeImageRendering[] = [];
  const downloads = new Map<string, string>();
  async function download(source: string): Promise<string> {
    const existing = downloads.get(source);
    if (existing) return existing;
    let url: URL;
    try { url = new URL(source); } catch { throw new Error('Craft returned an invalid image URL.'); }
    if (url.protocol !== 'https:' || url.username || url.password || url.port || !['r.craft.do', 'res.craft.do', 'res.luki.io'].includes(url.hostname)) throw new Error('Craft image URL uses an unsupported media origin.');
    const bytes = await downloadBytes(url, request);
    let format: string;
    try {
      const metadata = await sharp(bytes, { failOn: 'warning' }).metadata();
      const rasterFormat = metadata.format === 'heif' && metadata.compression === 'av1' ? 'avif' : metadata.format;
      if (!metadata.width || !metadata.height || !['jpeg', 'png', 'webp', 'avif', 'gif'].includes(rasterFormat ?? '')) throw new Error();
      // Decode the entire raster: a valid header on a truncated file is insufficient.
      await sharp(bytes, { failOn: 'warning' }).raw().toBuffer();
      format = rasterFormat === 'jpeg' ? 'jpg' : rasterFormat!;
    } catch { throw new Error('Craft image is not a complete supported raster image.'); }
    const digest = createHash('sha256').update(bytes).digest('hex');
    const name = `${digest}.${format}`;
    await mkdir(cache, { recursive: true });
    const temporary = new URL(`${name}.${randomUUID()}.tmp`, cache);
    await writeFile(temporary, bytes);
    await rename(temporary, new URL(name, cache));
    const src = `./${name}`;
    downloads.set(source, src);
    return src;
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
