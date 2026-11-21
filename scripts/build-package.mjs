#!/usr/bin/env node
// Assemble le dossier que les nouveaux joueurs reçoivent (zippé par le workflow de publication) :
// dist/ (avec son manifeste), les modules du lanceur, les lanceurs Windows et Linux et le LISEZMOI.
//
// Usage : node scripts/build-package.mjs --out package/Cendres-Eclipse-1.0.1
// Prérequis : npm run build puis node scripts/make-release.mjs (qui écrit dist/update-manifest.json).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MANIFEST_NAME } from '../launcher/update-lib.mjs';
import { copyTree } from './copy-tree.mjs';

const WINDOWS_TEXT_FILES = new Set(['Lancer_Cendres_Eclipse.bat', 'LISEZMOI.txt']);

export async function buildPackage({ rootDir, outDir }) {
  const distDir = path.join(rootDir, 'dist');
  if (!fs.existsSync(path.join(distDir, MANIFEST_NAME))) {
    throw new Error('Manifeste introuvable dans dist/ : lance d\'abord node scripts/make-release.mjs');
  }
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(path.join(outDir, 'launcher'), { recursive: true });
  copyTree(distDir, path.join(outDir, 'dist'));

  for (const name of fs.readdirSync(path.join(rootDir, 'launcher'))) {
    if (name.endsWith('.mjs')) fs.copyFileSync(path.join(rootDir, 'launcher', name), path.join(outDir, 'launcher', name));
  }

  const releaseScripts = path.join(rootDir, 'scripts', 'release');
  for (const name of fs.readdirSync(releaseScripts)) {
    const text = fs.readFileSync(path.join(releaseScripts, name), 'utf8').replace(/\r\n/g, '\n');
    // .bat et .txt en fins de ligne Windows ; le .sh reste en fins de ligne Unix.
    fs.writeFileSync(path.join(outDir, name), WINDOWS_TEXT_FILES.has(name) ? text.replace(/\n/g, '\r\n') : text);
    if (name.endsWith('.sh')) fs.chmodSync(path.join(outDir, name), 0o755);
  }
  return { outDir };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const index = process.argv.indexOf('--out');
  const out = index > -1 ? process.argv[index + 1] : 'package/Cendres-Eclipse';
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  buildPackage({ rootDir: root, outDir: path.resolve(root, out) })
    .then(({ outDir }) => console.log(`Paquet prêt : ${outDir}`))
    .catch((error) => {
      console.error(error.message);
      process.exit(1);
    });
}
