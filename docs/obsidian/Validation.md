---
title: Validation
tags:
  - cendres-eclipse
  - validation
---

# Validation

Depuis la racine du dépôt, utiliser Node.js 22.12 ou une version LTS plus récente. Les commandes reprennent les contrôles GitHub Actions. [Workflow CI](https://github.com/Ozne-IA/cendres-eclipse/blob/main/.github/workflows/verify.yml)

```sh
npm ci
npm run lint
npm test
npm run build
node --check launcher/server-pc.mjs
```

Pour un changement de commandes, vérifier le trajet écran titre → Cour → pause → Bastion → expédition. Contrôler le focus visible, les appuis maintenus, la fermeture des options et la conservation de la progression après l’entraînement. La validation de la PR #6 utilisait une manette simulée dans Chromium. [Scénarios et vérifications de la PR #6](https://github.com/Ozne-IA/cendres-eclipse/pull/6)

Les tests de cadence rejouent le même combat avec une graine fixe à 30, 60, 120 et 144 images par seconde. Ils couvrent aussi le ralenti, la pause, l’arrêt à l’impact, les appuis entre deux mises à jour, la manette et l’interpolation des positions.

Pour un changement de sauvegarde, faire les essais avec des fichiers de test. Les tests du dépôt couvrent la récupération depuis `.bak` et le rafraîchissement de la page servie par le service worker. [Sauvegarde PC](https://github.com/Ozne-IA/cendres-eclipse/blob/main/test/pc-save.test.mjs) · [Cache web](https://github.com/Ozne-IA/cendres-eclipse/blob/main/test/service-worker.test.mjs)

Les tests audio simulent l’API Web Audio. Ils vérifient que les biomes et les deux phases de chaque gardien produisent des séquences distinctes, que la musique baisse en combat et lors d’une parade, et que le mixage suit les réglages de volume. L’écoute manuelle en jeu reste à faire.

Les tests de la chronique couvrent la compatibilité des anciennes sauvegardes, la validation des données importées, la limite de l’historique et la conservation des records. Ils vérifient aussi le calcul des dégâts réellement infligés et l’enregistrement d’une seule entrée par expédition.

La reprise de l’audio et des statistiques a passé le contrôle TypeScript, les 53 tests, la compilation de production et la vérification de syntaxe du serveur PC.

Après le découpage, 24 scénarios à graine fixe, avec toutes les armes, en expédition et dans la Cour, donnent les mêmes états de jeu, de caméra, de HUD et de sauvegarde qu’avant l’extraction. Les 63 tests, TypeScript et la compilation de production passent.

Les tests de mise à jour (`test/update-lib.test.mjs`, `updater.test.mjs`, `github-source.test.mjs`, `pc-update.test.mjs`, `make-release.test.mjs`) simulent GitHub avec un serveur local. Ils vérifient que seuls les fichiers modifiés sont téléchargés, qu’un fichier falsifié, tronqué ou absent annule tout et laisse la version installée intacte, qu’un manifeste avec un chemin dangereux est refusé, qu’une copie de développement n’est jamais remplacée, qu’une page tierce ne peut pas déclencher l’installation et qu’une mise à jour interrompue entre les deux renommages est rattrapée au démarrage. Un essai complet a aussi été fait à la main : jeu installé en 1.0.0, fausse publication 1.0.1, bandeau sur l’écran titre, installation, version 1.0.1 sur disque, sauvegarde intacte. La publication réelle de la version 1.0.1 a ensuite révélé un cas que les tests locaux ne couvraient pas : GitHub refuse les fichiers de 0 octet, désormais exclus de la publication (test ajouté). Après correction, `release.yml` a réussi et le lanceur a installé la mise à jour depuis la vraie release GitHub (fichiers finaux identiques à la release).

Les tests de sauvegarde (`test/save-store.test.mjs`, `pc-save-safety.test.mjs`, `src/game/saveFormat.test.ts`) couvrent la somme de contrôle, un fichier modifié ou tronqué, les trois copies tournantes, un fichier abîmé ou plus récent mis de côté, un fichier temporaire laissé par une écriture interrompue, les anciens formats (version 1 ou absente) et la conservation d’une copie dans le navigateur. `test/pc-update-interrupt.test.mjs` ferme le lanceur en plein téléchargement et à l’instant entre les deux renommages : la version installée et la sauvegarde restent intactes et la relance termine la mise à jour. `test/package.test.mjs` assemble un paquet de jeu et le fait vérifier par `scripts/verify-package.mjs`, comme en CI. Pour essayer à la main un paquet : `npm run build`, `node scripts/make-release.mjs --version X.Y.Z --out <dossier>`, `node scripts/build-package.mjs --out <dossier>/Cendres-Eclipse-X.Y.Z`, puis `node scripts/verify-package.mjs <dossier>/Cendres-Eclipse-X.Y.Z --version X.Y.Z`. Ce contrôle a été fait sur ce PC dans un chemin avec accents et espace, puis en CI sous Windows et Linux avec Node 22. La CI Windows a révélé un piège : `fs.cp` et `fs.cpSync` de Node 22 copient en silence un dossier vide, ou font planter Node, quand le chemin d’arrivée contient des accents. Le code et les tests utilisent donc `scripts/copy-tree.mjs`, basé sur `copyFileSync` ; ne pas réintroduire `fs.cp` pour copier vers un chemin du joueur. Reste à essayer le vrai zip d’une release sur un autre ordinateur.

## Premier lot Codex (C01 à C05)

- **Génération.** `src/game/levelGen.test.ts` rejoue la graine 4 en strate 1 et vérifie les dimensions et les limites des salles, dont les plateformes et les points d’apparition. Les contrôles couvrent 2 048 graines pour chacune des 9 strates échantillonnées (18 432 salles). Le code de déplacement du jeu est exécuté à 60 Hz pour vérifier que le joueur peut approcher la sortie en marchant et en sautant, sans esquive ni combat.
- **Parcours de bout en bout.** Après `npm run build` et `npx playwright install chromium`, lancer `npm run test:e2e`. Les deux scénarios Playwright utilisent Chromium et la version de production servie par Vite. Au clavier et à la manette simulée, ils passent par la Cour, la pause et le Bastion, puis atteignent un bilan après une défaite réelle. Ils vérifient les gains et la persistance de la chronique. Chaque parcours a réussi avant le retrait du traitement spécial de `navigator.webdriver`, puis trois fois après. Après intégration sur la base de la PR #21, 121 tests, la vérification TypeScript, le build et les deux parcours Chromium passent sous Node 22.12. La validation sur une manette physique relève des essais matériels.
- **Canvas HiDPI.** Dans Chromium, vérifier la résolution interne aux ratios 1, 1,25, 1,5 et 2, le plafond à 2 et le redimensionnement en pause. Les essais avec rapport de pixels simulé sont passés. Le rendu sur un écran physique reste à vérifier.

Pour vérifier la navigation Graphify, reconstruire et exporter le graphe selon [[Accueil]], puis lancer `python .agents/skills/graphify/scripts/run.py path CendresEngine InputHub`. Le trajet passe par `engine.ts`. Dans le Canvas, les cartes doivent pointer vers les notes du dossier `Graphify/`.

Revenir à [[Accueil]] ou consulter [[Architecture]].
