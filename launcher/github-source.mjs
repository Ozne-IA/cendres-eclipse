// Source des mises à jour : les « releases » GitHub du dépôt. Chaque release publie `update-manifest.json`
// et, pour chaque fichier du jeu, un fichier nommé d'après son empreinte SHA-256.
import { validateManifest } from './update-lib.mjs';

const REPO = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const TAG = /^v(\d+\.\d+\.\d+)$/;
const MAX_JSON_BYTES = 2 * 1024 * 1024;

export const DEFAULT_REPO = 'Ozne-IA/cendres-eclipse';

function isLocalTestHost(url) {
  return url.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(url.hostname);
}

/** Seul HTTPS est accepté (HTTP uniquement vers 127.0.0.1, pour les tests). */
function assertSecure(rawUrl) {
  const url = new URL(rawUrl);
  if (url.protocol !== 'https:' && !isLocalTestHost(url)) throw new Error('Adresse de mise à jour non sécurisée');
  return url;
}

async function readLimited(response, maxBytes) {
  const reader = response.body.getReader();
  const chunks = [];
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.length;
    if (received > maxBytes) {
      // On ne l'attend pas : l'annulation d'un flux dupliqué peut rester en suspens.
      reader.cancel().catch(() => {});
      throw new Error('Réponse trop volumineuse');
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}

export function createGithubSource({
  repo = DEFAULT_REPO,
  apiBase = 'https://api.github.com',
  downloadBase = 'https://github.com',
  fetchImpl = fetch,
  timeoutMs = 20000,
} = {}) {
  if (!REPO.test(repo)) throw new Error('Dépôt de mise à jour invalide');
  assertSecure(apiBase);
  assertSecure(downloadBase);

  async function get(url, headers = {}) {
    assertSecure(url);
    const response = await fetchImpl(url, {
      headers: { 'User-Agent': 'cendres-eclipse-updater', ...headers },
      signal: AbortSignal.timeout(timeoutMs),
    });
    // Les téléchargements GitHub sont redirigés vers un autre serveur : on ne suit que du HTTPS.
    if (response.url) assertSecure(response.url);
    if (!response.ok) throw new Error(`Serveur de mise à jour : erreur ${response.status}`);
    return response;
  }
  const assetUrl = (tag, name) => `${downloadBase}/${repo}/releases/download/${tag}/${name}`;

  return {
    /** Dernière version publiée : { tag, version, manifest, releaseUrl }. */
    async latest() {
      const release = JSON.parse(
        (await readLimited(await get(`${apiBase}/repos/${repo}/releases/latest`, { Accept: 'application/vnd.github+json' }), MAX_JSON_BYTES)).toString('utf8')
      );
      const match = TAG.exec(String(release.tag_name));
      if (!match) throw new Error('Numéro de version publié invalide');
      const manifest = validateManifest(
        JSON.parse((await readLimited(await get(assetUrl(release.tag_name, 'update-manifest.json')), MAX_JSON_BYTES)).toString('utf8'))
      );
      if (manifest.version !== match[1]) throw new Error('Le manifeste ne correspond pas à la version publiée');
      return {
        tag: release.tag_name,
        version: manifest.version,
        manifest,
        releaseUrl: `https://github.com/${repo}/releases/tag/${release.tag_name}`,
      };
    },

    /** Télécharge un fichier d'une version donnée. */
    forTag(tag) {
      if (!TAG.test(tag)) throw new Error('Numéro de version invalide');
      return {
        async download(file) {
          const response = await get(assetUrl(tag, file.sha256));
          return readLimited(response, file.size);
        },
      };
    },
  };
}
