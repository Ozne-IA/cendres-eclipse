# 🌘 Cendres de l'Éclipse

> **Dark Fantasy Action-Roguelike 2D** développé avec React 19, TypeScript, Canvas 2D procédural, Tailwind CSS v4 et Web Audio API.

---

## ⚔️ Présentation du Jeu

**Cendres de l'Éclipse** vous plonge dans les profondeurs d'un monde déchu où le soleil s'est éteint sous l'emprise d'une éclipse éternelle. Vous incarnez le **Pèlerin de Cendre**, un guerrier immortel lié au **Bastion du Crépuscule**, dernier refuge des survivants.

Explorez les strates de l'Abîme, affrontez des cohortes d'ennemis corrompus et des Gardiens titanesques, débloquez des bénédictions lunaires et forgez de puissantes armes d'argile, d'airain et d'obsidienne.

---

## ✨ Fonctionnalités Majeures

- **Système de Combat Exigeant & Réactif (60 FPS)** :
  - **6 Armes Uniques** : *Lame d'Argile*, *Espadon du Beffroi*, *Dagues de l'Éclipse*, *Hallebarde de Cendre*, *Faux Astrale*, *Marteaux Jumeaux*.
  - **Arts d'Éclipse** : Chaque arme possède une attaque spéciale unique déclenchée avec `[C]` ou `[RB]`.
  - **Parade Précise & Brise-Posture** : Déviation au timing parfait pour étourdir l'adversaire et asséner une riposte critique dévastatrice.
  - **Système de Rangs de Combo** : Enchaînez les frappes pour monter du rang `D` au rang `ÉCLIPSE` (+30% de butin).
- **Méta-progression au Bastion du Crépuscule** :
  - **Infrastructures** : Forge des Ombres, Foyer Éternel, Autel de Sève, Tour de Vigie, Refuge des Errants et Sanctuaire des Runes.
  - **5 PNJ Secourables** : Forgeron, Apothicaire, Éclaireur, Alchimiste et Archiviste offrant des ressources passives après chaque expédition.
  - **5 Serments Sacrés** : Argile (équilibre), Sang (haut risque / récompenses), Airain (maître de parade), Éclipse (dégâts bruts), Pèlerin (mobilité).
  - **Pacte d'Ascension** : 5 niveaux de difficulté supérieure déblocables après chaque victoire.
- **Richesse Roguelite** :
  - **Synergies d'Éclipse** : Combinez certaines bénédictions et reliques pour débloquer des fusions (Choc Thermique, Festin Sanguin, Enclume de Tempête...).
  - **Modificateurs de Salle (Affixes)** : Soleil Noir, Lune Écarlate, Brume Abyssale, Cendre Trempée.
  - **10 Hauts Faits & 4 Skins d'Armure** : Éclipse, Écarlate, Solaire, Astrale.
- **VFX & Audio Procéduraux** :
  - Arcs de coupe tranchants, impacts lumineux, éclairs de foudre et fissures magmatiques.
  - Bande-son adaptative procédurale en Web Audio API (thèmes dynamiques selon les biomes et les phases de boss).
- **Mode Standalone PC** :
  - Serveur local Node.js léger (`launcher/server-pc.mjs`) sans dépendance lourde.
  - Persistance automatique de la sauvegarde sur disque local (`cendres-eclipse-save.json`).
  - Lanceurs exécutables prêts à l'emploi (`.bat`, `.ps1`, `.sh`).

---

## 🎮 Commandes de Jeu

### ⌨️ Clavier / Souris

| Action | Touche Clavier par défaut | Souris |
|---|---|---|
| **Déplacement** | `Q` / `D` ou Flèches `←` / `→` | — |
| **Descendre d'une plateforme** | `S` ou Flèche `↓` | — |
| **Sauter / Franchir** | `Espace` ou `Z` / `↑` | — |
| **Esquive / Roulade (I-Frames)** | `Shift` (Maj) | — |
| **Attaque Légère (Combo)** | `J` | Clic Gauche |
| **Attaque Lourde (Brise-Garde)** | `K` / `L` | — |
| **Parade / Déviation** | `H` | Clic Droit |
| **Art d'Éclipse (Compétence)** | `C` | — |
| **Fiole de Sève (Soin)** | `R` | — |
| **Interagir / Valider** | `E` / `Entrée` | — |
| **Pause / Menu** | `Échap` / `P` | — |
| **Activer / Couper le son** | `M` | — |

*Toutes les touches sont entièrement reconfigurables dans le menu Options (Pause ou Écran Titre).*

### 🎮 Manette (Xbox / PlayStation / Générique)

| Action | Bouton Xbox | Bouton PlayStation |
|---|---|---|
| **Déplacement** | Stick Gauche / D-Pad | Stick Gauche / D-Pad |
| **Saut** | `A` | `Croix` |
| **Roulade / Esquive** | `B` | `Rond` |
| **Attaque Légère** | `X` | `Carré` |
| **Attaque Lourde** | `Y` / `RT` | `Triangle` / `R2` |
| **Parade / Déviation** | `LB` / `LT` | `L1` / `L2` |
| **Art d'Éclipse (Skill)** | `RB` | `R1` |
| **Fiole de Sève (Soin)** | `D-Pad Haut` | `D-Pad Haut` |
| **Interagir** | `A` ou `D-Pad Haut` | `Croix` ou `D-Pad Haut` |
| **Pause** | `Start` / `Menu` | `Options` |

---

## 🚀 Installation & Lancement

### Prérequis
- [Node.js](https://nodejs.org) 22 (au minimum 22.12) ou une version LTS plus récente.

### 1. Mode Développement Web (Vite)
```bash
# Installation des dépendances
npm ci

# Démarrage du serveur de développement Vite
npm run dev
```
Ouvrez votre navigateur sur `http://localhost:3000`.

### 2. Mode PC Standalone (Serveur Local + Sauvegarde Fichier)
```bash
# Compilation de la version optimisée
npm run build

# Démarrage du serveur PC autonome
npm run start:pc
```
Le jeu s'ouvre automatiquement dans une fenêtre applicative dédiée et sauvegarde votre progression directement dans `cendres-eclipse-save.json`. Si ce fichier est absent ou corrompu, le lanceur utilise la dernière copie valide disponible dans `cendres-eclipse-save.json.bak`.

---

## 📁 Structure du Projet

```text
cendres-eclipse/
├── launcher/
│   └── server-pc.mjs        # Serveur HTTP local Node.js & API de sauvegarde disque
├── src/
│   ├── components/          # Composants React UI (HUD, Bastion, Menus, Modals)
│   │   ├── BastionModal.tsx # Sanctuaire, améliorations, PNJ, Serments & Ascension
│   │   ├── GameHud.tsx      # Barres de vie/souffle, combo, fioles, boss bar
│   │   ├── GameMenuModal.tsx# Réglages audio, vidéo, gameplay, mapping touches
│   │   └── LauncherModal.tsx# Génération des scripts de lancement PC
│   ├── game/
│   │   ├── engine.ts        # Moteur principal de boucle de jeu (60 FPS)
│   │   ├── renderer.ts      # Moteur de rendu Canvas 2D (décors, minimap, éclairage)
│   │   ├── artSprites.ts    # Sprites vectoriels procéduraux (joueur, armes, skins)
│   │   ├── vfx.ts           # Système d'effets visuels (fissures, éclairs, étincelles)
│   │   ├── audio.ts         # Moteur audio procédural (drone, musique adaptative, SFX)
│   │   ├── rules.ts         # Règles de calcul, dégâts, progression et hauts faits
│   │   ├── data.ts          # Constantes, armes, bénédictions, monstres, serments
│   │   └── input.ts         # Gestionnaire d'entrées clavier, souris et manette
│   └── App.tsx              # Composant racine orchestrant les états du jeu
├── package.json
└── vite.config.ts
```

---

## 📜 Licence & Droits

Projet créé pour **Cendres de l'Éclipse**. Tous droits réservés.
