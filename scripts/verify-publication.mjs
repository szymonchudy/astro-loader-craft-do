import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { appendFile, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const name = 'astro-loader-craft-do';
const repository = 'https://github.com/szymonchudy/astro-loader-craft-do';
const hash = (bytes, algorithm = 'sha512', encoding = 'hex') => createHash(algorithm).update(bytes).digest(encoding);

export function assertRegistryArtifact(document, registryBytes, archive, version) {
  assert.equal(document.name, name);
  assert.equal(document.version, version);
  assert.equal(document.dist?.integrity, `sha512-${hash(archive, 'sha512', 'base64')}`, 'Registry integrity differs from the tested archive');
  assert.equal(hash(registryBytes), hash(archive), 'Actual registry bytes differ from the tested archive');
}

/** npm audit signatures verifies cryptography; this additionally binds its verified statement to our candidate. */
export function assertVerifiedProvenance(audit, archive, version, sha) {
  assert.deepEqual(audit.invalid, [], 'Registry signature or attestation verification failed');
  assert.deepEqual(audit.missing, [], 'A registry signature is missing');
  const packages = (audit.verified ?? []).filter(item => item.name === name && item.version === version);
  assert.equal(packages.length, 1, 'The release must have a cryptographically verified attestation');
  const provenance = packages[0].attestationBundles.filter(item => item.predicateType === 'https://slsa.dev/provenance/v1');
  assert.equal(provenance.length, 1, 'The release must have exactly one verified SLSA provenance statement');
  assert.equal(provenance[0].bundle.dsseEnvelope.payloadType, 'application/vnd.in-toto+json');
  const statement = JSON.parse(Buffer.from(provenance[0].bundle.dsseEnvelope.payload, 'base64').toString('utf8'));
  assert.equal(statement._type, 'https://in-toto.io/Statement/v1');
  assert.equal(statement.predicateType, 'https://slsa.dev/provenance/v1');
  assert.deepEqual(statement.subject, [{ name: `pkg:npm/${name}@${version}`, digest: { sha512: hash(archive) } }]);
  const definition = statement.predicate.buildDefinition;
  assert.equal(definition.buildType, 'https://slsa-framework.github.io/github-actions-buildtypes/workflow/v1');
  assert.deepEqual(definition.externalParameters.workflow, { repository, path: '.github/workflows/publish.yml', ref: 'refs/heads/main' });
  assert(definition.resolvedDependencies.some(item => item.uri === `git+${repository}@refs/heads/main` && item.digest?.gitCommit === sha), 'Verified provenance points at another source commit');
  assert.equal(statement.predicate.runDetails.builder.id, 'https://github.com/actions/runner/github-hosted');
}

export async function boundedBody(response, limit = 8 * 1024 * 1024) {
  const chunks = [];
  let length = 0;
  try {
    for await (const chunk of response.body) {
      length += chunk.length;
      assert(length <= limit, 'Registry response exceeds the release verification limit');
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  } catch (error) {
    if (!response.body.locked) await response.body.cancel().catch(() => {});
    throw error;
  }
}

async function readRegistry(url, missing = false) {
  const target = new URL(url);
  assert.equal(target.origin, 'https://registry.npmjs.org', 'Read release evidence only from the public npm registry');
  const response = await fetch(target, { redirect: 'error', signal: AbortSignal.timeout(20_000) });
  if (missing && response.status === 404) { await response.body?.cancel(); return null; }
  assert(response.ok, `Registry verification failed with HTTP ${response.status}`);
  return boundedBody(response);
}

async function verify(archiveFile, version, sha, preflight) {
  assert.match(version, /^0\.1\.0-alpha\.\d+$/);
  assert.match(sha, /^[a-f0-9]{40}$/);
  const archive = await readFile(archiveFile);
  const metadata = await readRegistry(`https://registry.npmjs.org/${name}`, preflight);
  if (!metadata) return false;
  const packument = JSON.parse(metadata);
  assert.equal(packument.name, name);
  assert(packument.versions && typeof packument.versions === 'object', 'Malformed package metadata');
  const document = packument.versions[version];
  if (!document && preflight) return false;
  assert(document, 'The expected release is absent from the registry');
  const bytes = await readRegistry(document.dist.tarball);
  assertRegistryArtifact(document, bytes, archive, version);
  if (preflight) return true;
  assert(document.dist.attestations?.provenance, 'The release has no provenance');
  const work = await mkdtemp(join(tmpdir(), 'craft-provenance-'));
  try {
    await writeFile(join(work, 'package.json'), JSON.stringify({ name: 'craft-provenance-check', private: true, dependencies: { [name]: version } }));
    await writeFile(join(work, '.npmrc'), 'registry=https://registry.npmjs.org/\n');
    const env = Object.fromEntries(['PATH', 'HOME', 'TMPDIR', 'SYSTEMROOT'].filter(key => process.env[key]).map(key => [key, process.env[key]]));
    Object.assign(env, { npm_config_userconfig: join(work, '.npmrc'), npm_config_cache: join(work, 'cache') });
    const options = { cwd: work, env, encoding: 'utf8', timeout: 180_000, maxBuffer: 8 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] };
    execFileSync('npm', ['install', '--ignore-scripts', '--legacy-peer-deps', '--no-audit', '--no-fund'], options);
    const audit = JSON.parse(execFileSync('npm', ['audit', 'signatures', '--json', '--include-attestations'], options));
    assertVerifiedProvenance(audit, archive, version, sha);
  } finally { await rm(work, { recursive: true, force: true }); }
  console.log('Actual registry bytes, signatures and provenance match the tested archive and exact source workflow/SHA.');
  return true;
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const [archive, version, sha, mode] = process.argv.slice(2);
  assert(!mode || mode === '--preflight');
  const exists = await verify(archive, version, sha, mode === '--preflight');
  if (mode === '--preflight') {
    assert(process.env.GITHUB_OUTPUT, 'Preflight output requires the workflow output file');
    await appendFile(process.env.GITHUB_OUTPUT, `exists=${exists}\n`);
  }
}
