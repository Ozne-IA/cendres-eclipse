// Sauvegarde sur disque du lanceur PC : somme de contrôle, trois copies tournantes, et jamais d'écrasement
// d'un fichier qu'on ne sait pas lire (abîmé, ou écrit par une version plus récente du jeu).
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

/** Dernière version de sauvegarde comprise par ce lanceur. Doit rester égale à SAVE_VERSION de src/game/saveFormat.ts. */
export const SAVE_VERSION = 2;
export const CHECKSUM_FIELD = '_checksum';
/** La copie `.bak` suit chaque écriture ; `.bak2` et `.bak3` ne reculent que si `.bak` a plus de dix minutes. */
export const ROTATE_AFTER_MS = 10 * 60 * 1000;
const BACKUP_SUFFIXES = ['.bak', '.bak2', '.bak3'];
const MAX_ASIDE_KEPT = 3;

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function sha256(text) {
  return createHash('sha256').update(text).digest('hex');
}

function withoutChecksum(save) {
  const rest = { ...save };
  delete rest[CHECKSUM_FIELD];
  return rest;
}

/** Somme de contrôle du contenu de la sauvegarde (sans le champ de somme lui-même). */
export function checksumOf(save) {
  return sha256(JSON.stringify(withoutChecksum(save)));
}

function hasValidShape(save) {
  if (!isPlainObject(save.res) || !isPlainObject(save.buildings)) return false;
  for (const key of ['cendres', 'fer', 'larmes']) {
    if (save.res[key] !== undefined
      && (typeof save.res[key] !== 'number' || !Number.isFinite(save.res[key]) || save.res[key] < 0)) {
      return false;
    }
  }
  return Object.values(save.buildings).every((value) => typeof value === 'number' && Number.isInteger(value) && value >= 0);
}

/** 'ok' : utilisable. 'newer' : écrite par une version plus récente. 'invalid' : illisible, incomplète ou modifiée. */
export function classifySave(save) {
  if (!isPlainObject(save)) return { status: 'invalid' };
  if (save.version !== undefined) {
    if (!Number.isInteger(save.version) || save.version < 1) return { status: 'invalid' };
    if (save.version > SAVE_VERSION) return { status: 'newer', version: save.version };
  }
  if (!hasValidShape(save)) return { status: 'invalid' };
  if (CHECKSUM_FIELD in save && save[CHECKSUM_FIELD] !== checksumOf(save)) return { status: 'invalid' };
  return { status: 'ok' };
}

/** Lit un fichier : { status: 'missing' | 'invalid' | 'newer' | 'ok', save?, version? }. */
export function readSaveFile(filePath) {
  let raw;
  try {
    raw = fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') return { status: 'missing' };
    return { status: 'invalid' };
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { status: 'invalid' };
  }
  const verdict = classifySave(parsed);
  if (verdict.status === 'ok') return { status: 'ok', save: withoutChecksum(parsed) };
  return verdict;
}

/**
 * Cherche la meilleure sauvegarde : le fichier principal, puis `.bak`, `.bak2`, `.bak3`.
 * kind : 'ok' (save + source), 'newer' (le fichier principal vient d'une version plus récente),
 * 'none' (aucun fichier) ou 'unreadable' (des fichiers existent mais aucun n'est utilisable).
 */
export function loadBestSave(primaryPath) {
  const primary = readSaveFile(primaryPath);
  if (primary.status === 'ok') return { kind: 'ok', save: primary.save, source: 'primary' };
  if (primary.status === 'newer') return { kind: 'newer', version: primary.version };
  let sawFile = primary.status !== 'missing';
  for (const suffix of BACKUP_SUFFIXES) {
    const backup = readSaveFile(primaryPath + suffix);
    if (backup.status === 'ok') return { kind: 'ok', save: backup.save, source: suffix.slice(1) };
    if (backup.status !== 'missing') sawFile = true;
  }
  return sawFile ? { kind: 'unreadable' } : { kind: 'none' };
}

function rotateBackups(primaryPath, now, rotateAfterMs) {
  const [first, second, third] = BACKUP_SUFFIXES.map((suffix) => primaryPath + suffix);
  if (fs.existsSync(first) && now - fs.statSync(first).mtimeMs >= rotateAfterMs) {
    if (fs.existsSync(second)) fs.renameSync(second, third);
    fs.renameSync(first, second);
  }
  fs.copyFileSync(primaryPath, first);
}

function moveAside(primaryPath, label) {
  let target = `${primaryPath}.${label}`;
  for (let counter = 1; fs.existsSync(target); counter++) target = `${primaryPath}.${label}-${counter}`;
  fs.renameSync(primaryPath, target);
}

function pruneAside(primaryPath) {
  const directory = path.dirname(primaryPath);
  const prefix = `${path.basename(primaryPath)}.corrupt-`;
  const entries = fs.readdirSync(directory)
    .filter((name) => name.startsWith(prefix))
    .map((name) => ({ name, mtime: fs.statSync(path.join(directory, name)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime || b.name.localeCompare(a.name));
  for (const old of entries.slice(MAX_ASIDE_KEPT)) fs.rmSync(path.join(directory, old.name), { force: true });
}

/** Supprime les fichiers temporaires qu'une écriture interrompue aurait laissés. */
export function cleanStaleTemporaryFiles(primaryPath) {
  const directory = path.dirname(primaryPath);
  const prefix = `${path.basename(primaryPath)}.`;
  for (const name of fs.readdirSync(directory)) {
    if (name.startsWith(prefix) && name.endsWith('.tmp')) fs.rmSync(path.join(directory, name), { force: true });
  }
}

/**
 * Écrit la sauvegarde. L'ancien fichier valide devient la copie `.bak` (et fait avancer les copies plus anciennes) ;
 * un fichier illisible ou plus récent est mis de côté (`.corrupt-…`, `.newer-vN`) au lieu d'être écrasé.
 */
export function writeSave(primaryPath, save, { now = Date.now(), rotateAfterMs = ROTATE_AFTER_MS } = {}) {
  const current = readSaveFile(primaryPath);
  if (current.status === 'ok') rotateBackups(primaryPath, now, rotateAfterMs);
  else if (current.status === 'newer') moveAside(primaryPath, `newer-v${current.version}`);
  else if (current.status === 'invalid') {
    moveAside(primaryPath, `corrupt-${now}`);
    pruneAside(primaryPath);
  }

  const body = withoutChecksum(save);
  const temporaryPath = `${primaryPath}.${process.pid}.tmp`;
  try {
    fs.writeFileSync(temporaryPath, JSON.stringify({ ...body, [CHECKSUM_FIELD]: checksumOf(body) }, null, 2), 'utf8');
    fs.renameSync(temporaryPath, primaryPath);
  } finally {
    fs.rmSync(temporaryPath, { force: true });
  }
}

export { hasValidShape as isValidSavePayload };
