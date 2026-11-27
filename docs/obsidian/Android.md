---
title: Android
tags:
  - cendres-eclipse
  - android
---

# Android

L’application charge le jeu embarqué dans une WebView et conserve la sauvegarde locale entre deux installations signées avec la même clé. Les commandes tactiles permettent de jouer sur tablette. L’APK d’essai a une identité Android distincte de celle de diffusion.

## Vérifier et construire

La CI produit `Cendres-Eclipse-Android-preview.apk` dans l’artifact `android-preview`. En local, prérequis Node 22, JDK 17, Gradle 8.13, plateforme Android 35 et outils de build 35.0.0.

```sh
npm ci
npm run build
gradle -p android :app:assembleDebug
```

Sur tablette Android, vérifier le démarrage en mode avion, les commandes simultanées, la pause, l’import et l’export de sauvegarde. Une fois deux versions signées disponibles, installer l’ancienne, conserver une sauvegarde, puis vérifier la détection et l’installation de la nouvelle ainsi que la reprise de la progression.

## Distribuer avec les mises à jour

Conserver une sauvegarde protégée du keystore de diffusion. La signature doit rester identique entre les versions. Le workflow de publication utilise l’environnement GitHub `android-release` et ses secrets `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS` et `ANDROID_KEY_PASSWORD`. La variable du dépôt `ANDROID_RELEASE_ENABLED` active ce job lorsqu’elle vaut `true`.

Au prochain tag de version, le job ajoute `Cendres-Eclipse-Android.apk` à la release. L’application recherche les APK stables publiés dans le dépôt GitHub officiel. Android vérifie la signature au remplacement et demande de confirmer l’installation.

Revenir au [[Point de reprise]].

## Aperçu fluide et clavier externe

L’APK applique une limite d’environ 0,92 million de pixels au Canvas et choisit par défaut des effets et une brume moyens, avec parallaxe désactivée. Les réglages graphiques déjà personnalisés sont conservés. La simulation garde ses pas à 60 Hz. Une cadence d’écran lente ne suffit plus à faire sauter un dessin sur deux.

Dans Chromium en rendu logiciel, à 1 200 × 800 CSS et DPR 2, le Canvas passe de 2 400 × 1 600 à 1 176 × 784, soit 76 % de pixels en moins. En Cour immobile, 128 dessins sur 130 appels ont été enregistrés après le changement, contre 87 sur 130 avant. Ces relevés ne mesurent pas la cadence sur tablette physique.

Le clavier et le tactile peuvent être utilisés ensemble. En cas de directions opposées, la dernière entrée horizontale prend la priorité. Les répétitions d’une touche maintenue ne changent pas le mode de commandes.

L’aperçu « Cendres — aperçu fluide » s’installe à côté du premier APK d’essai. Pour récupérer une partie existante, utiliser l’export JSON dans l’ancien aperçu puis l’import dans le nouveau.
