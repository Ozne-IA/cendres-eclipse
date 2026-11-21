---
title: Décisions
tags:
  - cendres-eclipse
  - decisions
---

# Décisions

- **Séparer la sauvegarde du cache web.** Le lanceur peut relire la copie `.bak` si la sauvegarde principale est absente ou corrompue. La version web charge en priorité la page actuelle lorsqu’elle est en ligne. [PR #4](https://github.com/Ozne-IA/cendres-eclipse/pull/4)
- **Rendre les premiers combats plus lisibles.** Un triangle signale l’attaque à venir. La Cour est accessible depuis le titre et sert à répéter les actions sans créditer les gains d’une expédition. Au Bastion, le bilan affiche les gains effectivement crédités et peut mettre en avant le premier niveau du Foyer Éternel. [PR #5](https://github.com/Ozne-IA/cendres-eclipse/pull/5)
- **Distinguer les commandes des menus et du combat.** Le premier appui sur A/Croix depuis un titre sans sélection met l’action principale en évidence. Un appui maintenu pendant une transition ne valide pas l’écran suivant. [PR #6](https://github.com/Ozne-IA/cendres-eclipse/pull/6)

- **Protéger le serveur local.** Seules les requêtes dont `Host` et `Origin` désignent le serveur sont acceptées : une page web tierce ne peut plus écraser la sauvegarde. Les chemins restent confinés à `dist/` et les réponses portent des en-têtes de sécurité. [[Passation Luc]]
- **Pas de version téléphone.** Le jeu vise l'ordinateur ; le mobile est réservé au bot Discord. Des commandes tactiles ont été écrites puis laissées sur une branche à part. [[Passation Luc]]
- **Adapter la musique à la situation.** Chaque biome et chaque gardien a son motif. Celui des gardiens varie entre les deux phases. La musique baisse en combat et pendant certains effets, dont la parade parfaite et le jingle du rang Éclipse. Les attaques légères, lourdes et les arts utilisent le timbre de l’arme équipée.
- **Conserver une chronique locale des expéditions.** Le Bastion présente les 20 dernières expéditions terminées, avec des records qui persistent au-delà de cet historique. Le bilan compare l’expédition à la précédente. La Cour reste exclue de la chronique.

- **Fixer la simulation à 60 Hz.** Le ralenti espace les mises à jour de 1/60 s. Le rendu interpole la caméra et les positions entre deux mises à jour. Le combat et la génération utilisent un tirage aléatoire indépendant des effets visuels et reproductible dans les tests.

Pour suivre ces choix dans le projet, voir [[Architecture]] et [[Validation]].
