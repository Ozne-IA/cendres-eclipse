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

const args = process.argv.slice(2);
const portArg = args.find((a) => a.startsWith('--port='));
const port = Number(portArg ? portArg.split('=')[1] : process.env.PORT || 4173) || 4173;
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
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
};

if (!fs.existsSync(path.join(distDir, 'index.html'))) {
  console.error('[Cendres PC] Dossier dist/ introuvable. Executez d abord: npm run build');
  process.exit(1);
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
        if (!fs.existsSync(saveFilePath)) {
          return sendJson(res, 200, { exists: false });
        }
        const raw = fs.readFileSync(saveFilePath, 'utf8');
        const parsed = JSON.parse(raw);
        return sendJson(res, 200, { exists: true, save: parsed });
      } catch {
        return sendJson(res, 200, { exists: false });
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
        try {
          const parsed = JSON.parse(body);
          if (!parsed || typeof parsed !== 'object' || !parsed.res) {
            return sendJson(res, 400, { ok: false, error: 'Format invalide' });
          }
          fs.writeFileSync(saveFilePath, JSON.stringify(parsed, null, 2), 'utf8');
          return sendJson(res, 200, { ok: true, path: saveFilePath });
        } catch {
          return sendJson(res, 400, { ok: false, error: 'JSON invalide' });
        }
      });
      return;
    }

    return sendJson(res, 405, { ok: false });
  }

  let safeRel = path.normalize(decodeURIComponent(urlPath)).replace(/^(\.\.[/\\])+/, '');
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

server.listen(port, '127.0.0.1', () => {
  const url = `http://127.0.0.1:${port}/?pc_launcher=1`;
  console.log(`[Cendres PC] Jeu pret sur ${url}`);
  console.log(`[Cendres PC] Sauvegarde disque locale : ${saveFilePath}`);
  if (noOpen) return;

  const platform = process.platform;
  if (platform === 'win32') {
    const cmd = appMode ? `start msedge --app=${url}` : `start ${url}`;
    execFile('cmd.exe', ['/c', cmd], () => {});
  } else if (platform === 'darwin') {
    execFile('open', [url], () => {});
  } else {
    execFile('xdg-open', [url], () => {});
  }
});
