---
title: Architecture
tags:
  - cendres-eclipse
  - architecture
---

# Architecture

- **Boucle de jeu.** `src/App.tsx` relie React au moteur et affiche les écrans associés à sa phase. Le moteur fait évoluer l’expédition et le module de rendu dessine la scène sur Canvas 2D. [App](https://github.com/Ozne-IA/cendres-eclipse/blob/main/src/App.tsx) · [Moteur](https://github.com/Ozne-IA/cendres-eclipse/blob/main/src/game/engine.ts) · [Rendu](https://github.com/Ozne-IA/cendres-eclipse/blob/main/src/game/renderer.ts)
- **Salles et progression.** `levelGen.ts` génère les salles, dont la Cour d’entraînement. `rules.ts` porte les règles de progression et de validation des sauvegardes. `data.ts` contient les définitions des armes, des ennemis et des améliorations. [Salles](https://github.com/Ozne-IA/cendres-eclipse/blob/main/src/game/levelGen.ts) · [Règles](https://github.com/Ozne-IA/cendres-eclipse/blob/main/src/game/rules.ts) · [Données](https://github.com/Ozne-IA/cendres-eclipse/blob/main/src/game/data.ts)
- **Commandes.** `InputHub` lit le clavier, la souris et la manette. `menuNavigation.ts` déplace le focus et valide les actions du menu au premier plan. [Entrées](https://github.com/Ozne-IA/cendres-eclipse/blob/main/src/game/input.ts) · [Navigation](https://github.com/Ozne-IA/cendres-eclipse/blob/main/src/game/menuNavigation.ts)
- **Sauvegarde et mode hors ligne.** Le navigateur conserve la progression dans `localStorage`. Le lanceur PC sert le jeu et son API de sauvegarde sur la boucle locale, avec une copie `.bak`. Le service worker du build permet de rouvrir le jeu sans réseau. [Sauvegarde navigateur](https://github.com/Ozne-IA/cendres-eclipse/blob/main/src/game/rules.ts) · [Lanceur PC](https://github.com/Ozne-IA/cendres-eclipse/blob/main/launcher/server-pc.mjs) · [Service worker](https://github.com/Ozne-IA/cendres-eclipse/blob/main/src/pwa/sw.js)

Voir aussi [[Decisions|Décisions]] et [[Validation]].
