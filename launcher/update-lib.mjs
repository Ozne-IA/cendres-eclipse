// Briques communes aux mises à jour : manifeste des fichiers du jeu (chemin, empreinte SHA-256, taille),
// validation stricte (le manifeste vient d'Internet : on ne lui fait jamais confiance) et plan de mise à jour.
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export const MANIFEST_NAME = 'update-manifest.json';
/** Version de l'interface entre le lanceur et le format de mise à jour. Une version complète est requise si elle monte. */
export const LAUNCHER_API = 1;

const MAX_FILES = 2000;
const MAX_FILE_BYTES = 200 * 1024 * 1024;
const MAX_TOTAL_BYTES = 1024 * 1024 * 1024;
const SAFE_SEGMENT = /^[A-Za-z0-9._@+-]+$/;
const SHA256 = /^[0-9a-f]{64}$/;
const SEMVER = /^\d+\.\d+\.\d+$/;

export function sha256Buffer(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

export async function sha256File(filePath) {
  const hash = createHash('sha256');
  for await (const chunk of fs.createReadStream(filePath)) hash.update(chunk);
  return hash.digest('hex');
}

function listFilesRecursive(root, directory = '') {
  const found = [];
  for (const dirent of fs.readdirSync(path.join(root, directory), { withFileTypes: true })) {
    const relative = directory ? `${directory}/${dirent.name}` : dirent.name;
    if (dirent.isDirectory()) found.push(...listFilesRecursive(root, relative));
    else if (dirent.isFile()) found.push(relative);
  }
  return found;
}

/** Liste triée des fichiers d'un dossier (chemins relatifs avec des /), sans le manifeste lui-même. */
export function listFiles(root) {
  return listFilesRecursive(root).filter((file) => file !== MANIFEST_NAME).sort();
}

export async function buildManifest(distDir, { version, buildId = '' }) {
  const files = [];
  for (const relative of listFiles(distDir)) {
    const absolute = path.join(distDir, ...relative.split('/'));
    files.push({ path: relative, sha256: await sha256File(absolute), size: fs.statSync(absolute).size });
  }
  return { schema: 1, launcherApi: LAUNCHER_API, version, buildId, createdAt: new Date().toISOString(), files };
}

export function isSafeRelativePath(candidate) {
  if (typeof candidate !== 'string' || candidate === '' || candidate === MANIFEST_NAME) return false;
  const segments = candidate.split('/');
  return segments.every(
    (segment) => SAFE_SEGMENT.test(segment) && segment !== '.' && segment !== '..' && !segment.endsWith('.')
  );
}

/** Vérifie un manifeste reçu et le renvoie nettoyé. Lève une erreur au moindre doute. */
export function validateManifest(raw) {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Manifeste invalide');
  if (raw.schema !== 1) throw new Error('Format de manifeste non pris en charge');
  if (typeof raw.version !== 'string' || !SEMVER.test(raw.version)) throw new Error('Numéro de version invalide');
  if (!Number.isInteger(raw.launcherApi) || raw.launcherApi < 1) throw new Error('Version du lanceur invalide');
  if (!Array.isArray(raw.files) || raw.files.length === 0 || raw.files.length > MAX_FILES) {
    throw new Error('Liste de fichiers invalide');
  }
  const seen = new Set();
  let total = 0;
  const files = raw.files.map((file) => {
    if (file === null || typeof file !== 'object') throw new Error('Entrée de fichier invalide');
    if (!isSafeRelativePath(file.path)) throw new Error(`Chemin refusé : ${String(file.path)}`);
    if (typeof file.sha256 !== 'string' || !SHA256.test(file.sha256)) throw new Error(`Empreinte invalide : ${file.path}`);
    if (!Number.isInteger(file.size) || file.size < 0 || file.size > MAX_FILE_BYTES) {
      throw new Error(`Taille invalide : ${file.path}`);
    }
    const key = file.path.toLowerCase();
    if (seen.has(key)) throw new Error(`Chemin en doublon : ${file.path}`);
    seen.add(key);
    total += file.size;
    return { path: file.path, sha256: file.sha256, size: file.size };
  });
  if (total > MAX_TOTAL_BYTES) throw new Error('Mise à jour trop volumineuse');
  // Version de sauvegarde écrite par cette version du jeu (absente dans les manifestes plus anciens).
  if (raw.saveVersion !== undefined && (!Number.isInteger(raw.saveVersion) || raw.saveVersion < 1 || raw.saveVersion > 1000)) {
    throw new Error('Version de sauvegarde invalide');
  }
  return {
    schema: 1,
    launcherApi: raw.launcherApi,
    ...(raw.saveVersion !== undefined ? { saveVersion: raw.saveVersion } : {}),
    version: raw.version,
    buildId: typeof raw.buildId === 'string' ? raw.buildId.slice(0, 64) : '',
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt.slice(0, 40) : '',
    files,
  };
}

export function compareVersions(a, b) {
  const left = a.split('.').map(Number);
  const right = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if (left[i] !== right[i]) return left[i] - right[i];
  }
  return 0;
}

/**
 * Compare le manifeste installé et le manifeste distant.
 * - download : fichiers à télécharger (contenu absent de la version installée)
 * - reuse : fichiers dont le contenu existe déjà en local (copiés, pas téléchargés)
 * - remove : fichiers installés qui n'existent plus dans la nouvelle version
 */
export function planUpdate(local, remote) {
  const localByHash = new Map();
  for (const file of local.files) if (!localByHash.has(file.sha256)) localByHash.set(file.sha256, file);
  const remotePaths = new Set(remote.files.map((file) => file.path));

  const download = [];
  const reuse = [];
  for (const file of remote.files) {
    const existing = localByHash.get(file.sha256);
    if (existing && existing.size === file.size) reuse.push({ ...file, from: existing.path });
    else download.push(file);
  }
  return {
    download,
    reuse,
    remove: local.files.map((file) => file.path).filter((p) => !remotePaths.has(p)),
    downloadBytes: download.reduce((sum, file) => sum + file.size, 0),
    totalBytes: remote.files.reduce((sum, file) => sum + file.size, 0),
  };
}
