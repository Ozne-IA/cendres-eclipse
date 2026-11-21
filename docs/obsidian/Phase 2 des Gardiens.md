---
title: Phase 2 des Gardiens
tags:
  - cendres-eclipse
  - conception
  - gardiens
  - passation
---

# Phase 2 des Gardiens (L25)

Tâche L25 du [[Backlog de passation]], à lire avec [[Fiches ennemis]]. Valeurs relevées dans `src/game/levelGen.ts` et `src/game/engine.ts` à la révision `dea82b8`.

## Ce que le code fait aujourd'hui
Les trois Gardiens (Archonte, Mère des Cendres, Souverain) partagent **le même comportement**. Ils diffèrent par leurs PV, leurs dégâts, leur taille et leur couleur, et le Souverain tire des croissants (`crescent`) à la place d'orbes.

| | Archonte | Mère | Souverain |
|---|---|---|---|
| PV de base | 350 | 400 | 480 |
| Dégâts de base | 28 | 30 | 33 |
| Étourdissement max | 155 | 165 | 185 |
| Taille (px) | 56 × 88 | 60 × 92 | 64 × 96 |
| Strate | 3 | 6 | 9 |

La transition (`engine.ts`, vers la ligne 1222) se déclenche à 50 % des PV : arrêt sur image de 0,07 s, secousse, anneau, flash et fissure rouges, quatre éclairs, son de Gardien.

Avant la transition, il y a trois motifs qui tournent : 0 charge seule, 1 salve de 3 orbes, 2 charge seule. Après la transition, le motif 2 devient un pilier de feu au sol sous le joueur (rayon 36, télégraphe 0,55 s). Tout le reste devient simplement plus rapide :

| | Phase 1 | Phase 2 |
|---|---|---|
| Préparation | 0,50 s | 0,42 s |
| Récupération | 0,50 s | 0,35 s |
| Attente entre attaques | 0,80 s | 0,55 s |
| Vitesse de marche | 165 | 195 |
| Charge | 410 | 480 |
| Orbes par salve | 3 | 5 |
| Vitesse des orbes | 340 | 400 |

## Problèmes constatés
1. **Aucune identité** : le texte de lore annonce « des ondes sismiques » pour l'Archonte et « des pluies écarlates et des entailles traversantes » pour la Mère, mais le code donne le même pilier de feu aux trois.
2. **La phase 2 est surtout du chiffre** : 25 % plus de vitesse et deux orbes de plus. Ce qui change vraiment est l'attente entre deux attaques (0,80 → 0,55 s), qui comprime le temps de repos du joueur.
3. **La transition ne laisse pas de répit lisible** : le Gardien passe à `idle` avec 0,6 s d'attente, sans phase de vulnérabilité ni d'invulnérabilité annoncée.
4. **La charge ne se télégraphe que par la préparation** : aucun tracé au sol, aucun son propre à chaque Gardien.

## Conception proposée
Principe commun : **la transition devient un moment lisible, et chaque Gardien reçoit deux attaques de phase 2 qui répondent à un geste précis du joueur**. Les valeurs de départ sont à régler par essai, pas à prendre comme définitives.

### Transition commune
- Le Gardien est invulnérable 1,2 s (au lieu d'être touchable pendant l'animation) et ne bouge plus.
- Pendant cette durée, une teinte de phase s'installe (rouge pour l'Archonte, pourpre pour la Mère, blanc doré pour le Souverain) et la musique bascule sur la séquence de phase 2 (déjà prévue dans `audio.ts`).
- Au bout de 1,2 s, une onde de choc non létale repousse le joueur de 120 px : elle sert de répit et évite les coups à bout portant.
- Réglage possible : 0,8 s pour le premier Gardien, 1,2 s pour les suivants. Réduire si l'essai matériel (L14) montre que l'attente semble longue.
- En mode « réduire les flashs », remplacer le flash par un anneau.

### L'Archonte du Beffroi — « le glas »
Thème : cloche, ondes sismiques (déjà dans le lore).
1. **Le glas** (réponse : sauter). Il frappe le sol, une onde plate de 40 px de haut se propage à 360 px/s dans les deux sens. Télégraphe : cloche levée 0,6 s + son grave. Dégâts à 80 % du coup normal. Le saut, ou l'esquive, la franchit.
2. **La volée de cloche** (réponse : parer). Trois frappes en trois battements réguliers (0,45 s). Les trois sont parables ; la troisième étourdit le Gardien si la parade est parfaite.
- Variation anti-routine : le glas est rarement suivi d'une volée, jamais deux fois de suite la même.

### La Mère des Cendres — « la pluie »
Thème : pluies écarlates, entailles traversantes (déjà dans le lore).
1. **La pluie écarlate** (réponse : se déplacer, se couvrir). Cinq zones de chute marquées au sol 0,7 s avant l'impact, à des endroits répartis sur toute la salle, une seule zone sûre de 150 px de large. La zone sûre ne se trouve jamais à plus de 450 px du joueur.
2. **L'entaille traversante** (réponse : esquiver, passer à travers). Elle disparaît (0,3 s), puis traverse la salle en ligne droite en laissant une traînée de 0,5 s ; le joueur doit être en l'air ou en esquive à l'instant du passage. Un trait sombre au sol, visible 0,6 s, indique la hauteur.
- Contrepartie : après l'entaille, la Mère reste étourdie 1,0 s en bout de salle.

### Le Souverain de l'Éclipse — « les lames »
Thème : lames orbitales, croissants (déjà dans les tirs).
1. **La couronne de lames** (réponse : rythme et placement). Trois lames tournent autour du Souverain pendant 4 s, à rayon croissant de 80 à 220 px. Un sillage doré les rend visibles. Elles sont parables (une lame parée est retirée).
2. **L'éclipse** (réponse : sortir de l'ombre). Le centre de la salle s'obscurcit ; le joueur dans l'ombre perd de la stamina plus vite et ne peut pas parer. Un cercle de lumière de 220 px se déplace lentement ; il faut y rester. Dure 5 s, réglable.
- Le Souverain est le Gardien final : sa phase 2 peut enchaîner deux de ses attaques sans pause, le seul à le faire.

## Priorité d'intégration
1. Transition commune (peu de code : un compteur dans l'état du Gardien).
2. Archonte (premier Gardien, strate 3) : glas et volée.
3. Mère, puis Souverain.

Cet ordre permet de vérifier chaque Gardien sans toucher au suivant.

## Ce qu'il faut vérifier avant d'intégrer
- Les ennemis communs partagent `executeEnemyAttack` : la nouvelle logique des Gardiens doit être dans une branche à part, pour ne pas changer les ennemis ordinaires.
- Les tests `audio.test.ts` supposent déjà deux séquences distinctes par Gardien : les conserver.
- Les rangs d'Ascension multiplient les dégâts : les nouvelles attaques doivent suivre `enemyDmgMult` comme les actuelles.
- Cadence : toutes les durées sont en secondes de simulation, pas en images, pour rester identiques à 60, 120 et 144 Hz (tests de cadence existants).
- Essai à la main : parade possible au premier passage de chaque attaque, sans connaître le Gardien (critère de lisibilité du backlog L20).

## Suite pour Codex
Cette note ne contient aucun code. Si Codex prend l'intégration, il doit d'abord ouvrir une branche à partir de `main`, ajouter la transition commune avec ses tests à graine fixe, puis les attaques par Gardien en un commit chacune, et noter ici la branche et le commit.
