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
2. **`prefers-reduced-motion`** (`src/index.css`) : animations et transitions réduites si le système le demande.

**Décision de l'utilisateur (21/11/2026) : le téléphone et la tablette ne sont PAS une cible pour ce jeu** (ils étaient réservés au bot Discord). Luc avait écrit des commandes tactiles et un HUD compact ; ils ont été retirés de cette branche et gardés, intacts et optionnels, sur la branche `luc/commandes-tactiles-optionnel` (aucune fusion prévue). Ne pas travailler sur le mobile sans nouvelle demande.

Vérifications faites : `npm run lint` propre, `npm test` 46 tests réussis, `npm run build` réussi.

## Ce que Luc n'a PAS fait (à reprendre, dans l'ordre conseillé)

Les numéros renvoient à `cendres-eclipse-audit.md` dans le cerveau.

- **Téléphone et tablette : hors cible** (voir plus haut). Le travail tactile reste sur `luc/commandes-tactiles-optionnel` si l'utilisateur change d'avis.
- **Pas de temps fixe à 60 Hz** avec interpolation (#1) et **tests de combat déterministes** avec graine (#58) : réalisés ensemble avant le découpage. Voir [[Validation]].
- **Découper `src/game/engine.ts`** (2194 lignes) (#57), puis `artSprites.ts`, `renderer.ts`.
- **`devicePixelRatio`** : le canvas est flou sur écrans HiDPI (#51).
- **Chaîne de migration des sauvegardes** testée, somme de contrôle, 3 copies tournantes (#66, #67).
- **Polices Google Fonts en local** (#75) : demande de télécharger les fichiers, à valider avec l'utilisateur.
- **Rustine `navigator.webdriver`** dans `engine.ts` (boucle à 120 ms pour les navigateurs automatisés) : conservée, car les outils d'automatisation s'en servent ; à retirer quand des tests E2E existeront (#55).
- **Contenu** : doubler le bestiaire (#11) et développer les phases des boss. Les thèmes musicaux par biome et par boss (#26), avec une variation en phase 2, sont en place.
- **Publication** : démo itch.io, licence et crédits (#83, #84).
- **Coffre Obsidian et Graphify** : l'utilisateur a installé les deux ; il reste à régénérer le graphe (voir [[Accueil]]) et à garder [[Decisions]] à jour.

## Règles à suivre

- Écrire dans ce coffre, à chaque fin de tâche : décision dans [[Decisions]], vérifications dans [[Validation]], et ajouter une ligne en bas de cette note.
- Toujours `npm run lint`, `npm test` et `npm run build` avant de pousser. Relire le diff (`git diff --stat`) pour éviter un fichier écrasé ou vidé.
- Pas de suppression de fichiers de l'utilisateur sans demande. Pas de secrets dans le coffre ni dans le dépôt.
- Le jeu a été écrit avec Codex : garder les fichiers petits, ajouter un test à chaque changement de logique.

## Journal de passation

- 21/11/2026, Luc : sécurité du serveur, réduction des animations. Commandes tactiles écrites puis retirées (le mobile n'est pas une cible), gardées sur une branche à part.
- 21/11/2026, Codex : audio adaptatif et effets de combat enrichis (`39125be`), statistiques et chronique des expéditions au Bastion (`1c9ba3e`). Les vérifications audio sont simulées. L’écoute manuelle reste à faire. Voir [[Validation]].

- 21/11/2026, Codex : simulation à 60 Hz, interpolation et tests de combat à graine fixe.
