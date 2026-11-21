// Service de mise à jour du lanceur PC : vérifie s'il existe une version plus récente, l'installe sur demande,
// et expose un état simple que l'interface du jeu affiche.
import { LAUNCHER_API, compareVersions, planUpdate } from './update-lib.mjs';
import { applyUpdate, readInstalledManifest } from './updater.mjs';

const CHECK_COOLDOWN_MS = 30_000;

/**
 * @param {{ distDir: string, source: { latest(): Promise<object>, forTag(tag: string): object } | null, now?: () => number }} options
 * `source` vaut null quand les mises à jour sont désactivées (option --no-update-check).
 */
export function createUpdateService({ distDir, source, now = Date.now }) {
  let state = 'idle';
  let latest = null;
  let error = null;
  let checkedAt = 0;
  let progress = null;
  let installedVersion = null;

  const installed = () => readInstalledManifest(distDir);
  // Une copie sans manifeste est une version de développement : on ne la remplace jamais.
  const enabled = () => source !== null && installed() !== null;

  function isAvailable(current) {
    return !!latest && !!current && compareVersions(latest.version, current.version) > 0;
  }

  function status() {
    const current = installed();
    const available = isAvailable(current);
    const plan = available ? planUpdate(current, latest.manifest) : null;
    return {
      enabled: enabled(),
      state,
      current: current ? { version: current.version, buildId: current.buildId } : null,
      latest: latest ? { version: latest.version, tag: latest.tag, url: latest.releaseUrl } : null,
      available,
      fullDownloadRequired: available && latest.manifest.launcherApi > LAUNCHER_API,
      downloadBytes: plan ? plan.downloadBytes : 0,
      totalBytes: plan ? plan.totalBytes : 0,
      progress,
      installedVersion,
      checkedAt: checkedAt || null,
      error,
    };
  }

  async function check({ force = false } = {}) {
    if (!enabled() || state === 'downloading') return status();
    if (!force && checkedAt && now() - checkedAt < CHECK_COOLDOWN_MS) return status();
    state = 'checking';
    error = null;
    try {
      latest = await source.latest();
      state = isAvailable(installed()) ? 'available' : 'idle';
    } catch (cause) {
      state = 'idle';
      // Hors ligne ou GitHub injoignable : on ne dérange pas le joueur, on garde le message pour l'écran de détails.
      error = 'Impossible de vérifier les mises à jour pour le moment.';
      void cause;
    }
    checkedAt = now();
    return status();
  }

  async function apply() {
    if (state === 'downloading') {
      const busy = new Error('Une mise à jour est déjà en cours');
      busy.code = 'BUSY';
      throw busy;
    }
    if (!enabled() || !isAvailable(installed())) {
      const none = new Error('Aucune mise à jour à installer');
      none.code = 'NONE';
      throw none;
    }
    if (latest.manifest.launcherApi > LAUNCHER_API) {
      const full = new Error('Cette version demande de télécharger le jeu complet');
      full.code = 'FULL_DOWNLOAD';
      throw full;
    }
    state = 'downloading';
    error = null;
    progress = { doneBytes: 0, totalBytes: 0 };
    try {
      const stats = await applyUpdate({
        distDir,
        remote: latest.manifest,
        source: source.forTag(latest.tag),
        onProgress: (p) => { progress = { doneBytes: p.doneBytes, totalBytes: p.totalBytes }; },
      });
      installedVersion = stats.version;
      state = 'installed';
      return stats;
    } catch (cause) {
      state = 'available';
      error = "La mise à jour n'a pas pu être installée. Le jeu reste dans sa version actuelle.";
      throw cause;
    } finally {
      progress = null;
    }
  }

  return { status, check, apply };
}
