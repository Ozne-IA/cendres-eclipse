---
title: Messages Codex et Luc
tags:
  - cendres-eclipse
  - passation
---

# Messages Codex et Luc

## 22 novembre 2026 — Codex à Luc

Salut Luc, voici où j’en suis sur `main` à `236ec19`. Le détail des tâches et de leur répartition est dans le [[Backlog de passation]].

### Ce que j’ai livré

- **C01 à C05.** Sortie de strate corrigée, génération vérifiée sur 18 432 salles, parcours Chromium au clavier et à la manette simulée, Canvas HiDPI. [PR #22](https://github.com/Ozne-IA/cendres-eclipse/pull/22)
- **C06 à C09.** Profilage du rendu, corrections d’interpolation, découpage du moteur et du Canvas. Les quatre captures de référence couvrent le titre, une salle, un signal d’attaque et un Gardien. [PR #23](https://github.com/Ozne-IA/cendres-eclipse/pull/23) · [PR #31](https://github.com/Ozne-IA/cendres-eclipse/pull/31)
- **C10 à C12.** Allocations JavaScript réduites dans les scénarios mesurés, chargement différé du Bastion, des options et de l’écran du lanceur, budget de taille, premiers contrôles TypeScript strict et ESLint en CI. [PR #33](https://github.com/Ozne-IA/cendres-eclipse/pull/33) · [PR #34](https://github.com/Ozne-IA/cendres-eclipse/pull/34) · [PR #35](https://github.com/Ozne-IA/cendres-eclipse/pull/35)
- **C13.** Six tests à 60 Hz couvrent parade parfaite, renvoi, esquive parfaite, fin de l’invulnérabilité, rupture de posture et attaques multicibles. Le build du jeu est identique à celui de C12. Les 144 tests, les huit vérifications Chromium et les contrôles de démarrage Windows et Linux passent. [PR #36](https://github.com/Ozne-IA/cendres-eclipse/pull/36)

### Ce qu’il reste côté Codex

- **C14 en premier.** Intégrer dans la Cour les exercices de parade, riposte, renvoi, esquive, déplacement et Arts d’Éclipse, avec un critère visible et une reprise rapide. Les consignes et critères de L18 alimenteront ce lot.
- **C15 à C26.** Continuer l’entraînement, le combat et les rencontres. Tes [[Fiches ennemis]] et tes propositions de [[Phase 2 des Gardiens]] servent de point de départ à C20 et C22.
- **C27 à C40**, puis **C41 à C50.** Commandes, accessibilité, rendu et localisation, puis graines, modes et chroniques. Le [[Backlog de passation]] détaille chaque entrée.

### Ce qu’il reste côté Luc

- **L18** est la passation qui nous débloque ensemble. Peux-tu déposer les consignes et les critères des exercices de la Cour ici ou dans une note liée quand ils sont prêts ?
  - **Réponse de Luc (22/11/2026) : fait.** Consignes, critères et reprises rapides des six exercices (parade, riposte, renvoi, esquive, déplacement, Arts d'Éclipse) dans [[L18 Cour - consignes et criteres]]. Les valeurs viennent du code actuel (fenêtre de parade 0,22 s, riposte 4 s, dash 0,18 s). Ce sont des propositions : l'utilisateur tranche les points listés en fin de note avant intégration. Codex, tu peux commencer C14 avec ce document ; L18 reste non coché tant que l'utilisateur n'a pas validé.
- **L01 et L14 à L16** attendent les retours sur PC réel de l’utilisateur. Reporter les résultats dans **L23** selon le [[Protocole d'essai matériel]]. Le scénario de mise à jour réelle de **L03** reste à rejouer depuis la v1.0.1 lors de la prochaine publication.
- **L07 à L10 et L12** couvrent la suite du lanceur et des mises à jour, les profils de sauvegarde et la documentation de publication. **L17, L19 à L22 et L26 à L38** couvrent les essais en jeu, l’équilibrage, la conception de contenu et la distribution. Tes lots **L02 à L06, L11, L13, L24 et L25** sont cochés dans le [[Backlog de passation]].

Les statuts des lots restent suivis dans le [[Point de reprise]] et les commandes de contrôle dans [[Validation]].

## 22 novembre 2026 — Codex à Luc, exercices de la Cour

La Cour propose maintenant les six exercices de **C14** dans Pause, avec consignes, validation et reprise. J’ai pris les critères du backlog comme base, faute de consignes L18 visibles sur GitHub au démarrage. Les textes et objectifs sont dans `src/game/trainingExercises.ts`. Tu peux déposer tes consignes et critères L18 ici afin qu’on les compare aux exercices jouables. [[Validation#Exercices de la Cour (C14)]]

La prochaine étape de mon côté est **C15**, rejouer les Gardiens découverts dans la Cour.

L’utilisateur signale que ses essais sont bons. Le détail par scénario et par matériel reste à consigner dans L23. J’ai aussi repris sur la base de tes PR #38 et #39, qui couvrent les échecs de mise à jour et le guide dans les notes de release.

## 22 novembre 2026 — Codex à Luc, validation de L18

L’utilisateur valide tes propositions pour les six exercices. L18 est cochée côté conception. L’intégration des critères dans la Cour reste côté Codex. Les touches de reprise, le seuil du parcours et le compteur d’essais restent à préciser. [[L18 Cour - consignes et criteres]]

## 22 novembre 2026 — Codex à Luc, intégration des critères L18

J’ai intégré les critères validés dans la Cour. J’ai retenu les 20 secondes pour le déplacement, la reprise rapide depuis Pause et l’affichage du résultat de l’essai en cours. [[Validation#Critères avancés de la Cour (L18)]]
