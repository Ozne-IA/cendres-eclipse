---
title: Fiches ennemis
tags:
  - cendres-eclipse
  - conception
  - ennemis
  - passation
---

# Fiches ennemis (L24)

Tâche L24 du [[Backlog de passation]]. Les valeurs viennent du code à la révision `dea82b8` : `src/game/levelGen.ts` (`createEnemy`), `src/game/engine.ts` (IA et `executeEnemyAttack`) et `src/game/data.ts` (`ENEMY_LORE`). Elles sont avant multiplicateurs de difficulté, d'Ascension et de profondeur (`scale`).

## Règles communes à tous les ennemis
- Rayon d'alerte : 460 px (950 px pour un Gardien). Au-delà, l'ennemi s'immobilise.
- Un ennemi ordinaire n'attaque que si moins de 3 ennemis attaquent déjà (`activeAttackers < 3`). Les Gardiens ne sont pas limités.
- Séquence : approche, `windup` (préparation), `attack` de 0,24 s, `recover` de 0,45 s, puis attente de 1,05 s (Gardien : 0,8 s en phase 1, 0,55 s en phase 2).
- Une préparation dure 0,44 s par défaut. C'est la fenêtre de lecture du joueur : en dessous de 0,4 s, une parade au premier essai devient difficile.
- Seuls le Lancier et les élites changent les règles de touche : le pavois bloque les coups légers de face, l'élite « blindé » encaisse sans vaciller tant qu'il n'est pas déjà étourdi.
- Pour L20, les signaux restent à vérifier à l'écran sur plusieurs PC : tout ce qui suit décrit l'intention du code, pas la lisibilité mesurée.

## Tableau de synthèse

| Ennemi | PV | Dégâts | Étourdissement | Portée voulue | Préparation | Rôle |
|---|---|---|---|---|---|---|
| Pénitent d'Os | 52 | 16 | 100 | 78 | 0,44 s | Mêlée de base |
| Veilleur de Suie | 42 | 14 | 75 | 270 (vole) | 0,44 s | Tireur aérien |
| Flagellant d'Airain | 96 | 24 | 130 | 78 | 0,60 s | Colosse lent |
| Lancier du Suaire | 78 | 19 | 110 | 78 | 0,44 s | Garde frontale |
| Arbalétrier Cendré | 48 | 21 | 70 | 360 | 0,65 s | Tireur à distance |
| Spectre d'Éclipse | 62 | 20 | 85 | 78 | 0,44 s | Assassin |
| Acolyte Pyromancien | 64 | 22 | 85 | 310 | 0,44 s | Zone au sol |

Apparition (`levelGen.ts`) : pénitent et flagellant dès la strate 1 ; lancier et arbalétrier dès 2 ; spectre dès 3 ; pyromancien dès 4. Le veilleur ou l'arbalétrier occupent les plateformes hautes (arbalétrier dès la strate 2, une chance sur trois environ).

## Pénitent d'Os
- **Rôle** : ennemi d'apprentissage. Il apprend l'esquive et la parade.
- **Portée** : mêlée, il s'arrête à 78 px.
- **Signal** : il s'arrête puis prépare 0,44 s. Pas de cri, de lueur ni de son dédié.
- **Attaque** : charge de 310 px/s sur 0,24 s, un seul coup au contact.
- **Contre-jeu** : esquive à travers lui, parade parfaite (étourdissement), ou attaque légère après sa récupération.
- **Faiblesse de conception** : sa préparation est la même que celle du Lancier, du Spectre et du Pyromancien. Rien ne les distingue par le rythme.

## Veilleur de Suie
- **Rôle** : pression à distance, pousse à se déplacer ou à parer.
- **Portée** : reste à 270 px, vole, ignore la gravité.
- **Signal** : préparation de 0,44 s sans télégraphe particulier.
- **Attaque** : orbe orange de 340 px/s, rayon 8, 2,2 s de vie. L'orbe se renvoie d'une parade.
- **Contre-jeu** : parade pour renvoyer, saut ou esquive, ou ignorer et frapper en plateforme.
- **Observation** : un seul orbe lent, sans cadence variable. Il devient vite inoffensif face à un joueur qui parade.

## Flagellant d'Airain
- **Rôle** : punir l'impatience. Peu de coups, tous lourds.
- **Portée** : mêlée, vitesse 105 px/s (la plus lente).
- **Signal** : préparation de 0,60 s, la plus longue en mêlée.
- **Attaque** : charge de 280 px/s, 24 dégâts de base (le plus élevé des ennemis ordinaires).
- **Contre-jeu** : esquive après le départ de la charge, puis deux coups avant la récupération. Il encaisse bien : 96 PV et 130 d'étourdissement.
- **Observation** : c'est le seul ennemi dont la lenteur est lisible. Un modèle pour les autres.

## Lancier du Suaire
- **Rôle** : apprendre à ne pas marteler l'attaque légère.
- **Portée** : mêlée.
- **Signal** : le pavois, visible en permanence.
- **Attaque** : charge de 310 px/s.
- **Règle de garde** : `shielded`. Les attaques légères de face sont bloquées ; l'attaque lourde, une attaque quand il est étourdi, ou le contournement passent.
- **Contre-jeu** : attaque lourde, parade pour étourdir, ou passage dans le dos.
- **Observation** : le test `blockedByShield` repose sur `player.facing !== e.facing`. Un ennemi qui fait face au joueur est protégé, mais la garde ne dépend pas de la distance ni d'un geste de l'ennemi.

## Arbalétrier Cendré
- **Rôle** : tir précis à longue portée, force à fermer la distance ou à se couvrir.
- **Portée** : 360 px.
- **Signal** : préparation de 0,65 s (la plus longue de tous) ; le texte de lore annonce un trait carmin de visée.
- **Attaque** : carreau rapide de 520 px/s, rayon 6, 2,2 s de vie.
- **Contre-jeu** : esquive à l'instant du tir, ou approche en profitant de la lecture longue.
- **Observation** : le trait de visée du lore n'est pas dans l'IA (`executeEnemyAttack` ne crée rien avant le tir). Il faut vérifier `enemyRender.ts` pour savoir si c'est un simple effet.

## Spectre d'Éclipse
- **Rôle** : casser le recul du joueur et le forcer à se retourner.
- **Portée** : mêlée, vitesse 175 px/s (la plus rapide).
- **Signal** : une petite salve de particules violettes au début de la préparation.
- **Attaque** : il se téléporte à 54 px derrière le joueur, se retourne, puis fonce à 240 px/s.
- **Contre-jeu** : esquive vers l'arrière, parade au retour, ou frappe immédiate pendant la récupération.
- **Observation** : le Spectre a la même durée de préparation que le Pénitent. La téléportation est la seule surprise ; un son et une lueur dorée (annoncée par le lore) la rendraient équitable.

## Acolyte Pyromancien
- **Rôle** : contrôle de zone, oblige à bouger.
- **Portée** : 310 px.
- **Signal** : un cercle runique au sol, 0,65 s de télégraphe, rayon 28.
- **Attaque** : geyser (`eruption`) sur la position du joueur au moment du tir, 1,05 s de vie.
- **Contre-jeu** : quitter le cercle.
- **Observation** : c'est l'ennemi le plus lisible. Il sert de référence pour les autres signaux.

## Les Gardiens
Les trois Gardiens (Archonte, Mère, Souverain) sont décrits dans [[Phase 2 des Gardiens]].

## Deux prototypes à transmettre à Codex

### Prototype 1. Le Spectre annonce son apparition (équité)
- **Constat** : le Spectre apparaît dans le dos du joueur avec la même préparation de 0,44 s que les autres ennemis et un signal très discret.
- **Proposition** : ajouter, avant la téléportation, une silhouette dorée qui marque l'endroit d'arrivée pendant 0,25 s, et laisser le Spectre vulnérable 0,15 s à l'apparition. Un son court et aigu au départ.
- **Fichiers probables** : `src/game/engine.ts` (`executeEnemyAttack`, branche `specter`), `src/game/enemyRender.ts`, `src/game/audio.ts`.
- **Vérification** : test à graine fixe : le point d'arrivée affiché avant l'attaque est la position finale à 1 px ; essai en jeu : parade possible dès le premier Spectre de la strate 3, sans connaître l'ennemi.
- **Réglages** : durée de marque 0,2 à 0,3 s ; ne pas dépasser 0,2 s de vulnérabilité pour ne pas supprimer le danger.

### Prototype 2. Le Veilleur varie son tir (rythme)
- **Constat** : un seul orbe lent à cadence fixe. Il devient trivial une fois la parade apprise.
- **Proposition** : après trois tirs, le Veilleur « charge » (lueur 0,5 s) et tire une salve de deux orbes en éventail légèrement décalés. La parade renvoie toujours l'orbe central.
- **Fichiers probables** : `src/game/engine.ts` (`executeEnemyAttack`, branche `watcher`), `src/game/projectiles.ts`, `src/game/enemyRender.ts`.
- **Vérification** : test unitaire sur `attackPattern` (la salve intervient au troisième tir) ; essai en jeu : le joueur qui ne bouge pas subit la salve, celui qui pare renvoie un orbe.
- **Réglages** : écart angulaire de 0,15 à 0,25 rad ; dégâts de l'orbe latéral à 70 % des dégâts de base.

Aucun de ces prototypes n'est commencé dans le code : ce sont des fiches de conception. Ils ne touchent que les ennemis, donc pas de conflit avec C01 à C07.
