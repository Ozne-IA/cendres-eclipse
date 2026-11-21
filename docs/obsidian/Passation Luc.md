---
title: Passation Luc vers Codex
aliases:
  - Passation
tags:
  - cendres-eclipse
  - passation
---

# Passation de Luc (Claude Code) vers Codex

Note écrite le 21/11/2026 pour que Codex reprenne le travail sans se perdre. L'utilisateur a laissé à Luc le choix des priorités. Le même texte, avec plus de contexte, est dans le cerveau de l'utilisateur : `C:\Users\x-the\Desktop\cerveau\10-Projets\cendres-eclipse-passation-codex.md` (audit complet : `cendres-eclipse-audit.md`, règles de travail : `REGLES.md`).

## Où travailler

| Dossier | Statut |
|---|---|
| `C:\Users\x-the\Documents\GitHub\cendres-eclipse` | **Le bon dépôt**, relié à GitHub `Ozne-IA/cendres-eclipse`. Mis à jour sur `origin/main` (PR #10) avant ce travail. |
| `C:\Users\x-the\Desktop\cendres-eclipse` | **À ne pas utiliser.** Dépôt git vide à la racine, copie ancienne (12 commits) imbriquée dans `cendres-eclipse-main/`, 98 fichiers modifiés non commités qui datent d'avant les PR #1 à #10, ZIP, `artSprites.ts.restored`, PNG de 7 Mo. Rien n'a été supprimé ni modifié. Le nettoyage se fera seulement avec l'accord de l'utilisateur. |

Avant de commencer : `git switch main`, `git pull`, vérifier `git log` (la PR #10 doit y être), puis créer une branche `codex/...`.

## Ce que Luc a fait (branche `luc/securite-serveur-et-sauvegarde`)

1. **Serveur PC sécurisé** (`launcher/server-pc.mjs`, test `test/pc-security.test.mjs`) : `Host` et `Origin` doivent désigner le serveur (127.0.0.1, localhost ou [::1] avec le bon port), sinon réponse 403 sur toutes les pages et sur `/api/save` ; en-têtes `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, `Content-Security-Policy: frame-ancestors 'none'`, `Cross-Origin-Resource-Policy` ; chemins résolus avec `path.resolve` et gardés dans `dist/`. Raison : une page web tierce pouvait écraser la sauvegarde (audit, point 72).
2. **Commandes tactiles** (`src/components/TouchControls.tsx` et `.css`, `src/game/input.ts`, `src/game/engine.ts`, `src/App.tsx`) : pavé de déplacement à glisser + 8 boutons, affichés seulement sur écran tactile (`pointer: coarse`) ; `?touch=1` les force sur ordinateur. `InputHub.setVirtual(control, down)` alimente les mêmes actions que le clavier (mode d'entrée « Tactile »), `CendresEngine.setVirtualControl()` relie l'interface au moteur. Test : `src/game/input.test.ts`.
3. **HUD compact** en paysage court (≤ 460 px de haut, `GameHud.css`), vérifié à 667 × 375.
4. **`viewport-fit=cover`, `touch-action`, `overscroll-behavior`** (pas de zoom au double-tap ni de rebond) et **`prefers-reduced-motion`** (`src/index.css`).

Vérifications faites : `npm run lint` propre, `npm test` 47 tests réussis, `npm run build` réussi. Rendu vérifié dans le navigateur intégré (qui ne tient que 2 à 5 images par seconde : fluidité non jugée).

## Ce que Luc n'a PAS fait (à reprendre, dans l'ordre conseillé)

Les numéros renvoient à `cendres-eclipse-audit.md` dans le cerveau.

- **À tester à la main sur un vrai téléphone** : positions des boutons tactiles, confort du pouce, HUD en portrait (375 px) et en tablette portrait (moitié basse vide).
- **Pas de temps fixe à 60 Hz** avec interpolation (#1) et **tests de combat déterministes** avec graine (#58) : à faire ensemble, avant tout découpage.
- **Découper `src/game/engine.ts`** (2194 lignes) (#57), puis `artSprites.ts`, `renderer.ts`.
- **`devicePixelRatio`** : le canvas est flou sur écrans HiDPI (#51).
- **Chaîne de migration des sauvegardes** testée, somme de contrôle, 3 copies tournantes (#66, #67).
- **Polices Google Fonts en local** (#75) : demande de télécharger les fichiers, à valider avec l'utilisateur.
- **Rustine `navigator.webdriver`** dans `engine.ts` (boucle à 120 ms pour les navigateurs automatisés) : conservée, car les outils d'automatisation s'en servent ; à retirer quand des tests E2E existeront (#55).
- **Contenu** : doubler le bestiaire (#11), thèmes musicaux par biome et par boss (#26), vrais boss à phases.
- **Publication** : démo itch.io, licence et crédits (#83, #84).
- **Coffre Obsidian et Graphify** : l'utilisateur a installé les deux ; il reste à régénérer le graphe (voir [[Accueil]]) et à garder [[Decisions]] à jour.

## Règles à suivre

- Écrire dans ce coffre, à chaque fin de tâche : décision dans [[Decisions]], vérifications dans [[Validation]], et ajouter une ligne en bas de cette note.
- Toujours `npm run lint`, `npm test` et `npm run build` avant de pousser. Relire le diff (`git diff --stat`) pour éviter un fichier écrasé ou vidé.
- Pas de suppression de fichiers de l'utilisateur sans demande. Pas de secrets dans le coffre ni dans le dépôt.
- Le jeu a été écrit avec Codex : garder les fichiers petits, ajouter un test à chaque changement de logique.

## Journal de passation

- 21/11/2026, Luc : sécurité du serveur, commandes tactiles, HUD compact, réduction des animations. Voir ci-dessus.
