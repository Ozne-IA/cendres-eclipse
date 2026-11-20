---
name: graphify
description: Cartographier localement le code de Cendres de l’Éclipse. Utiliser ce skill pour générer ou consulter le graphe des appels et imports, comprendre les liens entre fichiers ou exporter le graphe vers le coffre Obsidian du projet.
---

# Graphify pour Cendres de l’Éclipse

Ce skill de dépôt utilise [Graphify 0.9.113](https://github.com/Graphify-Labs/graphify/tree/v0.9.113) et son CLI officiel, distribué par le paquet Python `graphifyy`. Le script du projet initialise au besoin un environnement Python privé au dépôt. Utiliser Python 3.11.5 à 3.14 avec le module `venv`.

Depuis la racine du dépôt, exécuter la commande adaptée au besoin.

```sh
python .agents/skills/graphify/scripts/run.py build
python .agents/skills/graphify/scripts/run.py query "CendresEngine InputHub"
python .agents/skills/graphify/scripts/run.py path CendresEngine InputHub
python .agents/skills/graphify/scripts/run.py explain CendresEngine
python .agents/skills/graphify/scripts/run.py obsidian
```

- `build` génère ou actualise `graphify-out/graph.json` et `graphify-out/GRAPH_REPORT.md`. L'analyse structurelle indexe le code source local avec Tree-sitter. Les ressources visuelles, dépendances installées et sorties générées sont exclues du corpus du projet.
- `query`, `path` et `explain` consultent ce graphe. Vérifier les relations importantes dans les fichiers source cités avant de modifier le code. Relancer `build` quand le graphe doit refléter des modifications récentes.
- `obsidian` exporte le graphe existant dans `docs/obsidian/Graphify/`. Utiliser ce dossier pour les sorties régénérables et écrire les notes manuelles dans le reste du coffre.

Le premier lancement récupère les paquets Python. Construire le graphe, le consulter et l’exporter ensuite fonctionne en local, avec l’analyse sémantique et le journal global des requêtes désactivés.
