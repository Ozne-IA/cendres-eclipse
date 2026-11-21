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

## Profilage et interpolation (C06 et C07)

Ouvrir `/?profile=1` sur la version à mesurer. Dans la console, exécuter `window.cendresProfile.reset()` au début de la séquence, puis `window.cendresProfile.snapshot()` à la fin. Pour afficher les temps sous forme de tableau, utiliser `console.table(window.cendresProfile.snapshot().cpuMs)`. Les temps mesurent la durée côté CPU. Le résultat compte séparément les rendus sautés par temporisation (`cooldown`) et les images statiques sans rendu (`static`).

Deux séquences de 122 appels de `requestAnimationFrame` en strate 1, graine 5, joueur immobile. Chromium 156 sans interface sur Debian, 1 280 × 720, DPR 1 et GPU désactivé.

| Temps CPU moyen | Séquence 1 | Séquence 2 |
| --- | ---: | ---: |
| Simulation | 0,074 ms | 0,111 ms |
| Rendu | 1,209 ms | 0,989 ms |
| Terrain et torches | 0,322 ms | 0,218 ms |

Les deux séquences en jeu n’ont sauté aucun rendu. Un essai en pause a compté 21 images statiques sur 21 appels. Ces mesures ne couvrent ni le coût GPU, ni le combat, ni les performances sur un PC de jeu.

Dans `src/game/simulationClock.test.ts`, six scénarios du moteur vérifient la téléportation du Spectre et l’Art des Dagues, le premier pas des plateformes et des pendules, la réapparition du joueur et la réutilisation des projectiles. Ils couvrent le retour à l’interpolation normale après la discontinuité.

## Simulation à graine fixe (C08)

Lancer `npm test`. Dans `src/game/engineSystems.test.ts`, quatre scénarios vérifiés avant et après le découpage couvrent la limite des attaques ennemies et le passage du Gardien en phase 2, le renvoi des tirs et ses effets, le délai des éruptions et la garde, puis les tirages de butin et l’ordre des notifications pendant une interaction.

## Références Canvas (C09)

Avec Chromium installé, lancer `npm run build` puis `npm run test:e2e -- renderer.visual`. Les quatre PNG dans `test/e2e/renderer.visual.spec.ts-snapshots/` ont été capturés avant le découpage. Ils montrent le fond du titre, une salle de la strate 1, le signal d’attaque d’un Flagellant et le premier Gardien. Les scènes de jeu utilisent la graine 5.

Le test rend une image Canvas à 2,5 s, en 960 × 540, DPR 1, avec le GPU désactivé et le profil sRGB. La comparaison admet 100 pixels différents au seuil de 0,1. Les quatre images ont correspondu aux références sous Linux sur deux exécutions avant et deux après le découpage. Six traces complémentaires ont retrouvé le même ordre d’appels Canvas, notamment avec le titre de secours, le contraste élevé, la pause et le parallaxe désactivé. Pour un changement visuel voulu, examiner les écarts avant d’actualiser les PNG avec `npm run test:e2e -- renderer.visual --update-snapshots`.

## Allocations en combat (C10)

Depuis la racine, lancer `node --import tsx scripts/profile-combat.ts` avec Node 22. Le scénario utilise quatre graines et 12 strates par graine. Il avance les salles directement et renforce les PV du joueur pour prolonger les combats. Il exécute 57 262 pas de simulation et atteint 16 transitions de Gardien en phase 2.

Le script échantillonne les allocations JavaScript à 4 Kio avec l’inspecteur V8, y compris les objets déjà collectés. Il rejoue ensuite les mêmes entrées pour produire une empreinte des états de jeu, des effets et des notifications HUD. Comparer les médianes de plusieurs processus avec le même moteur JavaScript et vérifier que l’empreinte reste identique. L’échantillonnage estime les allocations cumulées pendant l’essai. Le scénario Node exclut le DOM, le Canvas et la lecture audio.

Sous Node 22.12.0, neuf exécutions par version donnent une médiane de 294,1 Mo alloués sur les piles du jeu avant les changements et 218,7 Mo après (−25,6 %). Les estimations vont de 278,7 à 334,5 Mo avant et de 209,5 à 236,8 Mo après. Les empreintes des 18 exécutions concordent.

Un essai Chromium distinct isole le changement dans `actorRender.ts`. Il rejoue 2 880 images dans 16 chargements de salle, en 960 × 540, DPR 1, avec rendu logiciel et un coefficient d’interpolation de 0,45. Sur trois exécutions par version, les allocations JavaScript attribuées au rendu passent de 91,1 à 82,6 Mo en médiane (−9,3 %), dont 17,0 à 8,7 Mo pour l’interpolation (−49,1 %). Vingt images de combat comparées pixel par pixel sont identiques. L’inspecteur Chromium échantillonne le tas JavaScript à 2 Kio. Les allocations natives du Canvas et le coût GPU sont hors de cette mesure.

Pour vérifier la navigation Graphify, reconstruire et exporter le graphe selon [[Accueil]], puis lancer `python .agents/skills/graphify/scripts/run.py path CendresEngine InputHub`. Le trajet passe par `engine.ts`. Dans le Canvas, les cartes doivent pointer vers les notes du dossier `Graphify/`.

Revenir à [[Accueil]] ou consulter [[Architecture]].
