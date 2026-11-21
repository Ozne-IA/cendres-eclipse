// Copie récursive d'un dossier. On n'utilise pas fs.cp / fs.cpSync : avec Node 22 sous Windows, ces fonctions
// copient en silence un dossier vide (ou font planter Node) quand le chemin d'arrivée contient des accents,
// ce que la CI a révélé avec un chemin du type « Cendres éclipse ». copyFileSync, lui, fonctionne partout.
import fs from 'node:fs';
import path from 'node:path';

export function copyTree(source, destination) {
  fs.mkdirSync(destination, { recursive: true });
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const from = path.join(source, entry.name);
    const to = path.join(destination, entry.name);
    if (entry.isDirectory()) copyTree(from, to);
    else if (entry.isFile()) fs.copyFileSync(from, to);
  }
}
