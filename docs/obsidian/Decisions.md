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

Pour suivre ces choix dans le projet, voir [[Architecture]] et [[Validation]].
