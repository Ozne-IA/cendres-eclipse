#!/usr/bin/env node
// Prépare les fichiers d'une version publiée : le manifeste des mises à jour et une copie de chaque fichier
// du jeu nommée d'après son empreinte SHA-256. Le manifeste est aussi écrit dans dist/ pour que la version
// installée sache qui elle est.
//
// Usage : node scripts/make-release.mjs --version 1.2.0 [--dist dist] [--out release]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MANIFEST_NAME, buildManifest, validateManifest } from '../launcher/update-lib.mjs';

export async function createRelease({ distDir, outDir, version }) {
  if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error(`Numéro de version invalide : ${version}`);
  if (!fs.existsSync(path.join(distDir, 'index.html'))) throw new Error('dist/ est introuvable : lance npm run build');

  // Identifiant de build : celui que le service worker embarque, pour relier la version et le cache du navigateur.
  let buildId = '';
  const worker = path.join(distDir, 'sw.js');
  if (fs.existsSync(worker)) buildId = /BUILD_VERSION = "([^"]+)"/.exec(fs.readFileSync(worker, 'utf8'))?.[1] ?? '';

  const manifest = validateManifest(await buildManifest(distDir, { version, buildId }));
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });

  let copied = 0;
  for (const file of manifest.files) {
    // GitHub refuse les fichiers de 0 octet : ils restent dans le manifeste et le lanceur les recrée sans les télécharger.
    if (file.size === 0) continue;
    const target = path.join(outDir, file.sha256);
    if (fs.existsSync(target)) continue; // deux fichiers identiques ne sont publiés qu'une fois
    fs.copyFileSync(path.join(distDir, ...file.path.split('/')), target);
    copied++;
  }
  const json = JSON.stringify(manifest);
  fs.writeFileSync(path.join(outDir, MANIFEST_NAME), json);
  fs.writeFileSync(path.join(distDir, MANIFEST_NAME), json);
  return { manifest, assets: copied + 1 };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const option = (name, fallback) => {
    const found = process.argv.find((arg) => arg.startsWith(`--${name}=`));
    const index = process.argv.indexOf(`--${name}`);
    return found ? found.split('=')[1] : index > -1 ? process.argv[index + 1] : fallback;
  };
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const version = option('version', JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version);
  createRelease({
    distDir: path.resolve(root, option('dist', 'dist')),
    outDir: path.resolve(root, option('out', 'release')),
    version,
  }).then(({ manifest, assets }) => {
    const bytes = manifest.files.reduce((sum, file) => sum + file.size, 0);
    console.log(`Version ${manifest.version} : ${manifest.files.length} fichiers, ${(bytes / 1048576).toFixed(1)} Mo, ${assets} fichiers à publier.`);
  }).catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
