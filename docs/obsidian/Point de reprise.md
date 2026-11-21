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

## Suite connue

- À la prochaine session Claude Code, relire localement son coffre existant et ajouter ici uniquement les décisions, priorités et résultats vérifiés qui concernent le jeu et manquent au dépôt. Garder le coffre complet, les secrets, les chemins privés et les notes personnelles hors du dépôt.
- Poursuivre le découpage de `src/game/engine.ts` et `src/game/renderer.ts` en conservant les scénarios de référence de [[Validation]].
- Corriger la netteté du canvas sur les écrans HiDPI. Prévoir une migration versionnée des sauvegardes, une somme de contrôle et trois copies tournantes.
- Décider de l’hébergement local des polices. Revoir le traitement de `navigator.webdriver` lorsque des tests de bout en bout pourront le remplacer.
- Développer le bestiaire et les phases des boss, puis préparer la démo itch.io, la licence et les crédits. Téléphone et tablette restent hors cible.

## Mise à jour

Après chaque tâche, actualiser l’état intégré ou signaler la branche et le commit du travail en cours. Indiquer ce qui a été vérifié, ce qui reste à vérifier et la prochaine action. Voir [[Decisions|Décisions]] pour les choix durables, [[Validation]] pour les contrôles et [[Passation Luc]] pour la passation d’origine.
