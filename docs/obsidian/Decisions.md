---
title: Décisions
tags:
  - cendres-eclipse
  - decisions
---

# Décisions

- **Séparer la sauvegarde du cache web.** Le lanceur peut relire la copie `.bak` si la sauvegarde principale est absente ou corrompue. La version web charge en priorité la page actuelle lorsqu’elle est en ligne. [PR #4](https://github.com/Ozne-IA/cendres-eclipse/pull/4)
- **Rendre les premiers combats plus lisibles.** Un triangle signale l’attaque à venir. La Cour est accessible depuis le titre et sert à répéter les actions sans créditer les gains d’une expédition. Au Bastion, le bilan affiche les gains effectivement crédités et peut mettre en avant le premier niveau du Foyer Éternel. [PR #5](https://github.com/Ozne-IA/cendres-eclipse/pull/5)
- **Distinguer les commandes des menus et du combat.** Le premier appui sur A/Croix depuis un titre sans sélection met l’action principale en évidence. Un appui maintenu pendant une transition ne valide pas l’écran suivant. [PR #6](https://github.com/Ozne-IA/cendres-eclipse/pull/6)

- **Protéger le serveur local.** Seules les requêtes dont `Host` et `Origin` désignent le serveur sont acceptées : une page web tierce ne peut plus écraser la sauvegarde. Les chemins restent confinés à `dist/` et les réponses portent des en-têtes de sécurité. [[Passation Luc]]
- **Pas de version téléphone.** Le jeu vise l'ordinateur ; le mobile est réservé au bot Discord. Des commandes tactiles ont été écrites puis laissées sur une branche à part. [[Passation Luc]]
- **Adapter la musique à la situation.** Chaque biome et chaque gardien a son motif. Celui des gardiens varie entre les deux phases. La musique baisse en combat et pendant certains effets, dont la parade parfaite et le jingle du rang Éclipse. Les attaques légères, lourdes et les arts utilisent le timbre de l’arme équipée.
- **Conserver une chronique locale des expéditions.** Le Bastion présente les 20 dernières expéditions terminées, avec des records qui persistent au-delà de cet historique. Le bilan compare l’expédition à la précédente. La Cour reste exclue de la chronique.

- **Fixer la simulation à 60 Hz.** Le ralenti espace les mises à jour de 1/60 s. Le rendu interpole la caméra et les positions entre deux mises à jour. Le combat et la génération utilisent un tirage aléatoire indépendant des effets visuels et reproductible dans les tests.

- **Isoler les responsabilités du moteur et des sprites.** Le déplacement du joueur, les plateformes, la caméra et le déclenchement des attaques ont leurs propres modules. Les dessins sont regroupés par type de sprite.

- **Mettre à jour le jeu sans tout retélécharger.** Chaque version publiée sur GitHub contient un manifeste des fichiers avec leur empreinte SHA-256 et une copie de chaque fichier nommée d’après cette empreinte. Le lanceur PC compare, ne télécharge que ce qui a changé, vérifie chaque fichier, prépare la nouvelle version à côté puis remplace `dist/` d’un seul geste, avec retour arrière si quelque chose échoue. La sauvegarde est hors de `dist/` et n’est jamais touchée. Les copies de développement (sans manifeste) ne sont jamais mises à jour. Une version qui exige un lanceur plus récent renvoie vers le téléchargement complet. Le jeu entier se télécharge une seule fois, en zip, depuis la page Releases. Pas de signature des manifestes pour l’instant : la confiance repose sur le compte GitHub et sur HTTPS. [[Point de reprise]]

- **Ne jamais perdre une sauvegarde.** Le fichier de sauvegarde du lanceur PC porte une somme de contrôle (`_checksum`, ignorée par les anciens lanceurs) et trois copies tournantes : `.bak` suit chaque écriture, `.bak2` et `.bak3` n’avancent que si `.bak` a plus de dix minutes. Un fichier abîmé ou écrit par une version plus récente du jeu n’est jamais écrasé : il est mis de côté (`.corrupt-…`, `.newer-vN`) et seules les trois dernières copies abîmées sont gardées. Le navigateur garde de la même façon une copie de côté (`…corrupt`, `…newer-vN`). Les numéros de version et la chaîne de migration sont dans `src/game/saveFormat.ts`, la copie du lanceur est dans `launcher/save-store.mjs`, un test vérifie qu’elles restent égales. Pour changer la version de sauvegarde : augmenter les deux constantes et ajouter une étape dans `MIGRATIONS`. Le manifeste annonce `saveVersion` : un lanceur plus ancien renvoie alors vers le téléchargement complet au lieu d’installer une version dont il ne sait pas écrire les sauvegardes.
- **Essayer le zip avant de le publier.** `release.yml` décompresse le zip réellement distribué sous Windows et Linux, dans un chemin avec accents et espace, vérifie chaque fichier contre le manifeste, démarre le jeu, écrit une sauvegarde et la retrouve après un redémarrage. La publication n’a lieu que si tout est vert. `verify.yml` rejoue la même vérification sur un paquet de test à chaque modification et lance les tests du lanceur sous Windows.

- **Réserver l’approche de la sortie avant la génération.** Les derniers segments et fossés restent dans leur zone. Le générateur ajoute un appui quand un fossé est large ou que les deux rives sont à des hauteurs très différentes.
- **Dissocier les pixels de rendu des coordonnées du jeu.** Le canvas conserve les dimensions de la fenêtre en pixels CSS pour le cadrage et le jeu. Sa résolution interne suit le rapport de pixels de l’écran jusqu’à 2.

- **Utiliser la même boucle de rendu dans Chromium automatisé et en jeu.** La couverture du parcours complet au clavier et à la manette simulée permet de retirer le traitement spécial de `navigator.webdriver`. [[Validation#Premier lot Codex (C01 à C05)]]

- **Profiler à la demande.** Le profilage CPU s’active avec `?profile=1`. Il compte séparément les rendus sautés par temporisation et les images statiques sans nouveau rendu.
- **Repartir de la nouvelle position après une discontinuité.** Les téléportations et le premier pas des éléments mobiles d’une salle affichent directement leur nouvel état. Les pas suivants reprennent l’interpolation ordinaire.

Pour suivre ces choix dans le projet, voir [[Architecture]] et [[Validation]].

## Deux lanceurs, version et dépendances (L06, L11, L13)
- **Deux lanceurs sur la même installation** : le second prend le port suivant (4174) et partage `dist/` et la sauvegarde. Le risque réel était que son démarrage supprime le dossier `dist.update/` que le premier remplissait. Un verrou `dist.lock` (processus et heure, périmé après 30 minutes ou si le processus a disparu) empêche désormais deux mises à jour simultanées (l'une répond « déjà en cours ») et la remise en ordre au démarrage ne touche à rien tant que le verrou est tenu (`launcher/update-lock.mjs`, `test/update-lock.test.mjs` avec un vrai second processus). Reste à essayer à la main : deux fenêtres ouvertes en même temps sur le vrai zip.
- **Version** : `package.json` est la source ; `release.yml` refuse de publier si l'étiquette ne correspond pas (`scripts/check-version.mjs`). Procédure : changer `version` dans `package.json`, fusionner, puis étiqueter `vX.Y.Z`. `package.json` passe à 1.0.1 (la version publiée).
- **Dépendances** : sept paquets n'étaient importés nulle part (`@google/genai`, `express`, `dotenv`, `motion`, `lucide-react`, `autoprefixer`, `@types/express`) et ont été retirés ; build, types et 134 tests passent, `npm audit --omit=dev` ne trouve rien. `.github/dependabot.yml` propose chaque semaine les mises à jour mineures groupées (npm) et chaque mois celles des actions GitHub. Ne pas ajouter de dépendance sans l'utiliser.
