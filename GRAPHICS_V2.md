# Graphical Update v2 — Cinematic Dark Fantasy

**Statut :** Non-destructif — le jeu reste 100 % fonctionnel même sans les nouveaux assets.

## Ce qui a changé

### `src/game/textures.ts`
- Ajout du support des backgrounds **cinematic v2**.
- Chargement préférentiel des versions v2 **uniquement si les fichiers existent**.
- Fallback automatique et silencieux vers les backgrounds classiques.
- Nouvelles fonctions exportées :
  - `setPreferCinematicArt(boolean)`
  - `getPreferCinematicArt()`

### Décors cinématiques inclus

```
src/assets/images/v2/
├── biome_catacombes_v2.jpg
├── biome_viaduc_v2.jpg
├── biome_fleche_v2.jpg
└── biome_sanctuaire_v2.jpg
```

Les fichiers concept (joueur + armes) sont disponibles dans les artifacts de la conversation et pourront être intégrés dans une prochaine itération (sprites isolés).

## Comment activer / désactiver

Dans **Options → Graphismes & HUD → Style artistique des décors**, choisir **Classique** ou **Cinématique**. Le jeu mémorise ce réglage. Les anciennes sauvegardes utilisent le style cinématique par défaut.

## Sécurité

- Aucun code existant n’a été supprimé.
- Aucune dépendance nouvelle.
- Si un fichier v2 est manquant → le jeu utilise automatiquement l’ancien asset.
- Le cache de `getSeamlessBakedBackdrop` tient compte du style pour éviter les collisions.

## Prochaines étapes prévues sur cette branche

- [ ] Sprites isolés du Pèlerin de Cendre + 4 skins
- [ ] Amélioration des armes (nouveaux stamps ou sprites)
- [ ] Léger post-process (color grading) optionnel

---

*Update réalisée de façon non destructive pour garantir que le projet continue de fonctionner correctement.*
