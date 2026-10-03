import { mkdtempSync, mkdirSync, writeFileSync, symlinkSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
// Optional local dogfood probe; never reads the blog's content or credentials.
// Usage: pnpm build, then node scripts/verify-blog-callout.mjs /path/to/chudy-me
if (!process.argv[2]) throw new Error('Provide the chudy-me checkout path.');
const blog = resolve(process.argv[2]);
const loader = fileURLToPath(new URL('../', import.meta.url));
const root = mkdtempSync(join(tmpdir(), 'craft-insight-'));
mkdirSync(join(root, 'node_modules/@astrojs'), { recursive: true });
mkdirSync(join(root, 'src/pages'), { recursive: true });
for (const name of ['astro', '@astrojs/markdown-satteri']) {
  symlinkSync(join(blog, 'node_modules', name), join(root, 'node_modules', name));
}
symlinkSync(loader, join(root, 'node_modules/astro-loader-craft-do'));
writeFileSync(join(root, 'package.json'), JSON.stringify({ name: 'craft-insight-probe', type: 'module', private: true }));
writeFileSync(join(root, 'astro.config.mjs'), `import { defineConfig } from 'astro/config';
import { satteri } from '@astrojs/markdown-satteri';
import callout from ${JSON.stringify(pathToFileURL(join(blog, 'src/plugins/satteri-callout.mjs')).href)};
export default defineConfig({ markdown: { processor: satteri({ mdastPlugins: [callout] }) } });`);
const body = readFileSync(join(loader, 'examples/basic/src/fixture-body.txt'), 'utf8');
writeFileSync(join(root, 'src/content.config.ts'), `import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { craftCollection } from 'astro-loader-craft-do';
import { blogRenderers } from ${JSON.stringify(pathToFileURL(join(loader, 'scripts/fixtures/blog-renderers.mjs')).href)};
const saved = globalThis.fetch;
globalThis.fetch = async (input) => String(input).includes('/items')
  ? Response.json({items:[{id:'synthetic',title:'Craft insight prototype',properties:{slug:'synthetic',status:'published'}}]})
  : new Response(${JSON.stringify(body)});
let loader;
try {
  loader = craftCollection({apiUrl:'https://connect.craft.do/link/synthetic/api/v1',apiKey:'synthetic',collectionId:'synthetic',
    renderers: blogRenderers});
} finally { globalThis.fetch = saved; }
export const collections = { articles: defineCollection({ loader, schema: z.object({ title: z.string().min(1), properties: z.object({ slug: z.string().min(1), status: z.enum(['draft','published']), tags: z.array(z.string()).default([]) }) }) }) };`);
writeFileSync(join(root, 'src/pages/index.astro'), `---
import { getCollection, render } from 'astro:content';
const [article] = await getCollection('articles');
const { Content } = await render(article!);
---
<html lang="en"><head><meta charset="utf-8"/><title>Craft insight prototype</title></head><body><h1>{article!.data.title}</h1><Content /></body></html>`);
const result = spawnSync(process.execPath, [join(blog, 'node_modules/astro/bin/astro.mjs'), 'build', '--root', root], { cwd: root, encoding: 'utf8', timeout: 120000, env: { ...process.env, ASTRO_TELEMETRY_DISABLED: '1' } });
assert.ifError(result.error);
assert.equal(result.status, 0, result.stdout + result.stderr);
const html = readFileSync(join(root, 'dist/index.html'), 'utf8');
assert.match(html, /<aside class="callout-aside callout-aside--insight" role="note">/);
assert.match(html, /<span class="callout-aside__label">Insight<\/span>/);
assert.match(html, /<strong>emphasis<\/strong>/);
assert.match(html, /<code>code<\/code>/);
assert.match(html, /<\/aside>\s*<p>After the callout\.<\/p>/);
assert.match(html, /<details class="callout-collapsible">\s*<summary>Why this matters<\/summary>/);
assert.match(html, /<li>This explanation should start collapsed\.<\/li>/);
assert.match(html, /<summary>Nested explanation<\/summary>/);
assert.match(html, /class="callout-content"/);
assert.match(html, /<li>Nested note<\/li>/);
assert.doesNotMatch(html, /<details[^>]*\bopen\b/);
assert.doesNotMatch(html, /\|# insight|<callout[\s>]/);
console.log('PASS: public loader -> consumer adapter -> blog Satteri pipeline; insight asides, rich callouts, nested closed details, lists, and inline formatting.');
console.log('Prototype:', root);
