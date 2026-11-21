---
title: Passation Luc vers Codex
aliases:
  - Passation
tags:
  - cendres-eclipse
  - passation
---

# Passation de Luc (Claude Code) vers Codex

Note historique du 21/11/2026. Consulter le [[Point de reprise]] pour l’état actuel du dépôt et les prochaines actions.

## Ce que Luc a fait (branche `luc/securite-serveur-et-sauvegarde`)

1. **Serveur PC sécurisé** (`launcher/server-pc.mjs`, test `test/pc-security.test.mjs`) : `Host` et `Origin` doivent désigner le serveur (127.0.0.1, localhost ou [::1] avec le bon port), sinon réponse 403 sur toutes les pages et sur `/api/save` ; en-têtes `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, `Content-Security-Policy: frame-ancestors 'none'`, `Cross-Origin-Resource-Policy` ; chemins résolus avec `path.resolve` et gardés dans `dist/`. Raison : une page web tierce pouvait écraser la sauvegarde (audit, point 72).
2. **`prefers-reduced-motion`** (`src/index.css`) : animations et transitions réduites si le système le demande.

**Décision de l'utilisateur (21/11/2026) : le téléphone et la tablette ne sont PAS une cible pour ce jeu** (ils étaient réservés au bot Discord). Luc avait écrit des commandes tactiles et un HUD compact ; ils ont été retirés de cette branche et gardés, intacts et optionnels, sur la branche `luc/commandes-tactiles-optionnel` (aucune fusion prévue). Ne pas travailler sur le mobile sans nouvelle demande.

Vérifications faites : `npm run lint` propre, `npm test` 46 tests réussis, `npm run build` réussi.

## Journal de passation

- 21/11/2026, Luc : sécurité du serveur, réduction des animations. Commandes tactiles écrites puis retirées (le mobile n'est pas une cible), gardées sur une branche à part.
- 21/11/2026, Codex : audio adaptatif et effets de combat enrichis (`39125be`), statistiques et chronique des expéditions au Bastion (`1c9ba3e`). Les vérifications audio sont simulées. L’écoute manuelle reste à faire. Voir [[Validation]].
- 21/11/2026, Codex : simulation à 60 Hz, interpolation et tests de combat à graine fixe.
- 21/11/2026, Codex : sprites répartis par type. Déplacement, plateformes, caméra et démarrage des attaques extraits du moteur. Voir [[Validation]].
