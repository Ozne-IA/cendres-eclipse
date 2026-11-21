---
title: Protocole d'essai matériel
tags:
  - cendres-eclipse
  - validation
  - passation
---

# Protocole d'essai matériel

Pour les tâches du [[Backlog de passation]] qui demandent un humain devant un PC : L01, L14, L15, L16 (puis L23, le tableau de validation). Durée prévue : 45 minutes. Matériel requis : un PC Windows avec Node.js 22.12, un casque, les haut-parleurs, une manette Xbox, une manette DualSense et, si possible, un écran 120 ou 144 Hz.

Avant de commencer : prendre la dernière release sur la page Releases du dépôt, décompresser le zip dans un dossier dont le nom contient un accent et une espace (par exemple `Cendres éclipse test`), puis lancer `Lancer_Cendres_Eclipse.bat`.

## L01. Le zip sur un autre ordinateur
1. Le jeu s'ouvre dans une fenêtre. Noter le temps de démarrage.
2. Jouer une minute, ouvrir le Bastion, acheter une amélioration, quitter.
3. Vérifier que `cendres-eclipse-save.json` existe à côté du jeu, puis relancer : la progression est retrouvée.
4. Écrire au verso : si Node.js manque, le message du lanceur est-il compréhensible ?

## L14. Fluidité à 60 et 120/144 Hz
Réglage de l'écran dans Windows (Paramètres, Affichage, Affichage avancé). Faire les mêmes gestes à 60 Hz puis à 120 ou 144 Hz.
- Déplacement : démarrage et arrêt nets, pas de saccade sur les plateformes.
- Esquive et saut : la distance parcourue est la même aux deux cadences.
- Parade : la fenêtre de parade paraît-elle identique ?
- Ralenti de l'arrêt à l'impact : fluide, sans à-coup.
- Activer le compteur d'images (réglages graphiques) et noter la valeur dans un combat chargé.

## L15. Son au casque puis aux haut-parleurs
- Les attaques ennemies restent-elles audibles par-dessus la musique ?
- Transitions entre biomes et avant un Gardien : brusques ou douces ?
- Écarts de volume entre effets (parade parfaite, rang Éclipse, coffres, interface).
- Régler les curseurs : chacun agit-il bien sur ce qu'il annonce ?

## L16. Manettes et claviers
- Xbox puis DualSense : menus, Cour, expédition, pause. Les pictogrammes affichés correspondent-ils à la manette ?
- Débrancher la manette en plein combat : aucune commande intempestive ? La rebrancher : reprise correcte ?
- Clavier AZERTY puis QWERTY : les touches par défaut sont-elles utilisables ? Le remappage fonctionne-t-il ?

## Tableau de résultats (L23)
Copier une ligne par essai dans la note de la version testée.

| Date | Version | Matériel | Essai | Résultat | Preuve (capture, vidéo) |
|---|---|---|---|---|---|
| | | | | | |

Quand les essais sont faits, noter les observations et les correctifs à prévoir dans le [[Point de reprise]], avec les identifiants du backlog.
