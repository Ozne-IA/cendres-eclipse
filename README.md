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

#### Navigation dans les menus

- Sur l’écran titre, dans le menu Pause et au Bastion, utilisez le stick gauche ou la croix directionnelle pour sélectionner une action. Validez avec `A` / `Croix`. Sur l’écran titre, si aucune action n’est sélectionnée, le premier appui sur `A` / `Croix` sélectionne « Descendre dans l’Abîme ». Un second appui lance l’expédition.
- `B` / `Rond` reprend la partie depuis le menu Pause, revient à l’écran titre depuis le Bastion et ferme les options ou le lanceur PC.
- `Start` / `Options` met la partie en pause ou la reprend.

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

### Android

L’APK Android embarque le jeu, avec des commandes tactiles. Installez `Cendres-Eclipse-Android.apk` depuis les [versions GitHub](https://github.com/Ozne-IA/cendres-eclipse/releases) lorsque cet asset est disponible. Au lancement, le jeu vérifie si une version plus récente est disponible. Android vous demande de confirmer son installation. Le jeu reste jouable sans connexion après installation.

Pour tester une modification, récupérer `android-preview` dans les résultats de l’action **Verify Android APK**. C’est un APK de test avec une identité Android distincte. Le guide de compilation et de signature est dans [la note Android](docs/obsidian/Android.md).

### 3. Distribuer le jeu et le mettre à jour sans tout retélécharger

Les joueurs téléchargent **une seule fois** `Cendres-Eclipse-<version>.zip` depuis la page [Releases](https://github.com/Ozne-IA/cendres-eclipse/releases) (il leur faut seulement Node.js 22.12 ou plus récent), puis lancent `Lancer_Cendres_Eclipse.bat`.

Ensuite, le lanceur cherche une nouvelle version au démarrage. Si elle existe, l'écran titre propose **Installer** : seuls les fichiers modifiés sont téléchargés (souvent moins de 1 Mo au lieu de 6 Mo), chaque fichier est vérifié par son empreinte SHA-256, puis `dist/` est remplacé d'un coup. En cas d'échec ou de coupure, l'ancienne version reste en place. La sauvegarde (`cendres-eclipse-save.json`) n'est jamais touchée. L'option `--no-update-check` coupe toute vérification.

Pour publier une version (administrateur) :

```bash
git tag v1.1.0
git push origin v1.1.0
```

Le workflow `.github/workflows/release.yml` teste le jeu, le compile, prépare `update-manifest.json` et les fichiers nommés par empreinte (`scripts/make-release.mjs`), construit le zip et crée la release. Une copie lancée depuis le dépôt (sans `dist/update-manifest.json`) n'est jamais mise à jour automatiquement.

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
│   │   ├── playerRender.ts  # Joueur, armures et traînées d’attaque
│   │   ├── weaponRender.ts  # Armes et épée-relique
│   │   ├── enemyRender.ts   # Ennemis et signaux d’attaque
│   │   ├── propRender.ts    # Coffres et objets interactifs
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

## Documentation du projet dans Obsidian

Ouvrez le dossier `docs/obsidian` comme coffre local dans Obsidian, puis ouvrez [Accueil.md](docs/obsidian/Accueil.md). Le coffre est versionné et fonctionne sans compte Obsidian. Les réglages personnels du coffre et l’export généré par Graphify sont exclus de Git.

Codex et Claude Code suivent les mêmes instructions de reprise dans [AGENTS.md](AGENTS.md) et partagent le [Point de reprise](docs/obsidian/Point%20de%20reprise.md). Le skill `obsidian-markdown` se trouve dans `.agents/skills/obsidian-markdown/`. Le skill est distribué sous licence MIT et provient de la [version officielle épinglée](https://github.com/obsidianmd/obsidian-skills/tree/462a27fa456e43a68bd645fef457217326bfd369/plugins/obsidian/skills/obsidian-markdown).

---

## 📜 Licence & Droits

Projet créé pour **Cendres de l'Éclipse**. Tous droits réservés.
