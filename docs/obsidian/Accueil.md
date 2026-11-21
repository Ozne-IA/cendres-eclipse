---
title: Accueil
aliases:
  - Cendres de l'Éclipse
tags:
  - cendres-eclipse
  - projet
---

# Cendres de l’Éclipse

Cendres de l’Éclipse est un roguelike d’action 2D. Le joueur alterne entre les expéditions dans l’Abîme et la préparation au Bastion du Crépuscule. La Cour d’entraînement est accessible depuis l’écran titre. [Présentation et commandes du jeu](https://github.com/Ozne-IA/cendres-eclipse#readme)

- [[Architecture]] répertorie les fichiers où modifier le jeu, ses commandes et ses sauvegardes.
- [[Decisions|Décisions]] conserve les changements intégrés et leur raison d’être.
- [[Validation]] décrit les contrôles à effectuer avant de fusionner une modification.
- [[Passation Luc]] liste ce que Luc (Claude Code) a fait le 21/11/2026 et ce qu'il reste à reprendre.

## Graphe du code

Depuis la racine du dépôt, construire le graphe avec le skill Graphify, puis l’exporter vers ce coffre.

```sh
python .agents/skills/graphify/scripts/run.py build
python .agents/skills/graphify/scripts/run.py obsidian
```

Dans Obsidian, ouvrir `Graphify/graph.canvas` pour explorer le graphe généré.

Le graphe généré décrit les dépendances du code. Les notes de ce coffre documentent les choix et les vérifications du projet.
