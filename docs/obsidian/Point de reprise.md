---
title: Point de reprise
tags:
  - cendres-eclipse
  - passation
---

# Point de reprise

## État intégré

Dépôt `Ozne-IA/cendres-eclipse`, vérifié sur `origin/main` à `4f8a00d`.

- Sécurité du serveur PC et réduction des animations selon la préférence système. [PR #11](https://github.com/Ozne-IA/cendres-eclipse/pull/11)
- Audio adaptatif et chroniques des expéditions. Écoute manuelle en jeu à faire. [PR #12](https://github.com/Ozne-IA/cendres-eclipse/pull/12)
- Simulation à 60 Hz, interpolation et tests de combat à graine fixe. [PR #13](https://github.com/Ozne-IA/cendres-eclipse/pull/13)
- Sprites répartis par type. Déplacement, plateformes, caméra et démarrage des attaques extraits du moteur. 63 tests, TypeScript et compilation de production validés pour ce découpage. [PR #14](https://github.com/Ozne-IA/cendres-eclipse/pull/14)

## En cours : mises à jour des joueurs ([PR #17](https://github.com/Ozne-IA/cendres-eclipse/pull/17), branche `luc/mise-a-jour-joueurs`)

Le lanceur PC installe une nouvelle version en ne téléchargeant que les fichiers modifiés (manifeste SHA-256 publié avec chaque release GitHub), avec retour arrière et sans toucher à la sauvegarde. Un bandeau sur l’écran titre propose l’installation. 88 tests, types et build passent, et un essai complet 1.0.0 vers 1.0.1 a été fait à la main. À faire avant d’annoncer la fonction : fusionner la PR, publier une release de test (`git tag v1.0.1`, `git push origin v1.0.1`) et vérifier le workflow `release.yml` sur GitHub. Détails : [[Decisions|Décisions]] et [[Validation]]. Ne pas toucher à `launcher/update-*.mjs` ni à `scripts/make-release.mjs` sans relancer les tests de mise à jour.

## Vérification indépendante de Luc (21/11/2026, `origin/main` à `86f2762`)

- Contrôles relancés sur une installation propre : TypeScript propre, 63 tests réussis, compilation de production réussie.
- Démarrage vérifié en jeu (strate 1) : joueur, ennemis, décor, HUD et compteur d’images s’affichent, sans erreur de script. Les erreurs 404 en développement viennent de la requête `POST /api/save`, absente du serveur Vite ; le serveur PC la gère.
- `SimulationClock` relu : pas fixe de 1/60 s, 50 ms au plus par image (pas de spirale de rattrapage), ralenti découpé au pas près.
- Rien n’a pu être jugé à la main : le ressenti du combat à 60 Hz, la fluidité et l’écoute de l’audio. Le navigateur intégré ne tient que 2 à 5 images par seconde. À tester sur un PC.

## Suite connue

- Autres idées de l’audit du 21/11/2026 pas encore listées : tests de bout en bout avec captures, ESLint et mode `strict`, budget de taille en CI, Dependabot, remappage des touches et pictogrammes (AZERTY/QWERTY), mode daltonien et ARIA, textes en dictionnaire pour l’anglais, mode sans fin et défi du jour, comptage des images à budget. Les classer avant de les lancer.
- Poursuivre le découpage de `src/game/engine.ts` et `src/game/renderer.ts` en conservant les scénarios de référence de [[Validation]].
- Corriger la netteté du canvas sur les écrans HiDPI. Prévoir une migration versionnée des sauvegardes, une somme de contrôle et trois copies tournantes.
- Décider de l’hébergement local des polices. Revoir le traitement de `navigator.webdriver` lorsque des tests de bout en bout pourront le remplacer.
- Développer le bestiaire et les phases des boss, puis préparer la démo itch.io, la licence et les crédits. Téléphone et tablette restent hors cible.

## Mise à jour

Après chaque tâche, actualiser l’état intégré ou signaler la branche et le commit du travail en cours. Indiquer ce qui a été vérifié, ce qui reste à vérifier et la prochaine action. Voir [[Decisions|Décisions]] pour les choix durables, [[Validation]] pour les contrôles et [[Passation Luc]] pour la passation d’origine.
