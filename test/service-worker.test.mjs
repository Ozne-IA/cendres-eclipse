import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';

test('the service worker loads updated HTML online and the same HTML offline', async () => {
  const origin = 'https://example.test';
  const listeners = new Map();
  const staticAsset = '/assets/index-test.js';
  const html = new Map([['/index.html', 'ancienne version']]);
  const cache = {
    async match(key) {
      if (html.has(key)) return new Response(html.get(key));
    },
    async put(key, response) {
      html.set(key, await response.text());
    },
  };
  let offline = false;
  let networkCalls = 0;
  runInNewContext(readFileSync(new URL('../src/pwa/sw.js', import.meta.url), 'utf8'), {
    BUILD_VERSION: 'tests',
    BUILD_ASSETS: [staticAsset],
    Request,
    Response,
    URL,
    caches: { open: async () => cache },
    self: { location: { origin }, addEventListener: (type, handler) => listeners.set(type, handler) },
    fetch: async (_, options) => {
      networkCalls++;
      assert.equal(options.cache, 'no-cache');
      if (offline) throw new TypeError('Offline');
      return { ok: true, type: 'basic', clone: () => new Response('nouvelle version'), text: async () => 'nouvelle version' };
    },
  });
  function request(path, mode) {
    let response;
    listeners.get('fetch')({
      request: { url: origin + path, method: 'GET', mode },
      respondWith: (value) => { response = value; },
    });
    return response;
  }

  assert.equal(await (await request('/', 'navigate')).text(), 'nouvelle version');
  offline = true;
  assert.equal(await (await request('/?pc_launcher=1', 'navigate')).text(), 'nouvelle version');
  assert.equal(request('/api/save', 'same-origin'), undefined);
  assert.equal(networkCalls, 2);
});
