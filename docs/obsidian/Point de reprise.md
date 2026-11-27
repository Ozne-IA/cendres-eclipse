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

## Intégré : mises à jour des joueurs ([PR #17](https://github.com/Ozne-IA/cendres-eclipse/pull/17) et [PR #18](https://github.com/Ozne-IA/cendres-eclipse/pull/18))

Le lanceur PC installe une nouvelle version en ne téléchargeant que les fichiers modifiés (manifeste SHA-256 publié avec chaque release GitHub), avec retour arrière et sans toucher à la sauvegarde. Un bandeau sur l’écran titre propose l’installation. 90 tests, types et build passent.

La première version est publiée : [release v1.0.1](https://github.com/Ozne-IA/cendres-eclipse/releases/tag/v1.0.1) (zip pour les nouveaux joueurs et fichiers de mise à jour). Le workflow `release.yml` a réussi à la deuxième tentative : GitHub refusait les fichiers de 0 octet, désormais gardés dans le manifeste mais non publiés. Essai réel depuis cette release avec une copie installée plus ancienne : 7 fichiers téléchargés (551 Ko sur 6,1 Mo), 15 réutilisés, 22 fichiers finaux identiques à la release.

Pour publier la suivante : `git tag v1.1.0`, `git push origin v1.1.0`. Ne pas toucher à `launcher/update-*.mjs`, `launcher/updater.mjs` ni à `scripts/make-release.mjs` sans relancer les tests de mise à jour. Détails : [[Decisions|Décisions]] et [[Validation]]. Reste à faire : essayer le zip sur un autre ordinateur (avec Node.js 22.12) et envisager de signer les manifestes.

## Vérification indépendante de Luc (21/11/2026, `origin/main` à `86f2762`)

- Contrôles relancés sur une installation propre : TypeScript propre, 63 tests réussis, compilation de production réussie.
- Démarrage vérifié en jeu (strate 1) : joueur, ennemis, décor, HUD et compteur d’images s’affichent, sans erreur de script. Les erreurs 404 en développement viennent de la requête `POST /api/save`, absente du serveur Vite ; le serveur PC la gère.
- `SimulationClock` relu : pas fixe de 1/60 s, 50 ms au plus par image (pas de spirale de rattrapage), ralenti découpé au pas près.
- Rien n’a pu être jugé à la main : le ressenti du combat à 60 Hz, la fluidité et l’écoute de l’audio. Le navigateur intégré ne tient que 2 à 5 images par seconde. À tester sur un PC.

## Premier lot Codex terminé (C01 à C05)

Le lot a été livré sur la branche `codex/c01-c05`, dont le code a été rassemblé dans `c762f6e`. La sortie de la strate 1 est corrigée pour la graine 4, 18 432 salles ont passé les contrôles de génération et le parcours Chromium passe au clavier et à la manette simulée avec la boucle normale. Le canvas s’adapte au rapport de pixels jusqu’à 2. Les essais sur écran et manette physiques restent à faire. Voir [[Validation#Premier lot Codex (C01 à C05)]].

## Profilage et interpolation (C06 et C07)

Les deux tâches sont terminées sur le code rassemblé dans `5f0ea7c`. Le profilage à la demande mesure séparément la simulation, le rendu et les couches du décor. Le Spectre et l’Art des Dagues de l’Éclipse s’affichent immédiatement à leur destination. Les plateformes mobiles et pendules affichent leur première position simulée dès le premier pas. [[Validation#Profilage et interpolation (C06 et C07)]]

## Conception et lanceur intégrés par Luc

Les [[Fiches ennemis]] et [[Phase 2 des Gardiens|propositions de phase 2 des Gardiens]] clôturent L24 et L25. Les deux prototypes d’ennemis sont repris dans C20 et l’implémentation des phases dans C22. [PR #24](https://github.com/Ozne-IA/cendres-eclipse/pull/24)

Le lanceur coordonne les mises à jour entre deux instances. Le projet vérifie la cohérence des versions lors de la publication et Dependabot suit les dépendances. L06, L11 et L13 sont intégrés. [PR #25](https://github.com/Ozne-IA/cendres-eclipse/pull/25)

## Découpage du moteur et du rendu (C08 et C09)

L’IA, la résolution du combat, la mise à jour des projectiles et les interactions de salle ont leurs modules. Le rendu Canvas assemble six modules de dessin. Les scénarios à graine fixe et les quatre références Chromium vérifient le comportement avant et après. [[Validation#Simulation à graine fixe (C08)]] · [[Validation#Références Canvas (C09)]]

## Allocations en combat (C10)

La capture des positions, les collisions, le vieillissement des traces de sang et les mises à jour du HUD allouent moins pendant les combats. Le dessin réutilise les positions interpolées des ennemis entre les ombres et les sprites. Les médianes échantillonnées baissent de 25,6 % dans le scénario Node et de 9,3 % côté rendu dans l’essai Chromium. [[Validation#Allocations en combat (C10)]]

## Chargement et budget de taille (C11)

Le Bastion, les options et le lanceur PC chargent leur JavaScript à l’ouverture. Le JavaScript demandé au démarrage passe de 149,47 à 138,07 Kio gzip. La page de titre charge son illustration en priorité et réduit le poids de ses requêtes d’images de 63 % dans l’essai Chromium sans service worker. Le cache hors ligne inclut l’illustration, les décors et les trois écrans différés. [[Validation#Chargement et budget de taille (C11)]]

## TypeScript strict et ESLint (C12)

La CI applique TypeScript strict à 12 modules de jeu, dont deux dépendances partagées, et quatre fichiers de tests. ESLint contrôle les fichiers listés dans `tsconfig.strict.json`. Le contrôle TypeScript général continue de couvrir le dépôt. [[Validation#TypeScript strict et ESLint (C12)]]

## Régressions de combat (C13)

Six scénarios à graine fixe contrôlent la parade parfaite, le renvoi des projectiles, l’esquive parfaite, la durée d’invulnérabilité, la rupture de posture et les attaques multicibles. Ils utilisent les entrées et les pas de simulation du jeu. [[Validation#Régressions de combat (C13)]]

## Exercices de la Cour (C14)

Le menu Pause de la Cour donne accès à six exercices. Le HUD affiche la consigne, l’objectif, les commandes et la réussite. Le même menu permet de rejouer l’exercice ou de reprendre l’entraînement libre. Les critères détaillés de Luc sont repris dans [[Validation#Critères avancés de la Cour (L18)]]. [[Validation#Exercices de la Cour (C14)]]

## Fluidité des combats sur Android

Branche `codex/android-combat`. Le rendu Android réduit les pixels rasterisés en partie et allège les effets de lumière. La revue des commandes confirme que maintenir plusieurs entrées ne déclenche pas de rafraîchissement du HUD. Le test sur tablette doit comparer l’approche des ennemis sans commande, le déplacement tactile et clavier, puis les pauses d’impact. [[Android#Aperçu combat]]

## Suite connue

- Voir le [[Backlog de passation]] pour la liste complète, les premières tâches et la convention de retour entre Codex et Luc.
- Voir [[Messages Codex et Luc]] pour la passation de C01 à C13 et la coordination entre C14 et L18.
- L’audit du 21/11/2026 proposait aussi des captures dans les tests de bout en bout, ESLint et mode `strict`, budget de taille en CI, Dependabot, remappage des touches et pictogrammes (AZERTY/QWERTY), mode daltonien et ARIA, textes en dictionnaire pour l’anglais, mode sans fin et défi du jour, comptage des images à budget.
- Côté Codex, reprendre C15 avec la répétition des Gardiens découverts dans la Cour. C14 est jouable. Les propositions L18 de Luc ont été validées le 22 novembre 2026. La Cour applique les critères de [[L18 Cour - consignes et criteres]], documentés dans [[Validation#Critères avancés de la Cour (L18)]].
- L’utilisateur signale que ses essais sur PC sont bons le 22 novembre 2026. Les résultats détaillés par scénario restent à consigner dans le [[Protocole d'essai matériel]].
- Décider de l’hébergement local des polices.
- Développer le bestiaire et les phases des boss, puis préparer la démo itch.io, la licence et les crédits. L’APK de test et la publication Android signée sont décrits dans [[Android]].

## Mise à jour

Après chaque tâche, actualiser l’état intégré ou signaler la branche et le commit du travail en cours. Indiquer ce qui a été vérifié, ce qui reste à vérifier et la prochaine action. Voir [[Decisions|Décisions]] pour les choix durables, [[Validation]] pour les contrôles et [[Passation Luc]] pour la passation d’origine.
