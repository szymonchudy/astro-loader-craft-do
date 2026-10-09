import assert from 'node:assert/strict';

// npm 12 emits a name-keyed object; earlier CLIs emit an array. Prepack
// output may precede either JSON document, so consider complete root lines.
export function parsePackManifest(stdout, name) {
  for (const match of stdout.matchAll(/^[\[{]/gm)) {
    let parsed;
    try { parsed = JSON.parse(stdout.slice(match.index)); } catch { continue; }
    const entries = Array.isArray(parsed) ? parsed : Object.values(parsed);
    assert.equal(entries.length, 1, 'Packing must produce exactly one artifact');
    const manifest = entries[0];
    assert.equal(manifest.name, name, 'Packed artifact name differs');
    assert(Array.isArray(manifest.files) && typeof manifest.filename === 'string', 'Malformed pack manifest');
    return manifest;
  }
  throw new Error('npm pack did not return a complete JSON manifest');
}
