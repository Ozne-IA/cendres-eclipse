---
title: Validation
tags:
  - cendres-eclipse
  - validation
---

# Validation

Depuis la racine du dépôt, utiliser Node.js 22.12 ou une version LTS plus récente. Les commandes reprennent les contrôles GitHub Actions. [Workflow CI](https://github.com/Ozne-IA/cendres-eclipse/blob/main/.github/workflows/verify.yml)

```sh
npm ci
npm run lint
npm test
npm run build
node --check launcher/server-pc.mjs
```

Pour un changement de commandes, vérifier le trajet écran titre → Cour → pause → Bastion → expédition. Contrôler le focus visible, les appuis maintenus, la fermeture des options et la conservation de la progression après l’entraînement. La validation de la PR #6 utilisait une manette simulée dans Chromium. [Scénarios et vérifications de la PR #6](https://github.com/Ozne-IA/cendres-eclipse/pull/6)

Les tests de cadence rejouent le même combat avec une graine fixe à 30, 60, 120 et 144 images par seconde. Ils couvrent aussi le ralenti, la pause, l’arrêt à l’impact, les appuis entre deux mises à jour, la manette et l’interpolation des positions.

Pour un changement de sauvegarde, faire les essais avec des fichiers de test. Les tests du dépôt couvrent la récupération depuis `.bak` et le rafraîchissement de la page servie par le service worker. [Sauvegarde PC](https://github.com/Ozne-IA/cendres-eclipse/blob/main/test/pc-save.test.mjs) · [Cache web](https://github.com/Ozne-IA/cendres-eclipse/blob/main/test/service-worker.test.mjs)

Les tests audio simulent l’API Web Audio. Ils vérifient que les biomes et les deux phases de chaque gardien produisent des séquences distinctes, que la musique baisse en combat et lors d’une parade, et que le mixage suit les réglages de volume. L’écoute manuelle en jeu reste à faire.

Les tests de la chronique couvrent la compatibilité des anciennes sauvegardes, la validation des données importées, la limite de l’historique et la conservation des records. Ils vérifient aussi le calcul des dégâts réellement infligés et l’enregistrement d’une seule entrée par expédition.

La reprise de l’audio et des statistiques a passé le contrôle TypeScript, les 53 tests, la compilation de production et la vérification de syntaxe du serveur PC.

Après le découpage, 24 scénarios à graine fixe, avec toutes les armes, en expédition et dans la Cour, donnent les mêmes états de jeu, de caméra, de HUD et de sauvegarde qu’avant l’extraction. Les 63 tests, TypeScript et la compilation de production passent.

Revenir à [[Accueil]] ou consulter [[Architecture]].
