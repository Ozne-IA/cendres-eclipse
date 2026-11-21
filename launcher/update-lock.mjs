// Verrou entre plusieurs lanceurs ouverts sur la même installation : un seul à la fois peut préparer ou installer
// une mise à jour, et un lanceur qui démarre ne doit pas « réparer » une mise à jour qu'un autre est en train de faire.
import fs from 'node:fs';

export const LOCK_MAX_AGE_MS = 30 * 60 * 1000;

function processIsAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error.code === 'EPERM';
  }
}

function readLock(file) {
  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    return Number.isInteger(data.pid) && Number.isFinite(data.at) ? data : null;
  } catch {
    return null;
  }
}

/** Vrai si un autre lanceur vivant tient le verrou (un verrou périmé ou d'un programme disparu ne compte pas). */
export function isLockHeld(file, { now = Date.now() } = {}) {
  if (!fs.existsSync(file)) return false;
  const lock = readLock(file);
  if (!lock) return false;
  if (now - lock.at > LOCK_MAX_AGE_MS) return false;
  return lock.pid === process.pid ? false : processIsAlive(lock.pid);
}

/** Prend le verrou ; renvoie une fonction de libération, ou null si un autre lanceur le tient. */
export function acquireLock(file, { now = Date.now() } = {}) {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      fs.writeFileSync(file, JSON.stringify({ pid: process.pid, at: now }), { flag: 'wx' });
      return () => {
        try {
          if (readLock(file)?.pid === process.pid) fs.rmSync(file, { force: true });
        } catch {
          // rien à faire : un verrou oublié devient périmé tout seul
        }
      };
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      if (isLockHeld(file, { now })) return null;
      fs.rmSync(file, { force: true });   // verrou d'un programme disparu ou trop ancien
    }
  }
  return null;
}
