import assert from 'node:assert/strict';
import test from 'node:test';
import { createGithubSource } from '../launcher/github-source.mjs';
import { sha256Buffer } from '../launcher/update-lib.mjs';

const body = (value) => new Response(typeof value === 'string' ? value : JSON.stringify(value));
const file = { path: 'index.html', sha256: sha256Buffer(Buffer.from('x')), size: 1 };
const manifest = (version) => ({ schema: 1, launcherApi: 1, version, buildId: '', files: [file] });

/** Faux fetch : répond selon la fin de l'adresse demandée. */
function fakeFetch(routes) {
  return async (url) => {
    for (const [suffix, answer] of Object.entries(routes)) {
      if (String(url).endsWith(suffix)) return typeof answer === 'function' ? answer(url) : answer.clone();
    }
    return new Response('absent', { status: 404 });
  };
}

test('the source only talks HTTPS (HTTP is allowed to 127.0.0.1 for tests only)', () => {
  assert.throws(() => createGithubSource({ apiBase: 'http://api.example.com' }), /sécurisée/);
  assert.throws(() => createGithubSource({ downloadBase: 'ftp://example.com' }));
  assert.throws(() => createGithubSource({ repo: 'pas un dépôt' }), /invalide/);
  assert.doesNotThrow(() => createGithubSource({ apiBase: 'http://127.0.0.1:9', downloadBase: 'http://127.0.0.1:9' }));
});

test('latest() reads the release and checks that the manifest matches the tag', async () => {
  const good = createGithubSource({ fetchImpl: fakeFetch({
    '/releases/latest': body({ tag_name: 'v1.2.0' }),
    '/v1.2.0/update-manifest.json': body(manifest('1.2.0')),
  }) });
  const release = await good.latest();
  assert.equal(release.version, '1.2.0');
  assert.equal(release.tag, 'v1.2.0');
  assert.match(release.releaseUrl, /releases\/tag\/v1\.2\.0$/);

  const lying = createGithubSource({ fetchImpl: fakeFetch({
    '/releases/latest': body({ tag_name: 'v1.2.0' }),
    '/v1.2.0/update-manifest.json': body(manifest('9.9.9')),
  }) });
  await assert.rejects(lying.latest(), /ne correspond pas/);

  const oddTag = createGithubSource({ fetchImpl: fakeFetch({ '/releases/latest': body({ tag_name: 'nightly' }) }) });
  await assert.rejects(oddTag.latest(), /invalide/);

  const noRelease = createGithubSource({ fetchImpl: fakeFetch({}) });
  await assert.rejects(noRelease.latest(), /404/);
});

test('download() refuses answers larger than the declared size and non-HTTPS redirects', async () => {
  const source = createGithubSource({ fetchImpl: fakeFetch({ [file.sha256]: body('trop long pour une taille de 1') }) }).forTag('v1.0.0');
  await assert.rejects(source.download(file), /volumineuse/);

  const ok = createGithubSource({ fetchImpl: fakeFetch({ [file.sha256]: body('x') }) }).forTag('v1.0.0');
  assert.equal((await ok.download(file)).toString(), 'x');

  const redirected = createGithubSource({ fetchImpl: async () => {
    const response = new Response('x');
    Object.defineProperty(response, 'url', { value: 'http://evil.example/x' });
    return response;
  } }).forTag('v1.0.0');
  await assert.rejects(redirected.download(file), /sécurisée/);

  assert.throws(() => createGithubSource().forTag('v1.0'), /invalide/);
});
