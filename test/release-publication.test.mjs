import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { assertRegistryArtifact, assertVerifiedProvenance, boundedBody } from '../scripts/verify-publication.mjs';

const archive = Buffer.from('invented tested archive');
const version = '0.1.0-alpha.1';
const sha = 'a'.repeat(40);
const digest = createHash('sha512').update(archive).digest('hex');
function evidence() {
  const statement = {
    _type: 'https://in-toto.io/Statement/v1', predicateType: 'https://slsa.dev/provenance/v1',
    subject: [{ name: `pkg:npm/astro-loader-craft-do@${version}`, digest: { sha512: digest } }],
    predicate: {
      buildDefinition: {
        buildType: 'https://slsa-framework.github.io/github-actions-buildtypes/workflow/v1',
        externalParameters: { workflow: { repository: 'https://github.com/szymonchudy/astro-loader-craft-do', path: '.github/workflows/publish.yml', ref: 'refs/heads/main' } },
        resolvedDependencies: [{ uri: 'git+https://github.com/szymonchudy/astro-loader-craft-do@refs/heads/main', digest: { gitCommit: sha } }],
      },
      runDetails: { builder: { id: 'https://github.com/actions/runner/github-hosted' } },
    },
  };
  return { statement, audit: () => ({ invalid: [], missing: [], verified: [{ name: 'astro-loader-craft-do', version, attestationBundles: [{ predicateType: statement.predicateType, bundle: { dsseEnvelope: { payloadType: 'application/vnd.in-toto+json', payload: Buffer.from(JSON.stringify(statement)).toString('base64') } } }] }] }) };
}

test('verified provenance binds exact archive bytes, source SHA and main publishing workflow', () => {
  const fixture = evidence();
  assertVerifiedProvenance(fixture.audit(), archive, version, sha);
  fixture.statement.predicate.buildDefinition.resolvedDependencies[0].digest.gitCommit = 'b'.repeat(40);
  assert.throws(() => assertVerifiedProvenance(fixture.audit(), archive, version, sha), /another source commit/);
});

test('missing or wrong provenance and invalid registry signatures stop tag promotion', () => {
  assert.throws(() => assertVerifiedProvenance({ invalid: [], missing: [], verified: [] }, archive, version, sha));
  const fixture = evidence();
  fixture.statement.predicate.buildDefinition.externalParameters.workflow.path = '.github/workflows/unreviewed.yml';
  assert.throws(() => assertVerifiedProvenance(fixture.audit(), archive, version, sha));
  const broken = evidence().audit();
  broken.invalid = [{ code: 'EATTESTATIONVERIFY' }];
  assert.throws(() => assertVerifiedProvenance(broken, archive, version, sha));
});

test('matching registry metadata cannot hide changed archive bytes', () => {
  const metadata = { name: 'astro-loader-craft-do', version, dist: { integrity: 'sha512-' + createHash('sha512').update(archive).digest('base64') } };
  assertRegistryArtifact(metadata, archive, archive, version);
  assert.throws(() => assertRegistryArtifact(metadata, Buffer.from('wrong bytes'), archive, version), /Actual registry bytes/);
  assert.throws(() => assertRegistryArtifact({ ...metadata, version: '0.1.0-alpha.0' }, archive, archive, version));
});

test('registry verification rejects oversized and interrupted bodies', async () => {
  await assert.rejects(boundedBody(new Response(new Uint8Array(5)), 4), /verification limit/);
  const stream = new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(2)); controller.error(new Error('interrupted fixture')); } });
  await assert.rejects(boundedBody(new Response(stream)), /interrupted fixture/);
  assert.equal((await boundedBody(new Response('safe'), 4)).toString(), 'safe');
});

test('release workflow leaves both consumer tags untouched until verification succeeds', async () => {
  const { readFile } = await import('node:fs/promises');
  const workflow = await readFile(new URL('../.github/workflows/publish.yml', import.meta.url), 'utf8');
  const publication = workflow.indexOf('npm publish ');
  const verification = workflow.indexOf('node scripts/verify-publication.mjs', publication);
  const alpha = workflow.indexOf('npm dist-tag add "astro-loader-craft-do@$EXPECTED_VERSION" alpha');
  const latest = workflow.indexOf('npm dist-tag add "astro-loader-craft-do@$EXPECTED_VERSION" latest');
  assert(publication >= 0 && publication < verification && verification < alpha && alpha < latest);
  const initialCommand = workflow.slice(publication).split('\n')[0];
  assert(initialCommand.includes('--tag "verification-$EXPECTED_VERSION"'));
  assert(!/--tag (?:alpha|latest)(?:\s|$)/.test(initialCommand));
});
