#!/usr/bin/env node
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createGithubSource, DEFAULT_REPO } from './github-source.mjs';
import { createUpdateService } from './update-service.mjs';
import { recoverInterruptedUpdate } from './updater.mjs';
import { classifySave, cleanStaleTemporaryFiles, loadBestSave, writeSave } from './save-store.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const saveFilePath = path.join(rootDir, 'cendres-eclipse-save.json');

const args = process.argv.slice(2);
const portArg = args.find((a) => a.startsWith('--port='));
const port = portArg === '--port=0'
  ? 0
  : Number(portArg ? portArg.split('=')[1] : process.env.PORT || 4173) || 4173;
const noOpen = args.includes('--no-open');
const appMode = !args.includes('--browser');
const updatesDisabled = args.includes('--no-update-check') || process.env.CENDRES_NO_UPDATE === '1';

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

// Une mise à jour interrompue (coupure, fermeture de la fenêtre) ne doit jamais laisser le jeu sans fichiers.
try {
  recoverInterruptedUpdate(distDir);
} catch (error) {
  console.warn('[Cendres PC] Reprise de la mise à jour impossible :', error.message);
}

// Une écriture interrompue (coupure de courant, fermeture brutale) peut laisser un fichier temporaire : on le nettoie.
try {
  cleanStaleTemporaryFiles(saveFilePath);
} catch {
  // dossier en lecture seule : sans importance au démarrage
}

if (!fs.existsSync(path.join(distDir, 'index.html'))) {
  console.error('[Cendres PC] Dossier dist/ introuvable. Executez d abord: npm run build');
  process.exit(1);
}

// En-têtes de sécurité envoyés sur toutes les réponses (le jeu n'a pas besoin d'être affiché dans un cadre
// ni de partager ses ressources avec un autre site).
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'X-Frame-Options': 'DENY',
  'Content-Security-Policy': "frame-ancestors 'none'",
  'Cross-Origin-Resource-Policy': 'same-origin',
};

function sendJson(res, status, payload) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...SECURITY_HEADERS,
  });
  res.end(JSON.stringify(payload));
}

/**
 * Le serveur n'écoute que sur 127.0.0.1, mais un site web ouvert dans le même navigateur pourrait quand même
 * lui parler (DNS rebinding, ou simple POST venu d'une autre page). On n'accepte donc que les requêtes dont
 * le Host et l'Origin désignent ce serveur.
 */
function trustedAuthorities() {
  const port = server.address()?.port;
  return [`127.0.0.1:${port}`, `localhost:${port}`, `[::1]:${port}`];
}

function isTrustedHost(req) {
  return trustedAuthorities().includes(String(req.headers.host || '').toLowerCase());
}

function isTrustedOrigin(req) {
  const origin = req.headers.origin;
  if (origin !== undefined && !trustedAuthorities().some((a) => origin.toLowerCase() === `http://${a}`)) {
    return false;
  }
  // Les navigateurs récents annoncent d'où vient la requête : une autre origine est refusée.
  const site = req.headers['sec-fetch-site'];
  return site === undefined || site === 'same-origin' || site === 'none';
}

// Mises à jour : les variables CENDRES_UPDATE_* servent aux tests et aux copies hébergées ailleurs.
const updateService = createUpdateService({
  distDir,
  source: updatesDisabled
    ? null
    : createGithubSource({
      repo: process.env.CENDRES_UPDATE_REPO || DEFAULT_REPO,
      ...(process.env.CENDRES_UPDATE_API ? { apiBase: process.env.CENDRES_UPDATE_API } : {}),
      ...(process.env.CENDRES_UPDATE_DOWNLOAD ? { downloadBase: process.env.CENDRES_UPDATE_DOWNLOAD } : {}),
    }),
});

async function handleUpdateRoute(req, res, urlPath) {
  if (urlPath === '/api/update/status' && req.method === 'GET') {
    return sendJson(res, 200, updateService.status());
  }
  if (urlPath === '/api/update/check' && req.method === 'POST') {
    return sendJson(res, 200, await updateService.check({ force: true }));
  }
  if (urlPath === '/api/update/apply' && req.method === 'POST') {
    try {
      const stats = await updateService.apply();
      return sendJson(res, 200, { ok: true, stats, status: updateService.status() });
    } catch (error) {
      const known = { BUSY: 409, NONE: 409, FULL_DOWNLOAD: 409 };
      const status = known[error.code] || 500;
      return sendJson(res, status, { ok: false, code: error.code || 'FAILED', error: status === 500
        ? "La mise à jour n'a pas pu être installée. Le jeu reste dans sa version actuelle."
        : error.message });
    }
  }
  return sendJson(res, 404, { ok: false });
}

const server = http.createServer((req, res) => {
  const urlPath = (req.url || '/').split('?')[0];

  // Toutes les routes /api/ vérifient Host et Origin : une page tierce ne peut ni lire ni modifier le jeu.
  if (!isTrustedHost(req) || (urlPath.startsWith('/api/') && !isTrustedOrigin(req))) {
    return sendJson(res, 403, { ok: false, error: 'Requête refusée' });
  }

  if (urlPath.startsWith('/api/update/')) {
    handleUpdateRoute(req, res, urlPath).catch(() => sendJson(res, 500, { ok: false }));
    return;
  }

  if (urlPath === '/api/save') {
    if (req.method === 'GET') {
      try {
        const best = loadBestSave(saveFilePath);
        if (best.kind === 'ok') {
          if (best.source !== 'primary') console.warn(`[Cendres PC] Sauvegarde principale illisible : copie « ${best.source} » utilisée.`);
          return sendJson(res, 200, { exists: true, save: best.save });
        }
        if (best.kind === 'none') return sendJson(res, 200, { exists: false });
        // Écrite par une version plus récente du jeu : on la signale sans la modifier ni la remplacer.
        if (best.kind === 'newer') return sendJson(res, 200, { exists: true, tooNew: true, version: best.version });
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
        if (classifySave(parsed).status !== 'ok') {
          return sendJson(res, 400, { ok: false, error: 'Format invalide' });
        }
        try {
          // Somme de contrôle, trois copies tournantes, et mise de côté d'un ancien fichier illisible.
          writeSave(saveFilePath, parsed);
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
  if (decodedPath.includes('\0')) {
    return sendJson(res, 400, { ok: false, error: 'URL invalide' });
  }
  // On résout le chemin puis on vérifie qu'il reste dans dist/ : plus fiable qu'un nettoyage par expression régulière.
  let filePath = path.resolve(distDir, `.${path.sep}${decodedPath}`);
  const insideDist = filePath === distDir || filePath.startsWith(distDir + path.sep);
  if (!insideDist || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(distDir, 'index.html');
  }

  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, {
    'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
    'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=3600',
    ...SECURITY_HEADERS,
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
    // Vérification discrète en arrière-plan : le jeu démarre sans attendre le réseau.
    if (!updatesDisabled) void updateService.check();
  });
}

startListening(currentPort);
