#!/usr/bin/env node
// Vérifie un paquet de jeu comme le ferait un joueur : fichiers conformes au manifeste, démarrage du lanceur,
// page servie, sauvegarde écrite puis retrouvée après un redémarrage, et mise à jour prête sans réseau.
//
// Usage : node scripts/verify-package.mjs <dossier du paquet> [--version 1.2.3]
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MANIFEST_NAME, listFiles, sha256File, validateManifest } from '../launcher/update-lib.mjs';

const REQUIRED = [
  'dist/index.html',
  `dist/${MANIFEST_NAME}`,
  'launcher/server-pc.mjs',
  'launcher/save-store.mjs',
  'launcher/update-lib.mjs',
  'launcher/updater.mjs',
  'launcher/update-service.mjs',
  'launcher/github-source.mjs',
  'Lancer_Cendres_Eclipse.bat',
  'Lancer_Cendres_Eclipse.sh',
  'LISEZMOI.txt',
];

function startLauncher(packageDir, env = {}, args = ['--no-update-check']) {
  const child = spawn(process.execPath, [path.join(packageDir, 'launcher', 'server-pc.mjs'), '--port=0', '--no-open', ...args], {
    cwd: packageDir,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, ...env },
  });
  let stderr = '';
  child.stderr.setEncoding('utf8').on('data', (chunk) => { stderr += chunk; });
  const ready = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Le lanceur n'a pas démarré en 15 s. ${stderr}`)), 15000);
    child.once('exit', (code) => { clearTimeout(timer); reject(new Error(`Le lanceur s'est arrêté (code ${code}). ${stderr}`)); });
    let output = '';
    child.stdout.setEncoding('utf8').on('data', (chunk) => {
      output += chunk;
      const match = output.match(/http:\/\/127\.0\.0\.1:\d+/);
      if (match) { clearTimeout(timer); resolve(match[0]); }
    });
  });
  const stop = async () => {
    if (child.exitCode === null && child.signalCode === null) {
      const closed = once(child, 'close');
      child.kill();
      await closed;
    }
  };
  return { ready, stop };
}

export async function verifyPackage(packageDir, { expectedVersion } = {}) {
  const checks = [];
  const check = async (name, run) => {
    try {
      const detail = await run();
      checks.push({ name, ok: true, detail: detail ?? '' });
    } catch (error) {
      checks.push({ name, ok: false, detail: error.message });
    }
  };
  const distDir = path.join(packageDir, 'dist');
  let manifest = null;

  await check('fichiers indispensables présents', () => {
    const missing = REQUIRED.filter((file) => !fs.existsSync(path.join(packageDir, ...file.split('/'))));
    if (missing.length) throw new Error(`manquants : ${missing.join(', ')}`);
  });

  await check('manifeste valide', () => {
    manifest = validateManifest(JSON.parse(fs.readFileSync(path.join(distDir, MANIFEST_NAME), 'utf8')));
    return `version ${manifest.version}, ${manifest.files.length} fichiers`;
  });

  await check(`version du paquet${expectedVersion ? ` = ${expectedVersion}` : ''}`, () => {
    if (!manifest) throw new Error('manifeste illisible');
    if (expectedVersion && manifest.version !== expectedVersion) {
      throw new Error(`le manifeste annonce ${manifest.version}, attendu ${expectedVersion}`);
    }
  });

  await check('fichiers du jeu conformes au manifeste (taille et SHA-256), sans fichier en trop', async () => {
    if (!manifest) throw new Error('manifeste illisible');
    const problems = [];
    for (const file of manifest.files) {
      const absolute = path.join(distDir, ...file.path.split('/'));
      if (!fs.existsSync(absolute)) { problems.push(`absent : ${file.path}`); continue; }
      if (fs.statSync(absolute).size !== file.size) problems.push(`taille différente : ${file.path}`);
      else if ((await sha256File(absolute)) !== file.sha256) problems.push(`contenu différent : ${file.path}`);
    }
    const expected = new Set(manifest.files.map((file) => file.path));
    for (const present of listFiles(distDir)) if (!expected.has(present)) problems.push(`en trop : ${present}`);
    if (problems.length) throw new Error(problems.slice(0, 5).join(' ; '));
  });

  // Les contrôles suivants démarrent vraiment le lanceur du paquet, depuis le chemin du paquet (accents et espaces compris).
  const savePath = path.join(packageDir, 'cendres-eclipse-save.json');
  const sample = { version: 2, res: { cendres: 4242 }, buildings: {} };
  let origin = '';
  let launcher = null;
  try {
    launcher = startLauncher(packageDir);
    await check('le lanceur démarre depuis ce dossier', async () => { origin = await launcher.ready; return origin; });

    await check('la page du jeu est servie', async () => {
      const response = await fetch(`${origin}/`);
      const html = await response.text();
      if (response.status !== 200 || !html.includes('<')) throw new Error(`réponse ${response.status}`);
    });

    await check('sauvegarde : aucune au départ, écriture et relecture', async () => {
      const first = await (await fetch(`${origin}/api/save`)).json();
      if (first.exists !== false) throw new Error('une sauvegarde existe déjà dans le paquet');
      const post = await fetch(`${origin}/api/save`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(sample) });
      if (post.status !== 200) throw new Error(`écriture refusée (${post.status})`);
      const back = await (await fetch(`${origin}/api/save`)).json();
      if (back.save?.res?.cendres !== 4242) throw new Error('relecture différente');
      if (!fs.existsSync(savePath)) throw new Error('fichier de sauvegarde absent à côté du jeu');
    });

    await launcher.stop();
    launcher = startLauncher(packageDir);
    await check('sauvegarde retrouvée après fermeture et relance', async () => {
      origin = await launcher.ready;
      const back = await (await fetch(`${origin}/api/save`)).json();
      if (back.save?.res?.cendres !== 4242) throw new Error('la sauvegarde a disparu à la relance');
    });

    await launcher.stop();
    // Mise à jour activée, sans réseau : le lanceur connaît sa version et démarre quand même.
    launcher = startLauncher(packageDir, {
      CENDRES_UPDATE_API: 'http://127.0.0.1:1',
      CENDRES_UPDATE_DOWNLOAD: 'http://127.0.0.1:1',
    }, []);
    await check('mises à jour : version connue du lanceur, démarrage sans réseau', async () => {
      origin = await launcher.ready;
      const status = await (await fetch(`${origin}/api/update/status`)).json();
      if (!status.enabled) throw new Error('mises à jour désactivées dans le paquet');
      if (manifest && status.current?.version !== manifest.version) throw new Error(`version lue : ${status.current?.version}`);
      if ((await fetch(`${origin}/`)).status !== 200) throw new Error('le jeu ne répond plus');
    });
  } catch (error) {
    checks.push({ name: 'essai de démarrage', ok: false, detail: error.message });
  } finally {
    if (launcher) await launcher.stop();
    fs.rmSync(savePath, { force: true });
    for (const name of fs.readdirSync(packageDir)) {
      if (name.startsWith('cendres-eclipse-save.json')) fs.rmSync(path.join(packageDir, name), { force: true });
    }
  }
  return { ok: checks.every((item) => item.ok), checks };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const dir = process.argv[2];
  const versionIndex = process.argv.indexOf('--version');
  if (!dir) {
    console.error('Usage : node scripts/verify-package.mjs <dossier du paquet> [--version 1.2.3]');
    process.exit(2);
  }
  verifyPackage(path.resolve(dir), { expectedVersion: versionIndex > -1 ? process.argv[versionIndex + 1] : undefined })
    .then((report) => {
      for (const item of report.checks) console.log(`${item.ok ? 'OK    ' : 'ECHEC '} ${item.name}${item.detail ? ` — ${item.detail}` : ''}`);
      console.log(report.ok ? '\nPaquet conforme.' : '\nPaquet NON conforme.');
      process.exit(report.ok ? 0 : 1);
    })
    .catch((error) => {
      console.error(error.message);
      process.exit(1);
    });
}
