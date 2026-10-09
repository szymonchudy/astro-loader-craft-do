import type { NativeImageRendering, CraftImage } from './images.js';
import type { CraftBlock } from './craft-client.js';
/** Inner Markdown has Craft structure removed; consumer output is never parsed again. */
type MarkdownBlock = { readonly markdown: string };
type Renderer<T> = (block: T) => string | undefined;

/** Synchronous, experimental overrides. undefined uses the default; '' omits content. */
export interface CraftRenderers {
  image?: Renderer<MarkdownBlock & CraftImage>;
  /** Opt in to native separator metadata. Without this callback, rules pass through unchanged. */
  line?: Renderer<MarkdownBlock & { readonly blockId: string; readonly lineStyle?: string; readonly separatorStyle?: string }>;
  callout?: Renderer<MarkdownBlock>;
  toggle?: Renderer<MarkdownBlock & { readonly summary: string }>;
  page?: Renderer<MarkdownBlock & { readonly title: string }>;
  caption?: Renderer<MarkdownBlock>;
  highlight?: Renderer<MarkdownBlock & { readonly color?: string }>;
}

/** Internal ordered bindings shared by every Markdown page and nested container. */
export interface NativeLineRendering {
  block: MarkdownBlock & { readonly blockId: string; readonly lineStyle?: string; readonly separatorStyle?: string };
  used: boolean;
}

export function collectNativeLines(root: CraftBlock): NativeLineRendering[] {
  const result: NativeLineRendering[] = [];
  function visit(block: CraftBlock): void {
    if (block.type === 'line') {
      if (typeof block.markdown !== 'string' || !block.markdown.trim()) throw new Error('Craft native separator is missing its Markdown.');
      result.push({ block: { blockId: block.id, markdown: block.markdown.trim(),
        ...(block.lineStyle === undefined ? {} : { lineStyle: block.lineStyle }),
        ...(block.separatorStyle === undefined ? {} : { separatorStyle: block.separatorStyle }),
      }, used: false });
    }
    for (const child of block.content ?? []) visit(child);
  }
  visit(root);
  return result;
}

function isRule(line: string): boolean {
  return /^ {0,3}(?:(?:\*[ \t]*){3,}|(?:-[ \t]*){3,}|(?:_[ \t]*){3,})$/.test(line);
}

function isSetextUnderline(lines: string[], index: number): boolean {
  if (!/^ {0,3}(?:-+|=+)[ \t]*$/.test(lines[index]!)) return false;
  const previous = lines[index - 1];
  return !!previous?.trim() && !/^(?: {4}|\t| {0,3}(?:[<>#]|[-*+] |\d+[.)] |`{3}|~{3}))/.test(previous) && !isRule(previous);
}

function render<T>(name: keyof CraftRenderers, renderer: Renderer<T> | undefined, block: T, fallback: () => string): string {
  const result = renderer?.(block);
  if (result !== undefined && typeof result !== 'string') {
    throw new Error(`Craft ${name} renderer must return a Markdown string or undefined.`);
  }
  return result ?? fallback();
}

function trimBlankLines(lines: string[]): string[] {
  let start = 0;
  let end = lines.length;
  while (start < end && !lines[start]?.trim()) start++;
  while (end > start && !lines[end - 1]?.trim()) end--;
  return lines.slice(start, end);
}

function unwrapContent(lines: string[], indent: string): string[] {
  const opening = lines.findIndex((line) => line === `${indent}<content>`);
  if (opening === -1) {
    if (lines.some((line) => line.startsWith(`${indent}<contentPreview`))) {
      throw new Error('Craft returned a truncated body preview instead of complete content.');
    }
    if (lines.some((line) => /<\/?content\b/.test(line))) {
      throw new Error('Craft body content wrapper has unexpected indentation or formatting.');
    }
    return [];
  }
  let closing = -1;
  for (let index = lines.length - 1; index > opening; index--) {
    if (lines[index] === `${indent}</content>`) { closing = index; break; }
  }
  if (closing <= opening) throw new Error('Craft returned an unclosed content wrapper.');
  const prefix = `${indent}  `;
  return trimBlankLines(lines.slice(opening + 1, closing).map((line) => {
    if (!line.trim()) return '';
    if (!line.startsWith(prefix)) throw new Error('Craft body indentation does not match its content wrapper.');
    return line.slice(prefix.length);
  }));
}

function escapeHtml(text: string): string {
  return text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

function codeSpanEnd(text: string, start: number): number | undefined {
  const marker = text.slice(start).match(/^`+/)?.[0];
  if (!marker) return undefined;
  let end = start + marker.length;
  while ((end = text.indexOf(marker, end)) !== -1) {
    if (text[end - 1] !== '`' && text[end + marker.length] !== '`') return end + marker.length;
    end += marker.length;
  }
  return undefined;
}

function proseEnd(lines: string[], start: number): number {
  let limit = start + 1;
  while (limit < lines.length && lines[limit]!.trim()) limit++;
  const paragraph = lines.slice(start, limit).join('\n');
  const spans: [number, number][] = [];
  for (let i = 0; i < paragraph.length; i++) {
    if (paragraph[i] === '\\') { i++; continue; }
    if (paragraph[i] !== '`') continue;
    const end = codeSpanEnd(paragraph, i);
    if (end !== undefined) { spans.push([i, end]); i = end - 1; }
    else i += paragraph.slice(i).match(/^`+/)![0].length - 1;
  }
  let offset = lines[start]!.length + 1;
  for (let i = start + 1; i < limit; i++) {
    if (/^(?:\s|[<>+*\-`~#]|!\[|\d+[.)] )/.test(lines[i]!) && !spans.some(([from, to]) => from < offset && offset < to)) return i;
    offset += lines[i]!.length + 1;
  }
  return limit;
}

// A fence consumes its entire literal region, including wrapper-looking lines.
function fenceEnd(lines: string[], start: number, enclosingTag?: string): number | undefined {
  const opening = lines[start]!.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
  if (!opening || (opening[1]![0] === '`' && opening[2]!.includes('`'))) return undefined;
  const marker = opening[1]!;
  for (let i = start + 1; i < lines.length; i++) {
    // Craft can append the enclosing wrapper to the closing fence delimiter.
    // Only wrapper-boundary scanning accepts this suffix; code remains literal.
    const line = enclosingTag && lines[i]!.endsWith(`</${enclosingTag}>`)
      ? lines[i]!.slice(0, -(`</${enclosingTag}>`.length)) : lines[i]!;
    const close = line.match(/^ {0,3}(`{3,}|~{3,})\s*$/);
    if (close && close[1]![0] === marker[0] && close[1]!.length >= marker.length) return i;
  }
  return lines.length - 1; // An unclosed Markdown fence is still literal code.
}

/** Inline conversion, skipping escapes, code spans, and raw HTML attributes. */
function inline(text: string, renderers: CraftRenderers, depth: number): string {
  if (depth > 30) throw new Error('Craft content exceeds the supported nesting depth.');
  let result = '';
  for (let i = 0; i < text.length;) {
    if (text[i] === '\\') { result += text.slice(i, i + 2); i += 2; continue; }
    if (text[i] === '`') {
      const marker = text.slice(i).match(/^`+/)![0];
      const end = codeSpanEnd(text, i);
      if (end !== undefined) {
        result += text.slice(i, end); i = end; continue;
      }
      result += marker; i += marker.length; continue;
    }
    // Link destinations/titles are data, not authored inline formatting.
    if (text.startsWith('](', i)) {
      let nesting = 1;
      let end = i + 2;
      for (; end < text.length && nesting; end++) {
        if (text[end] === '\\') { end++; continue; }
        if (text[end] === '(') nesting++;
        if (text[end] === ')') nesting--;
      }
      result += text.slice(i, end); i = end; continue;
    }
    const url = text.slice(i).match(/^(?:https?:\/\/|block:\/\/|date:\/\/)\S+/);
    if (url) { result += url[0]; i += url[0].length; continue; }
    const opening = text.slice(i).match(/^<highlight(?:\s+[^>]*?)?>/);
    const shorthand = text.startsWith('==', i) && text[i + 2] !== '=' && text[i - 1] !== '=';
    if (opening || shorthand) {
      const offset = opening?.[0].length ?? 2;
      const closing = opening ? '</highlight>' : '==';
      // Scan past inline code so literal delimiters cannot close a highlight.
      let end = i + offset;
      let nesting = 1;
      for (; end < text.length; end++) {
        if (text[end] === '\\') { end++; continue; }
        if (text[end] === '`') {
          const codeEnd = codeSpanEnd(text, end);
          if (codeEnd !== undefined) { end = codeEnd - 1; continue; }
        }
        if (opening && /^<highlight(?:\s|>)/.test(text.slice(end))) nesting++;
        if (text.startsWith(closing, end)) {
          nesting--;
          if (nesting === 0) break;
          end += closing.length - 1;
        }
      }
      if (end >= text.length) {
        if (opening) throw new Error('Craft returned an unclosed highlight wrapper.');
      } else {
        const color = opening?.[0].match(/\bcolor\s*=\s*["']([^"']*)["']/)?.[1] ?? (shorthand ? 'yellow' : undefined);
        const markdown = inline(text.slice(i + offset, end), renderers, depth + 1);
        result += render('highlight', renderers.highlight, { markdown, ...(color === undefined ? {} : { color }) }, () => `<mark>${markdown}</mark>`);
        i = end + closing.length; continue;
      }
    }
    // Preserve unknown HTML tags, comments, and literal <code> contents.
    if (text.startsWith('</highlight>', i)) throw new Error('Craft returned an unmatched highlight closing tag.');
    const code = text.slice(i).match(/^<code\b[^>]*>[\s\S]*?<\/code>/i);
    const tag = code ?? text.slice(i).match(/^(?:<!--[\s\S]*?-->|<(?:[^"'<>]|"[^"]*"|'[^']*')+>)/);
    if (tag) { result += tag[0]; i += tag[0].length; continue; }
    result += text[i]; i++;
  }
  return result;
}

// Craft represents toggle descendants as following blocks indented by two spaces.
function indentedEnd(lines: string[], start: number, width: number): number {
  let end = start + 1;
  let last = end;
  while (end < lines.length) {
    const line = lines[end]!;
    if (!line.trim()) { end++; continue; }
    if (!line.startsWith(' '.repeat(width))) break;
    last = ++end;
  }
  return last;
}

function wrapperEnd(lines: string[], start: number, tag: string): number {
  let nesting = 1;
  const boundaryLines = [...lines];
  boundaryLines[start] = lines[start]!.replace(new RegExp(`^<${tag}>`), '');
  for (let i = start; i < lines.length; i++) {
    const end = fenceEnd(boundaryLines, i, tag === 'callout' || tag === 'caption' ? tag : undefined);
    if (end !== undefined) {
      const openingFence = boundaryLines[i]!.match(/^ {0,3}(`{3,}|~{3,})/)?.[1];
      const closingFence = lines[end]!.endsWith(`</${tag}>`)
        ? lines[end]!.slice(0, -(`</${tag}>`.length)).match(/^ {0,3}(`{3,}|~{3,})\s*$/)?.[1] : undefined;
      if (openingFence && closingFence && closingFence[0] === openingFence[0] && closingFence.length >= openingFence.length) {
        if (--nesting === 0) return end;
      }
      i = end; continue;
    }
    if (i === start) continue;
    const opens = new RegExp(`^<${tag}(?:\\s|>)`).test(lines[i]!);
    const closes = tag === 'page' || tag === 'card'
      ? lines[i] === `</${tag}>`
      : lines[i]!.endsWith(`</${tag}>`) && !lines[i]!.startsWith(' ');
    if (opens && closes) continue;
    if (opens) nesting++;
    if (closes) {
      if (--nesting === 0) return i;
    }
  }
  throw new Error(`Craft returned an unclosed ${tag} wrapper.`);
}

function normalizeBlocks(lines: string[], renderers: CraftRenderers, depth = 0, images: NativeImageRendering[] = [], nativeLines: NativeLineRendering[] = []): string[] {
  if (depth > 30) throw new Error('Craft content exceeds the supported nesting depth.');
  const output: string[] = [];
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index]!;
    if (!line.trim()) { output.push(line); continue; }
    const fence = fenceEnd(lines, index);
    if (fence !== undefined) { output.push(...lines.slice(index, fence + 1)); index = fence; continue; }
    // Indented code is literal here. List/toggle containers remove their own indent first.
    if (/^(?: {4}|\t)/.test(line)) { output.push(line); continue; }
    if (/^ {0,3}\[[^\]]+\]:/.test(line)) { output.push(line); continue; }
    if (/^ {0,3}<!--/.test(line)) {
      let end = index;
      while (end < lines.length - 1 && !lines[end]!.includes('-->')) end++;
      output.push(...lines.slice(index, end + 1)); index = end; continue;
    }
    const raw = line.match(/^ {0,3}<(pre|script|style|textarea|code)\b/i);
    if (raw) {
      let end = index;
      while (end < lines.length - 1 && !lines[end]!.toLowerCase().includes(`</${raw[1]!.toLowerCase()}>`)) end++;
      output.push(...lines.slice(index, end + 1)); index = end; continue;
    }
    // HTML block contents are literal Markdown. Protect these only for the
    // optional separator matcher; keep the existing normalization path otherwise.
    const literalEnd = /^ {0,3}<\?/.test(line) ? '?>'
      : /^ {0,3}<!\[CDATA\[/.test(line) ? ']]>'
      : /^ {0,3}<![A-Z]/.test(line) ? '>' : undefined;
    if (renderers.line && literalEnd) {
      let end = index;
      while (end < lines.length - 1 && !lines[end]!.includes(literalEnd)) end++;
      output.push(...lines.slice(index, end + 1)); index = end; continue;
    }
    const htmlBlock = /^ {0,3}<\/?(?:address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|nav|noframes|ol|optgroup|option|p|param|search|section|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul)(?:\s|\/?>)/i.test(line)
      || /^ {0,3}<\/?[a-z][\w-]*(?:\s[^>]*|\s*)>\s*$/i.test(line);
    if (renderers.line && htmlBlock && !/^ {0,3}<\/?(?:collectionItem|page|card|pageTitle|content|contentPreview|itemsPreview|callout|caption|highlight)\b/.test(line)) {
      let end = index + 1;
      while (end < lines.length && lines[end]!.trim()) end++;
      output.push(...lines.slice(index, end)); index = end - 1; continue;
    }
    if (renderers.line && !isSetextUnderline(lines, index) && (isRule(line) || /^ {0,3}={3,}\s*$/.test(line))) {
      const native = nativeLines.find(candidate => !candidate.used);
      if (!native || native.block.markdown !== line.trim()) throw new Error('Craft native separators do not match complete item Markdown.');
      native.used = true;
      const rendered = render('line', renderers.line, native.block, () => line);
      output.push(...(rendered === line ? [line] : ['', rendered, '']));
      continue;
    }
    // Craft may refresh access signatures between the JSON and Markdown reads.
    // Match a complete image block by its media origin/path, never a prose URL.
    const imageUrl = line.match(/^!\[(?:\\.|[^\]\\])*\]\((https:\/\/[^\s)]+)(?:\s+"[^"]*")?\)$/)?.[1];
    const native = images.find(image => {
      if (image.used) return false;
      if (line === image.sourceMarkdown) return true;
      if (!imageUrl) return false;
      try { const actual = new URL(imageUrl); const expected = new URL(image.sourceUrl); return actual.origin === expected.origin && actual.pathname === expected.pathname; }
      catch { return false; }
    });
    if (native) {
      native.used = true;
      for (const caption of native.sourceCaptions) {
        let next = index + 1;
        while (next < lines.length && !lines[next]!.trim()) next++;
        const captionLines = caption.split('\n');
        if (lines.slice(next, next + captionLines.length).join('\n') !== caption) throw new Error('Craft image captions do not match structured content.');
        index = next + captionLines.length - 1;
      }
      output.push('', render('image', renderers.image, { ...native.image, markdown: native.markdown }, () => native.markdown), '');
      continue;
    }
    const page = line.match(/^<(page(?:\s+[^>]*)?|card)>$/);
    if (page) {
      const tag = page[1]!.startsWith('page') ? 'page' : 'card';
      const end = wrapperEnd(lines, index, tag);
      const nested = lines.slice(index + 1, end);
      const titleLine = nested.find((candidate) => /^  <pageTitle>.*<\/pageTitle>$/.test(candidate));
      const title = inline(titleLine?.replace(/^  <pageTitle>|<\/pageTitle>$/g, '') ?? '', renderers, depth + 1);
      const markdown = normalizeBlocks(unwrapContent(nested, '  '), renderers, depth + 1, images, nativeLines).join('\n');
      output.push('', render('page', renderers.page, { title, markdown }, () => [title ? `### ${title}` : '', markdown].filter(Boolean).join('\n\n')), '');
      index = end; continue;
    }
    const wrapper = line.match(/^<(callout|caption)>/);
    if (wrapper) {
      const tag = wrapper[1] as 'callout' | 'caption';
      const open = `<${tag}>`;
      const close = `</${tag}>`;
      let inner: string[];
      if (line.endsWith(close)) inner = [line.slice(open.length, -close.length)];
      else {
        const end = wrapperEnd(lines, index, tag);
        inner = [line.slice(open.length), ...lines.slice(index + 1, end), lines[end]!.slice(0, -close.length)];
        inner = trimBlankLines(inner);
        // Multiline wrappers may supply one structural indentation level.
        if (inner.length && inner.every((part) => !part.trim() || part.startsWith('  '))) {
          inner = inner.map((part) => part.slice(2));
        }
        index = end;
      }
      const markdown = normalizeBlocks(inner, renderers, depth + 1, images, nativeLines).join('\n');
      output.push('', render(tag, renderers[tag], { markdown }, () => tag === 'callout'
        ? `<aside data-craft-callout role="note">\n\n${markdown}\n\n</aside>`
        : `<em>${markdown}</em>`), '');
      continue;
    }
    const toggle = line.match(/^\+ (.*)$/);
    if (toggle) {
      const end = indentedEnd(lines, index, 2);
      const children = lines.slice(index + 1, end).map((part) => part.trim() ? part.slice(2) : '');
      const markdown = normalizeBlocks(children, renderers, depth + 1, images, nativeLines).join('\n');
      const summary = toggle[1]!;
      output.push('', render('toggle', renderers.toggle, { summary, markdown }, () =>
        `<details>\n<summary>${escapeHtml(summary)}</summary>\n\n${markdown}\n\n</details>`), '');
      index = end - 1; continue;
    }
    const list = line.match(/^([-*]|\d+[.)]) +(.*)$/);
    if (list) {
      const end = indentedEnd(lines, index, 2);
      const original = [list[2]!, ...lines.slice(index + 1, end).map((part) => part.trim() ? part.slice(2) : '')];
      const normalized = normalizeBlocks(original, renderers, depth + 1, images, nativeLines).join('\n');
      if (normalized === original.join('\n')) output.push(...lines.slice(index, end));
      else {
        const [first, ...rest] = normalized.split('\n');
        const marker = `${list[1]} `;
        output.push(`${marker}${first}`, ...rest.map((part) => part ? `${' '.repeat(marker.length)}${part}` : ''));
      }
      index = end - 1; continue;
    }
    if (line.startsWith('>')) {
      let end = index;
      while (end < lines.length && /^>(?: |$)/.test(lines[end]!)) end++;
      if (end > index) {
        const original = lines.slice(index, end).map((part) => part.replace(/^> ?/, ''));
        const normalized = normalizeBlocks(original, renderers, depth + 1, images, nativeLines).join('\n');
        output.push(...(normalized === original.join('\n') ? lines.slice(index, end) : normalized.split('\n').map((part) => part ? `> ${part}` : '>')));
        index = end - 1; continue;
      }
    }
    if (/^ {0,3}<\/?(?:collectionItem|page|card|pageTitle|content|contentPreview|itemsPreview|callout|caption)\b/.test(line)) {
      throw new Error('Craft returned malformed or truncated body structure.');
    }
    // Process a prose run together so multiline code spans stay literal.
    const end = proseEnd(lines, index);
    output.push(inline(lines.slice(index, end).join('\n'), renderers, depth));
    index = end - 1;
  }
  return trimBlankLines(output);
}

/** Normalize Craft's Collection-item Markdown; preserve ordinary Markdown and URLs. */
export function normalizeItemMarkdown(markdown: string, renderers: CraftRenderers = {}, images: NativeImageRendering[] = [], nativeLines: NativeLineRendering[] = []): string {
  const lines = trimBlankLines(markdown.replace(/\r\n?/g, '\n').split('\n'));
  if (!lines.length) return '';
  if (!/^<collectionItem(?:\s+[^>]*)?>$/.test(lines[0]!)) throw new Error('Craft item Markdown is missing its expected Collection item wrapper.');
  if (lines.at(-1) !== '</collectionItem>') throw new Error('Craft returned an unclosed Collection item wrapper.');
  return normalizeBlocks(unwrapContent(lines.slice(1, -1), '  '), renderers, 0, images, nativeLines).join('\n');
}

/** Internal fragment normalization for native rich captions. */
export function normalizeCaption(markdown: string): string {
  return normalizeBlocks(markdown.replace(/^<caption>/, '').replace(/<\/caption>$/, '').split('\n'), {}).join('\n');
}
