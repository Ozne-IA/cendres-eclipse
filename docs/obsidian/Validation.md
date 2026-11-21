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

Pour vérifier la navigation Graphify, reconstruire et exporter le graphe selon [[Accueil]], puis lancer `python .agents/skills/graphify/scripts/run.py path CendresEngine InputHub`. Le trajet passe par `engine.ts`. Dans le Canvas, les cartes doivent pointer vers les notes du dossier `Graphify/`.

Revenir à [[Accueil]] ou consulter [[Architecture]].
