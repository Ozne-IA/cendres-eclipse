---
title: Backlog de passation
date: 2026-11-21
tags:
  - cendres-eclipse
  - passation
  - backlog
---

# Backlog de passation

Ce backlog prend pour référence `origin/main` du dépôt `Ozne-IA/cendres-eclipse` au commit [`8cf056f`](https://github.com/Ozne-IA/cendres-eclipse/commit/8cf056f88684ce2c73f8886d9ecd91374fd48c24). Cette note consigne les tâches proposées. Sa rédaction ne lance aucune implémentation.

## Premier lot

- **Codex** — C01 à C05 terminées. Résultats dans [[Validation#Premier lot Codex (C01 à C05)]].
- **Luc (Claude Code)** — L01 à L05 et L14 à L16, puis L24 et L25 en pilote.

### Défaut de génération observé pour C01

Sur 1 000 graines testées en strate 1, 35 produisent une plateforme finale de largeur négative et 173 placent au moins un objet au-delà du bord droit de la salle. La graine 4 reproduit les deux cas. Le dernier segment et son fossé peuvent empiéter sur l’espace de la plateforme de sortie. [Générateur à la révision de référence](https://github.com/Ozne-IA/cendres-eclipse/blob/8cf056f88684ce2c73f8886d9ecd91374fd48c24/src/game/levelGen.ts#L265)

## Passation entre Codex et Luc

Au début d’un lot, annoncer les identifiants pris et travailler sur une branche issue de la version identifiée de `origin/main`. Pour un chantier commun, convenir de la version et de l’ordre des changements avant de modifier les mêmes fichiers.

À chaque retour, transmettre les identifiants, la branche et le commit ou la PR, les résultats vérifiables et la prochaine action, avec un scénario de reproduction ou une capture si utile. Luc transmet ses prototypes, critères de réussite et observations matérielles à Codex. Codex transmet les versions jouables, les changements intégrés et les contrôles à rejouer à Luc. Tenir le [[Point de reprise]] à jour et s’appuyer sur [[Validation]] pour les contrôles réutilisables.

## Codex (50 tâches)

### Moteur, génération et validation

- [x] **C01** — Corriger les fins de strate. Réserver assez de terrain pour l’approche, la sortie et l’événement qui la précède.
- [x] **C02** — Tester des milliers de graines. Vérifier dimensions, limites, apparitions et sortie accessible avec les capacités de base.
- [x] **C03** — Automatiser titre → Cour → pause → Bastion → expédition → bilan, au clavier et à la manette simulée.
- [x] **C04** — Après stabilisation des tests, retirer le traitement spécial de navigator.webdriver et tester la boucle utilisée par les joueurs.
- [x] **C05** — Corriger la netteté HiDPI du Canvas en conservant les coordonnées du jeu. Vérifier à 100 %, 125 %, 150 % et 200 %.
- [x] C06 — Mesurer séparément le temps de simulation, le rendu, les images sautées et le coût des couches du décor.
- [x] C07 — Corriger les discontinuités de rendu, dont la traversée visuelle entre les deux positions de téléportation du Spectre.
- [x] C08 — Extraire l’IA, la résolution des dégâts, les projectiles et les interactions de salle de engine.ts, par étapes avec scénarios à graine fixe avant et après.
- [x] C09 — Découper renderer.ts par couches et garder des captures de référence du titre, d’une salle, d’un télégraphe et d’un Gardien.
- [ ] C10 — Mesurer les allocations sur une longue expédition et optimiser les vrais postes de coût en combat.
- [ ] C11 — Fixer un budget JavaScript et ressources. Charger les gros écrans ou ressources lorsqu’ils sont nécessaires.
- [ ] C12 — Introduire TypeScript strict et ESLint progressivement, à partir des modules isolés.

### Combat, entraînement et rencontres

- [ ] C13 — Tester parade parfaite, renvoi, esquive parfaite, posture brisée, attaques multicibles et invulnérabilités.
- [ ] C14 — Ajouter des exercices de parade, riposte, renvoi, esquive, déplacement et Arts d’Éclipse dans la Cour, avec critère de réussite et reprise rapide.
- [ ] C15 — Permettre de rejouer un Gardien découvert dans la Cour, avec choix de phase et entraînement séparé des records.
- [ ] C16 — Affiner la mémorisation des commandes pendant les animations et vérifier attaque, esquive et saut au clavier et à la manette.
- [ ] C17 — Donner aux six armes des enchaînements et des choix propres à leur portée, vitesse et engagement.
- [ ] C18 — Différencier les Arts d’Éclipse par usage tactique, coût et récupération.
- [ ] C19 — Clarifier posture brisée, ouverture de riposte, effets actifs et récupération après attaque lourde.
- [ ] C20 — Diversifier les attaques ennemies selon la distance et le déroulement du combat. Commencer par deux archétypes pilotes conçus par Claude.
- [ ] C21 — Rythmer les attaques de groupe pour éviter que les salves et télégraphes se masquent mutuellement.
- [ ] C22 — Intégrer pour chaque Gardien une phase 2 propre, avec ses attaques, sa transition et son arène.
- [ ] C23 — Ajouter des mini-boss et rencontres d’élite qui demandent une réponse différente des combats ordinaires.
- [ ] C24 — Mélanger salles conçues à la main et segments procéduraux, par biome, profondeur et difficulté.
- [ ] C25 — Ajouter des embranchements et salles facultatives dont le risque est compréhensible avant de s’engager.
- [ ] C26 — Améliorer la carte et distinguer sortie, embranchement et point d’intérêt découvert.

### Commandes, accessibilité et rendu

- [ ] C27 — Aligner commandes réelles, libellés et README. Gérer AZERTY/QWERTY, alternatives, conflits et mentions après remappage.
- [ ] C28 — Rendre options, onglets, curseurs et confirmations utilisables à la manette. Le bandeau d’installation reste dans le chantier Claude.
- [ ] C29 — Ajouter remappage manette, pictogrammes Xbox/PlayStation, zone morte et intensité de vibration réglables.
- [ ] C30 — Gérer déconnexion et reconnexion manette en expédition sans commande intempestive.
- [ ] C31 — Améliorer navigation clavier et dialogues avec focus visible, titre accessible et restitution du focus.
- [ ] C32 — Rendre la taille du texte réglable. Tester HUD et menus en 720p, 1080p, ultralarge et avec zoom.
- [ ] C33 — Ajouter palettes et formes distinctes aux dangers, états et signaux trop dépendants de la couleur.
- [ ] C34 — Respecter la préférence système de mouvement réduit dans le Canvas, avec réglages séparés pour flashs, secousses et autres effets.
- [ ] C35 — Proposer des aides facultatives telles qu’une parade plus permissive, des dégâts adaptés ou la répétition en Cour, indiquées dans les règles de partie.
- [ ] C36 — Améliorer animations du Pèlerin, silhouettes des skins, distinction visuelle des armes et postures ennemies.
- [ ] C37 — Enrichir cinématiques d’entrée, transitions de salles et phases de boss selon les réglages d’accessibilité.
- [ ] C38 — Ajouter des signaux sonores de danger distincts et adapter le mixage aux essais casque et haut-parleurs de Claude.
- [ ] C39 — Centraliser les textes pour la localisation, ajouter le choix de langue, adapter les compteurs et tester le texte plus long.
- [ ] C40 — Héberger les polices en local après validation des licences par Claude. Vérifier hors ligne.

### Graines, modes et chroniques

- [ ] C41 — Afficher et copier un code de graine avec la version du générateur et les règles de la partie.
- [ ] C42 — Rejouer une graine et séparer les tirages de salles, récompenses et combats des effets visuels.
- [ ] C43 — Créer un défi quotidien local à équipement initial et règles fixes, avec ses propres records.
- [ ] C44 — Ajouter un mode sans fin à difficulté progressive et extraction entre les paliers.
- [ ] C45 — Ajouter un Boss Rush avec temps par Gardien et résultats séparés.
- [ ] C46 — Ajouter un mode Hardcore avec règles et records propres.
- [ ] C47 — Intégrer les collections d’objets, serments et synergies définies et testées par Claude.
- [ ] C48 — Filtrer les chroniques et comparer les armes et configurations d’une expédition à l’autre.
- [ ] C49 — Prévoir un replay local à graine fixe ou le partage d’un résumé. Vérifier la reproductibilité sur une même version.
- [ ] C50 — À long terme, étudier un éditeur de salles et des défis asynchrones. Définir le format de données avant l’interface.

## Luc, Claude Code (38 tâches)

### Lanceur, sauvegardes et publications

- [ ] **L01** — Essayer le ZIP v1.0.1 sur un autre PC Windows avec Node 22.12, en chemin avec accents ou espaces. Vérifier démarrage, sauvegarde et relance. *Fait en partie par Luc (21/11/2026) : paquet assemblé comme le zip et essayé sur ce PC dans un chemin avec accents et espace (démarrage, sauvegarde, relance), et en CI sous Windows et Linux. Reste : le vrai zip sur un autre ordinateur.*
- [x] **L02** — Tester en CI le ZIP réellement distribué sous Windows et Linux avant publication, avec vérification du manifeste et des fichiers. *Fait : elease.yml ne publie qu'après erify-package sur le zip décompressé (Windows et Linux) ; erify.yml essaie le paquet à chaque PR. Luc, branche luc/sauvegardes-fiables.*
- [x] **L03** — Tester la prochaine mise à jour réelle depuis v1.0.1 avec interruption, relance et conservation de la sauvegarde. *Fait en automatique (	est/pc-update-interrupt.test.mjs : arrêt en plein téléchargement, arrêt entre les deux renommages, relance, sauvegarde intacte). La vraie mise à jour depuis v1.0.1 reste à passer à la prochaine release.*
- [x] **L04** — Unifier les migrations navigateur et PC, tester les anciens formats et préserver les sauvegardes de versions plus récentes. *Fait : src/game/saveFormat.ts (versions, chaîne de migration), copie gardée de côté d'une sauvegarde plus récente ou abîmée (navigateur et PC), version commune vérifiée par test.*
- [x] **L05** — Ajouter somme de contrôle et trois copies tournantes, tester fichier tronqué, écriture interrompue et compatibilité avec le .bak. *Fait : launcher/save-store.mjs (champ _checksum, copies .bak, .bak2, .bak3, fichier illisible mis de côté).*
- [x] L06 — Vérifier deux lanceurs ouverts dans la même installation et sérialiser les mises à jour si nécessaire.
- [ ] L07 — Enrichir le bandeau de mise à jour avec taille, notes de version, progression, reprise après erreur et validation à la manette.
- [ ] L08 — Étudier la signature des manifestes, la rotation des clés et les lanceurs déjà distribués.
- [ ] L09 — Tester retour arrière, fichiers inchangés ou vides, coupures réseau, manque d’espace et lecture seule.
- [ ] L10 — Préparer des profils de sauvegarde avec nom, date, export, import et confirmations. Après L04–L05.
- [x] L11 — Harmoniser version du jeu, affichage, tag et version du lanceur.
- [ ] L12 — Documenter publication, reprise et dépannage du premier démarrage. Clarifier l’emplacement des sauvegardes.
- [x] L13 — Vérifier les dépendances réellement utilisées, puis organiser leur suivi et leur mise à jour automatisée en CI.

### Essais en jeu et équilibrage

- [ ] **L14** — Jouer sur PC réel à 60 et, si possible, 120/144 Hz. Relever le ressenti du mouvement, des parades, de l’esquive et du ralenti.
- [ ] **L15** — Écouter casque et haut-parleurs. Relever masquage des attaques, transitions et écarts de volume.
- [ ] **L16** — Tester manettes Xbox et DualSense physiques et claviers AZERTY/QWERTY.
- [ ] L17 — Observer un nouveau joueur pendant les dix premières minutes, de la découverte de la Cour à la lecture de la parade et de la sortie.
- [ ] L18 — Définir les exercices, consignes et critères de réussite de la Cour. Codex intègre.
- [ ] L19 — Comparer plusieurs graines et relever sorties confuses, vides, répétitions et densité des rencontres.
- [ ] L20 — Auditer la lisibilité du HUD, du focus, des dialogues et des télégraphes sur plusieurs PC.
- [ ] L21 — Équilibrer premier retour au Bastion, prix, gains et intérêt des améliorations sur plusieurs expéditions.
- [ ] L22 — Comparer difficultés et rangs d’Ascension. Relever choix dominants et paliers fondés surtout sur les PV ennemis.
- [ ] L23 — Tenir un tableau de validation des releases avec matériel, version, mode, résultat et preuve.

### Contenu, Bastion et distribution

- [x] L24 — Créer une fiche par ennemi avec rôle, portée, signaux, attaques et contre-jeu. Transmettre deux prototypes à Codex.
- [x] L25 — Concevoir par Gardien une transition et deux attaques de phase 2, avec une réponse lisible.
- [ ] L26 — Concevoir salles fixes, mini-boss, secrets et chemins à risque, avec règles d’apparition et récompenses pour intégration.
- [ ] L27 — Concevoir familles de reliques, bénédictions et synergies ouvrant différents styles de jeu. Préciser interactions et limites.
- [ ] L28 — Faire évoluer visuellement le Bastion selon les infrastructures, en commençant par un bâtiment dont les niveaux sont reconnaissables.
- [ ] L29 — Ajouter aux PNJ des réactions, dialogues débloqués et quêtes en plusieurs étapes.
- [ ] L30 — Clarifier les achats du Bastion avec ressources manquantes, effet avant/après et prérequis.
- [ ] L31 — Enrichir le Codex avec armes et bénédictions découvertes, stratégies liées aux signaux et filtres par biome.
- [ ] L32 — Écrire stèles, descriptions, bestiaire et dialogues des Gardiens. Planifier la révélation de l’histoire.
- [ ] L33 — Développer la galerie de skins et hauts faits avec aperçus et conditions de déblocage.
- [ ] L34 — Fixer règles et barèmes du quotidien, du sans-fin, du Boss Rush et du Hardcore.
- [ ] L35 — Construire le glossaire français/anglais puis traduire le dictionnaire du jeu.
- [ ] L36 — Vérifier les droits des polices, images et sons. Préparer licences et crédits de distribution.
- [ ] L37 — Préparer la démo itch.io, sa page, les captures, le guide de prise en main et le parcours de retours.
- [ ] L38 — Préparer les notes destinées aux joueurs, avec changements visibles, touches et mise à jour.
