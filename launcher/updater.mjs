// Installe une mise à jour : ne télécharge que les fichiers changés, vérifie chaque empreinte,
// prépare la nouvelle version dans dist.update/ puis remplace dist/ d'un coup (avec retour arrière).
// La sauvegarde du joueur est hors de dist/ : elle n'est jamais touchée.
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { MANIFEST_NAME, planUpdate, sha256Buffer, sha256File, validateManifest } from './update-lib.mjs';

export function readInstalledManifest(distDir) {
  try {
    return validateManifest(JSON.parse(fs.readFileSync(path.join(distDir, MANIFEST_NAME), 'utf8')));
  } catch {
    return null;
  }
}

/** Si le programme s'est arrêté entre les deux renommages, on remet l'ancienne version en place. */
export function recoverInterruptedUpdate(distDir) {
  const stage = `${distDir}.update`;
  const old = `${distDir}.old`;
  if (!fs.existsSync(distDir) && fs.existsSync(old)) fs.renameSync(old, distDir);
  fs.rmSync(stage, { recursive: true, force: true });
  if (fs.existsSync(distDir)) fs.rmSync(old, { recursive: true, force: true });
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Windows refuse de renommer un dossier dont un fichier est ouvert : quelques essais courts avant d'abandonner. */
async function renameWithRetry(from, to) {
  let lastError;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      await fsp.rename(from, to);
      return;
    } catch (error) {
      lastError = error;
      if (!['EPERM', 'EBUSY', 'EACCES'].includes(error.code)) break;
      await wait(150 * (attempt + 1));
    }
  }
  throw lastError;
}

function stagedPath(stage, relative) {
  return path.join(stage, ...relative.split('/'));
}

/**
 * @param {{ distDir: string, remote: object, source: { download(file): Promise<Buffer> }, onProgress?: (p: object) => void }} options
 */
export async function applyUpdate({ distDir, remote, source, onProgress = () => {} }) {
  const manifest = validateManifest(remote);
  recoverInterruptedUpdate(distDir);
  const installed = readInstalledManifest(distDir);
  if (!installed) throw new Error('Version installée inconnue (pas de manifeste) : mise à jour impossible');

  const plan = planUpdate(installed, manifest);
  const stage = `${distDir}.update`;
  const old = `${distDir}.old`;
  const toDownload = [...plan.download];
  let reusedFiles = 0;
  let downloadedBytes = 0;
  const totalDownloadBytes = plan.downloadBytes;

  try {
    await fsp.mkdir(stage, { recursive: true });

    // Fichiers déjà présents : on les copie, après avoir vérifié qu'ils sont intacts.
    for (const file of plan.reuse) {
      const source_ = path.join(distDir, ...file.from.split('/'));
      let intact = false;
      try {
        intact = (await sha256File(source_)) === file.sha256;
      } catch {
        intact = false;
      }
      if (!intact) {
        toDownload.push({ path: file.path, sha256: file.sha256, size: file.size });
        continue;
      }
      const target = stagedPath(stage, file.path);
      await fsp.mkdir(path.dirname(target), { recursive: true });
      await fsp.copyFile(source_, target);
      reusedFiles++;
    }

    // Fichiers nouveaux ou modifiés : téléchargement, puis contrôle de la taille et de l'empreinte.
    let doneFiles = 0;
    const expectedBytes = toDownload.reduce((sum, file) => sum + file.size, 0) || totalDownloadBytes;
    for (const file of toDownload) {
      // Un fichier vide n'est jamais publié (GitHub refuse les fichiers de 0 octet) : on le recrée, puis on vérifie l'empreinte.
      const data = file.size === 0 ? Buffer.alloc(0) : await source.download(file);
      if (data.length !== file.size) throw new Error(`Taille inattendue pour ${file.path}`);
      if (sha256Buffer(data) !== file.sha256) throw new Error(`Empreinte incorrecte pour ${file.path}`);
      const target = stagedPath(stage, file.path);
      await fsp.mkdir(path.dirname(target), { recursive: true });
      await fsp.writeFile(target, data);
      doneFiles++;
      downloadedBytes += data.length;
      onProgress({ doneFiles, totalFiles: toDownload.length, doneBytes: downloadedBytes, totalBytes: expectedBytes });
    }

    await fsp.writeFile(path.join(stage, MANIFEST_NAME), JSON.stringify(manifest));

    // Bascule : l'ancienne version est mise de côté, la nouvelle prend sa place.
    await renameWithRetry(distDir, old);
    try {
      await renameWithRetry(stage, distDir);
    } catch (error) {
      await renameWithRetry(old, distDir);
      throw error;
    }
  } catch (error) {
    await fsp.rm(stage, { recursive: true, force: true });
    throw error;
  }
  await fsp.rm(old, { recursive: true, force: true });

  const fromNetwork = toDownload.filter((file) => file.size > 0);
  return {
    version: manifest.version,
    downloadedFiles: fromNetwork.length,
    downloadedBytes,
    reusedFiles,
    removedFiles: plan.remove.length,
  };
}
