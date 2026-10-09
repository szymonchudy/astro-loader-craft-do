import assert from 'node:assert/strict';
import { parsePackManifest } from './pack-manifest.mjs';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { copyFileSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Network installs are intentional; this is separate from the portable unit suite.
// Usage: pnpm test:package [exact-version ...] [--tarball path | --registry] [--blog path]
const repo = fileURLToPath(new URL('../', import.meta.url));
const args = process.argv.slice(2);
const metadata = JSON.parse(readFileSync(join(repo, 'package.json'), 'utf8'));
const tarballIndex = args.indexOf('--tarball');
let suppliedTarball;
if (tarballIndex !== -1) {
  assert.ok(args[tarballIndex + 1] && !args[tarballIndex + 1].startsWith('--'), '--tarball requires an archive path');
  suppliedTarball = resolve(args[tarballIndex + 1]);
  args.splice(tarballIndex, 2);
}
const registryIndex = args.indexOf('--registry');
const registry = registryIndex !== -1;
if (registry) args.splice(registryIndex, 1);
assert.ok(!(registry && suppliedTarball), 'Choose --registry or --tarball, not both');
const blogIndex = args.indexOf('--blog');
let blog;
if (blogIndex !== -1) {
  assert.ok(args[blogIndex + 1], '--blog requires a checkout path');
  blog = resolve(args[blogIndex + 1]);
  args.splice(blogIndex, 2);
}
const verifiedVersions = ['5.9.0', '5.18.2', '6.0.0', '6.4.8', '7.3.3', '7.3.5'];
const versions = args.length ? args : verifiedVersions;
assert.ok(versions.every(version => /^\d+\.\d+\.\d+$/.test(version)), 'Use exact stable Astro versions');
const blogVersion = blog && JSON.parse(readFileSync(join(blog, 'node_modules/astro/package.json'), 'utf8')).version;
if (blogVersion) assert.ok(versions.includes(blogVersion), 'Include the installed blog Astro version in the matrix');
const work = mkdtempSync(join(tmpdir(), 'craft-package-'));
const cache = join(work, 'npm-cache');
// Do not forward Craft credentials, NODE_PATH, or unrelated application settings.
const env = Object.fromEntries(['PATH', 'HOME', 'TMPDIR', 'SYSTEMROOT'].filter(key => process.env[key]).map(key => [key, process.env[key]]));
Object.assign(env, { ASTRO_TELEMETRY_DISABLED: '1', npm_config_cache: cache, npm_config_registry: 'https://registry.npmjs.org', npm_config_userconfig: join(work, 'empty.npmrc') });
writeFileSync(env.npm_config_userconfig, '');

async function run(command, parameters, cwd, extra = {}, success = true) {
  const child = spawn(command, parameters, { cwd, env: { ...env, ...extra }, stdio: ['ignore', 'pipe', 'pipe'] });
  let output = '';
  let stdout = '';
  child.stdout.on('data', data => { output += data; stdout += data; });
  child.stderr.on('data', data => { output += data; });
  const timeout = setTimeout(() => child.kill('SIGTERM'), 180_000);
  const code = await new Promise((res, rej) => { child.on('error', rej); child.on('close', res); }).finally(() => clearTimeout(timeout));
  writeFileSync(join(cwd === repo ? work : cwd, 'last-command.log'), output);
  if (success) assert.equal(code, 0, `${command} ${parameters.join(' ')} failed:\n${output}`);
  return { code, output, stdout };
}

console.log(`Isolated package consumers: ${work}`);
const expected = ['LICENSE', 'README.md', 'package.json', ...['asset-rendering', 'budget', 'craft-client', 'images', 'index', 'loader', 'normalize', 'transport'].flatMap(name => [`dist/${name}.js`, `dist/${name}.d.ts`])].sort();
let manifest;
let tarball = suppliedTarball;
if (tarball) {
  // Validate and install these exact bytes, without repacking or rebuilding.
  const listing = await run('tar', ['-tzf', tarball], repo);
  manifest = {
    filename: basename(tarball),
    integrity: `sha512-${createHash('sha512').update(readFileSync(tarball)).digest('base64')}`,
    files: listing.stdout.trim().split('\n').map(path => ({ path: path.replace(/^package\//, '') })),
  };
} else {
  // A local pack runs prepack. Registry verification downloads the published artifact.
  const parameters = ['pack', ...(registry ? [`${metadata.name}@${metadata.version}`, '--ignore-scripts'] : []), '--json', '--pack-destination', work];
  const packed = await run('npm', parameters, repo);
  manifest = parsePackManifest(packed.stdout, metadata.name);
  tarball = join(work, manifest.filename);
}
assert.deepEqual(manifest.files.map(file => file.path).sort(), expected, 'Unexpected tarball file set');
console.log(`Verified artifact: ${tarball}`);
const results = [];
const { default: sharp } = await import('sharp');
const nativeBytes = await sharp({ create: { width: 320, height: 180, channels: 3, background: '#aabbcc' } }).png().toBuffer();

function assertClosedNestedDetails(html) {
  let depth = 0;
  let deepest = 0;
  for (const [tag] of html.matchAll(/<\/?details\b[^>]*>/g)) {
    if (tag.startsWith('</')) depth--;
    else {
      assert.doesNotMatch(tag, /\bopen\b/);
      deepest = Math.max(deepest, ++depth);
    }
    assert.ok(depth >= 0, 'Unbalanced details markup');
  }
  assert.equal(depth, 0);
  assert.ok(deepest >= 2, 'Expected details nested inside details');
}

function assertDefault(html) {
  assert.match(html, /Synthetic article/);
  assert.match(html, /Status: published/);
  assert.match(html, /Tags: 0/);
  assert.match(html, /<h2[^>]*>Synthetic body<\/h2>/);
  assert.match(html, /Rendered through <strong>Astro<\/strong>/);
  assert.match(html, /<aside data-craft-callout(?:="")? role="note">\s*<p>Keep <strong>emphasis<\/strong> and <code>code<\/code>\.<\/p>\s*<\/aside>\s*<p>After the callout\.<\/p>/);
  assert.match(html, /<blockquote>\s*<p>An ordinary quotation\.<\/p>\s*<\/blockquote>/);
  assert.match(html, /<details>\s*<summary>Why this matters<\/summary>[\s\S]*<details>\s*<summary>Nested explanation<\/summary>[\s\S]*<strong>Nested body<\/strong>/);
  assert.match(html, /<li>Nested note<\/li>/);
  assertClosedNestedDetails(html);
  assert.match(html, /<mark><strong>highlighted<\/strong> phrase<\/mark>/);
  assert.match(html, /<em>An <em>image caption<\/em>\.<\/em>/);
  assert.match(html, /<h3[^>]*>Nested page<\/h3>/);
  assert.match(html, /<table>[\s\S]*<td>Preserved<\/td>/);
  assert.match(html, /href="https:\/\/example.com\/article"/);
  assert.match(html, /src="https:\/\/example.com\/image.png"/);
  assert.doesNotMatch(html, /<(?:collectionItem|content|callout|highlight|caption|page)[\s>]/);
}

for (const version of versions) {
  console.log(`Installing clean Astro ${version} consumer…`);
  const root = join(work, `astro-${version}`);
  mkdirSync(join(root, 'src/pages'), { recursive: true });
  writeFileSync(join(root, 'package.json'), JSON.stringify({ name: 'craft-package-consumer', private: true, type: 'module', dependencies: { astro: version, 'astro-loader-craft-do': `file:${tarball}` }, devDependencies: { '@astrojs/check': '0.9.10', typescript: '6.0.3', '@types/node': '24.19.1' } }, null, 2));
  writeFileSync(join(root, 'tsconfig.json'), JSON.stringify({ extends: 'astro/tsconfigs/strict', compilerOptions: { noUncheckedIndexedAccess: true, exactOptionalPropertyTypes: true }, include: ['.astro/types.d.ts', 'src/**/*'] }));
  writeFileSync(join(root, 'astro.config.mjs'), "import { defineConfig } from 'astro/config'; export default defineConfig({});\n");
  for (const name of ['content.config.ts', 'boundary.typecheck.ts']) copyFileSync(join(repo, 'scripts/fixtures/package-consumer', name), join(root, 'src', name));
  copyFileSync(join(repo, 'scripts/fixtures/package-consumer/index.astro'), join(root, 'src/pages/index.astro'));
  copyFileSync(join(repo, 'examples/basic/src/fixture-body.txt'), join(root, 'src/fixture-body.txt'));
  copyFileSync(join(repo, 'examples/basic/src/inference.typecheck.ts'), join(root, 'src/inference.typecheck.ts'));
  copyFileSync(join(repo, 'scripts/fixtures/blog-renderers.mjs'), join(root, 'src/blog-renderers.mjs'));
  writeFileSync(join(root, 'src/native.png'), nativeBytes);
  await run('npm', ['install', '--no-audit', '--no-fund', '--fetch-retries=0', '--fetch-timeout=30000'], root);
  const installed = join(root, 'node_modules/astro-loader-craft-do');
  assert.equal(lstatSync(installed).isSymbolicLink(), false);
  assert.equal(realpathSync(installed), realpathSync(root) + '/node_modules/astro-loader-craft-do');
  assert.equal(existsSync(join(installed, 'src')), false);
  const packageMetadata = JSON.parse(readFileSync(join(installed, 'package.json'), 'utf8'));
  assert.equal(packageMetadata.name, 'astro-loader-craft-do');
  assert.equal(packageMetadata.license, 'MIT');
  assert.notEqual(packageMetadata.private, true);
  assert.equal(packageMetadata.version, metadata.version);
  assert.deepEqual(packageMetadata.engines, metadata.engines);
  assert.deepEqual(packageMetadata.publishConfig, metadata.publishConfig);
  assert.deepEqual(packageMetadata.repository, metadata.repository);
  assert.equal(packageMetadata.peerDependencies.astro, verifiedVersions.join(' || '));
  assert.deepEqual(packageMetadata.exports, { '.': { types: './dist/index.d.ts', import: './dist/index.js' } });
  assert.deepEqual(packageMetadata.files, ['dist']);
  assert.deepEqual(Object.keys(packageMetadata.dependencies), ['sharp'], 'Only the raster validator is a runtime dependency');
  const astroPackage = JSON.parse(readFileSync(join(root, 'node_modules/astro/package.json'), 'utf8'));
  assert.equal(astroPackage.version, version);
  const installedFiles = [];
  function files(directory, prefix = '') {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const name = prefix + entry.name;
      if (entry.isDirectory()) { if (entry.name !== 'node_modules') files(join(directory, entry.name), name + '/'); }
      else installedFiles.push(name);
    }
  }
  files(installed);
  assert.deepEqual(installedFiles.sort(), expected);
  await run(process.execPath, ['--input-type=module', '-e', `import assert from 'node:assert/strict';
    const api = await import('astro-loader-craft-do');
    assert.deepEqual(Object.keys(api), ['craftCollection']);
    for (const path of ['astro-loader-craft-do/dist/normalize.js', 'astro-loader-craft-do/src/index.ts', 'astro-loader-craft-do/package.json']) {
      await assert.rejects(import(path), { code: 'ERR_PACKAGE_PATH_NOT_EXPORTED' });
    }`], root);
  const cli = join(root, 'node_modules/astro', astroPackage.bin.astro);
  const build = (extra = {}, success = true) => run(process.execPath, [cli, 'build'], root, extra, success);
  const html = () => readFileSync(join(root, 'dist/index.html'), 'utf8');
  await build({ PACKAGE_NATIVE: 'enabled' });
  assert.match(html(), /alt="Native \*literal\* _word_ `code` &amp;copy; image"/);
  assert.match(html(), /Native <strong>rich<\/strong>/);
  assert.match(html(), /src="\/_astro\//);
  assert.doesNotMatch(html(), /r\.craft\.do|signature=|__ASTRO_IMAGE_/);
  assert.equal((html().match(/<figure data-craft-image/g) ?? []).length, 1);
  await build();
  assertDefault(html());
  await run(process.execPath, [cli, 'check'], root);
  await build({ PACKAGE_LINES: 'enabled' });
  assert.match(html(), /<hr\s*\/?\s*>/);
  assert.doesNotMatch(html(), /data-consumer-line/);
  await build({ PACKAGE_LINES: 'enabled', PACKAGE_RENDERER: 'custom' });
  assert.match(html(), /<hr data-consumer-line="separator" data-weight="strong" data-family="doodle"/);
  await build({ PACKAGE_RENDERER: 'custom' });
  assert.match(html(), /Consumer choice: Keep <strong>emphasis<\/strong>/);
  assert.match(html(), /Consumer details: Why this matters/);
  assert.match(html(), /Consumer page: Nested page/);
  assert.match(html(), /Caption: An/);
  assert.doesNotMatch(html(), /<details>|<mark>|data-craft-callout/);
  for (const field of ['status', 'slug', 'tags', 'title', 'refinement']) {
    const invalid = await build({ PACKAGE_INVALID: field }, false);
    assert.notEqual(invalid.code, 0, `Invalid ${field} unexpectedly built`);
    assert.match(invalid.output, /InvalidContentEntryDataError/);
    assert.match(invalid.output, /synthetic-item/);
    assert.match(invalid.output, new RegExp(field === 'refinement' ? 'title' : field));
  }
  await build({ PACKAGE_FRONTMATTER: 'enabled' });
  assert.match(html(), /<h1>Synthetic article<\/h1>/); // Body metadata must not override parsed data.
  assert.match(html(), /After frontmatter/);
  const bodyFrontmatterVisible = html().includes('Body-only title');
  assert.equal(bodyFrontmatterVisible, version.startsWith('5.'));
  await build({ PACKAGE_EMPTY: 'enabled' });
  assert.match(html(), /Entries: 0/);
  assert.doesNotMatch(html(), /Synthetic article|Synthetic body/); // Cached stale entries removed.
  await build();
  assertDefault(html());

  if (version === blogVersion) {
    const satteriVersion = JSON.parse(readFileSync(join(blog, 'node_modules/@astrojs/markdown-satteri/package.json'), 'utf8')).version;
    await run('npm', ['install', '--save-exact', `@astrojs/markdown-satteri@${satteriVersion}`, '--no-audit', '--no-fund', '--fetch-retries=0', '--fetch-timeout=30000'], root);
    // Copy renderer code into the isolated consumer only; never content, config, or credentials.
    copyFileSync(join(blog, 'src/plugins/satteri-callout.mjs'), join(root, 'src/satteri-callout.mjs'));
    writeFileSync(join(root, 'astro.config.mjs'), "import { defineConfig } from 'astro/config'; import { satteri } from '@astrojs/markdown-satteri'; import callout from './src/satteri-callout.mjs'; export default defineConfig({ markdown: { processor: satteri({ mdastPlugins: [callout] }) } });\n");
    await build({ PACKAGE_RENDERER: 'blog' });
    assert.match(html(), /<aside class="callout-aside callout-aside--insight" role="note">/);
    assert.match(html(), /<span class="callout-aside__label">Insight<\/span>/);
    assert.match(html(), /<strong>emphasis<\/strong>/);
    assert.match(html(), /<code>code<\/code>/);
    assert.match(html(), /<\/aside>\s*<p>After the callout\.<\/p>/);
    assert.match(html(), /<blockquote>\s*<p>An ordinary quotation\.<\/p>/);
    assert.match(html(), /<details class="callout-collapsible">\s*<summary>Why this matters<\/summary>[\s\S]*<details class="callout-collapsible">\s*<summary>Nested explanation<\/summary>/);
    assert.match(html(), /<li>Nested note<\/li>/);
    assert.match(html(), /class="callout-content"/);
    assertClosedNestedDetails(html());
    assert.doesNotMatch(html(), /<details[^>]*\bopen\b|\|# insight/);
    console.log(`PASS blog renderer: Astro ${version}, Sätteri ${satteriVersion}`);
  }
  results.push({ astro: version, node: process.version, passed: true, bodyFrontmatterVisible, blogRenderer: version === blogVersion });
  console.log(`PASS Astro ${version}: exports, shipped files, declarations, schema inference/defaults, rendering, five invalid builds, frontmatter, stale removal`);
}
writeFileSync(join(work, 'results.json'), JSON.stringify({ tarball, source: registry ? 'registry' : 'local', integrity: manifest.integrity, files: expected, results }, null, 2));
console.log(`PASS package matrix (${results.length} versions). Evidence: ${join(work, 'results.json')}`);
