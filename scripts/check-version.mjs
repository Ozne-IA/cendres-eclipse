#!/usr/bin/env node
// Vérifie que le numéro de version de package.json est celui de l'étiquette de publication (sans le « v »).
// Usage : node scripts/check-version.mjs 1.2.0
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

export function checkVersion(expected, packageJsonText) {
  const actual = JSON.parse(packageJsonText).version;
  if (actual !== expected) {
    throw new Error(`package.json indique la version ${actual}, mais la publication demandée est ${expected}. Mets package.json à jour avant d'étiqueter.`);
  }
  return actual;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    const root = new URL('../package.json', import.meta.url);
    console.log(`Version ${checkVersion(process.argv[2], fs.readFileSync(root, 'utf8'))} : cohérente avec l'étiquette.`);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
