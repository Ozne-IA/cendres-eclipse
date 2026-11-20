#!/usr/bin/env node
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const saveFilePath = path.join(rootDir, 'cendres-eclipse-save.json');
const backupFilePath = `${saveFilePath}.bak`;

const args = process.argv.slice(2);
const portArg = args.find((a) => a.startsWith('--port='));
const port = portArg === '--port=0'
  ? 0
  : Number(portArg ? portArg.split('=')[1] : process.env.PORT || 4173) || 4173;
const noOpen = args.includes('--no-open');
const appMode = !args.includes('--browser');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
};

if (!fs.existsSync(path.join(distDir, 'index.html'))) {
  console.error('[Cendres PC] Dossier dist/ introuvable. Executez d abord: npm run build');
  process.exit(1);
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isValidSavePayload(save) {
  if (!isPlainObject(save) || !isPlainObject(save.res) || !isPlainObject(save.buildings)) {
    return false;
  }
  if (save.version !== undefined
    && (!Number.isInteger(save.version) || save.version < 1 || save.version > 2)) {
    return false;
  }
  for (const key of ['cendres', 'fer', 'larmes']) {
    if (save.res[key] !== undefined
      && (typeof save.res[key] !== 'number' || !Number.isFinite(save.res[key]) || save.res[key] < 0)) {
      return false;
    }
  }
  for (const value of Object.values(save.buildings)) {
    if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) return false;
  }
  return true;
}

function readSave(filePath) {
  let raw;
  try {
    raw = fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') return undefined;
    throw error;
  }
  try {
    const save = JSON.parse(raw);
    return isValidSavePayload(save) ? save : null;
  } catch {
    return null;
  }
}

function writeSaveAtomically(filePath, save) {
  const temporaryPath = `${filePath}.${process.pid}.tmp`;
  try {
    fs.writeFileSync(temporaryPath, JSON.stringify(save, null, 2), 'utf8');
    fs.renameSync(temporaryPath, filePath);
  } finally {
    fs.rmSync(temporaryPath, { force: true });
  }
}

function sendJson(res, status, payload) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(JSON.stringify(payload));
}

const server = http.createServer((req, res) => {
  const urlPath = (req.url || '/').split('?')[0];

  if (urlPath === '/api/save') {
    if (req.method === 'GET') {
      try {
        const primary = readSave(saveFilePath);
        if (primary) return sendJson(res, 200, { exists: true, save: primary });

        const backup = readSave(backupFilePath);
        if (backup) return sendJson(res, 200, { exists: true, save: backup });
        if (primary === undefined && backup === undefined) {
          return sendJson(res, 200, { exists: false });
        }
        return sendJson(res, 422, { ok: false, error: 'Sauvegarde illisible' });
      } catch {
        return sendJson(res, 500, { ok: false, error: 'Lecture de la sauvegarde impossible' });
      }
    }

    if (req.method === 'POST') {
      let body = '';
      let aborted = false;
      req.on('data', (chunk) => {
        body += chunk;
        if (body.length > 512 * 1024) {
          aborted = true;
          sendJson(res, 413, { ok: false, error: 'Sauvegarde trop volumineuse' });
          req.destroy();
        }
      });
      req.on('end', () => {
        if (aborted) return;
        let parsed;
        try {
          parsed = JSON.parse(body);
        } catch {
          return sendJson(res, 400, { ok: false, error: 'JSON invalide' });
        }
        if (!isValidSavePayload(parsed)) {
          return sendJson(res, 400, { ok: false, error: 'Format invalide' });
        }
        try {
          const primary = readSave(saveFilePath);
          if (primary) writeSaveAtomically(backupFilePath, primary);
          writeSaveAtomically(saveFilePath, parsed);
          return sendJson(res, 200, { ok: true, path: saveFilePath });
        } catch {
          return sendJson(res, 500, { ok: false, error: 'Écriture de la sauvegarde impossible' });
        }
      });
      return;
    }

    return sendJson(res, 405, { ok: false });
  }

  let decodedPath;
  try {
    decodedPath = decodeURIComponent(urlPath);
  } catch {
    return sendJson(res, 400, { ok: false, error: 'URL invalide' });
  }
  let safeRel = path.normalize(decodedPath).replace(/^(\.\.[/\\])+/, '');
  if (safeRel === '/' || safeRel === '\\') safeRel = 'index.html';

  let filePath = path.join(distDir, safeRel);
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(distDir, 'index.html');
  }

  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, {
    'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
    'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=3600',
  });
  fs.createReadStream(filePath).pipe(res);
});

function openBrowser(targetUrl) {
  const platform = process.platform;
  if (platform === 'win32') {
    const candidates = [
      path.join(process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', 'Microsoft\\Edge\\Application\\msedge.exe'),
      path.join(process.env.ProgramFiles || 'C:\\Program Files', 'Microsoft\\Edge\\Application\\msedge.exe'),
      path.join(process.env.ProgramFiles || 'C:\\Program Files', 'Google\\Chrome\\Application\\chrome.exe'),
      path.join(process.env.LocalAppData || '', 'Google\\Chrome\\Application\\chrome.exe'),
      path.join(process.env.ProgramFiles || 'C:\\Program Files', 'BraveSoftware\\Brave-Browser\\Application\\brave.exe'),
    ];

    let chosenExe = null;
    for (const c of candidates) {
      if (c && fs.existsSync(c)) {
        chosenExe = c;
        break;
      }
    }

    if (chosenExe) {
      const argsList = appMode
        ? [`--app=${targetUrl}`, '--window-size=1440,840']
        : ['--new-window', targetUrl];
      execFile(chosenExe, argsList, () => {});
    } else {
      const cmd = `start "" "${targetUrl}"`;
      execFile('cmd.exe', ['/c', cmd], () => {});
    }
  } else if (platform === 'darwin') {
    execFile('open', [targetUrl], () => {});
  } else {
    execFile('xdg-open', [targetUrl], () => {});
  }
}

let currentPort = port;

function startListening(p) {
  server.once('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`[Cendres PC] Port ${p} déjà occupé. Tentative sur le port ${p + 1}...`);
      currentPort = p + 1;
      startListening(currentPort);
    } else {
      console.error('[Cendres PC] Erreur serveur:', err.message);
      process.exit(1);
    }
  });

  server.listen(p, '127.0.0.1', () => {
    const url = `http://127.0.0.1:${server.address().port}/?pc_launcher=1`;
    console.log(`[Cendres PC] Jeu prêt sur ${url}`);
    console.log(`[Cendres PC] Sauvegarde disque locale : ${saveFilePath}`);
    if (!noOpen) {
      openBrowser(url);
    }
  });
}

startListening(currentPort);
