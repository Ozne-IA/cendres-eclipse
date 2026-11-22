# L18 : consignes et critères de la Cour d'Entraînement

Auteur : Luc (proposition, à valider par l'utilisateur avant intégration).
Destinataire : Codex, pour le lot C14 (intégration dans la Cour).

## Principes communs

- Chaque exercice a une **consigne** en une phrase, un **critère de réussite** visible à l'écran, et une **reprise rapide** : on recommence en une touche, sans retourner au Bastion.
- La Cour régénère vitalité et fioles en cas de défaite (comportement actuel, `engine.ts`). Un échec ne coûte rien, il faut le dire dans la consigne.
- Les valeurs ci-dessous viennent du code actuel. Quand une valeur dépend de la difficulté ou d'une amélioration, la consigne reste générique et le critère affiche la valeur réelle.

## Valeurs de référence (code actuel)

- Fenêtre de parade : **0,22 s** de base (`getParryWindowSec`, `rules.ts`). Difficulté « Éveillé » : +0 s ; Airain : +0,08 s ; maîtrise de parade : +0,025 s par rang ; plancher : 0,12 s.
- Délai entre deux parades : **0,4 s** (`engine.ts`, `parryCd`).
- Riposte : après une parade réussie, le bonus de riposte dure **4,0 s** (`damage.ts`).
- Esquive (roulade) : durée d'un dash **0,18 s** (`engine.ts`, `dashT`).
- Renvoi : une parade chronométrée renvoie un projectile ennemi (test `combatDefense.test.ts`).
- Esquive parfaite : deux projectiles traversés pendant un même dash donnent une esquive parfaite et arment un coup critique (test `combatDefense.test.ts`).

## Exercices

### 1. Parade
- **Consigne** : bloque la frappe ennemie en appuyant au moment où l'arme touche le bouclier de l'écran (indicateur de télégraphe).
- **Critère de réussite** : 3 parades réussies d'affilée sur 3 frappes différentes.
- **Reprise rapide** : appui sur la touche de l'exercice pour recommencer la série à zéro.
- **Affichage** : compteur de série (0/3), couleur de la fenêtre de parade (rouge hors fenêtre, doré dans la fenêtre).

### 2. Riposte
- **Consigne** : après une parade, frappe dans les 4 secondes suivant la parade.
- **Critère de réussite** : 2 ripostes réussies sur 2 parades, sans se faire toucher pendant l'exercice.
- **Reprise rapide** : fin de la série au premier coup encaissé.
- **Affichage** : minuterie du bonus de riposte (4 s) visible près de la vitalité.

### 3. Renvoi
- **Consigne** : renvoie un projectile ennemi avec une parade chronométrée.
- **Critère de réussite** : 2 projectiles renvoyés et touchant une cible d'entraînement.
- **Reprise rapide** : un nouveau projectile apparaît après 3 secondes si l'exercice est en pause.
- **Affichage** : trajectoire du projectile renvoyé en couleur dorée.

### 4. Esquive
- **Consigne** : traverse deux projectiles pendant une même roulade (dash) pour une esquive parfaite.
- **Critère de réussite** : 1 esquive parfaite, qui arme le coup critique suivant.
- **Reprise rapide** : appui sur la touche de l'exercice.
- **Affichage** : marque « Esquive parfaite » et indicateur de coup critique armé.

### 5. Déplacement
- **Consigne** : atteins les trois repères de la salle en les touchant dans l'ordre, sans sortir de la zone.
- **Critère de réussite** : les trois repères touchés dans l'ordre, en moins de 20 secondes.
- **Reprise rapide** : un repère touché hors ordre le réinitialise.
- **Affichage** : chrono et repères numérotés.

### 6. Arts d'Éclipse
- **Consigne** : utilise un Art d'Éclipse sur une cible d'entraînement, en respectant le coût en Souffle.
- **Critère de réussite** : un Art utilisé avec succès, sans passer sous zéro Souffle.
- **Reprise rapide** : le Souffle se régénère en quelques secondes ; l'exercice reprend à l'appui sur la touche.
- **Affichage** : coût en Souffle de l'Art et jauge de Souffle.

## Ce qui reste à décider (côté utilisateur)

- Les touches exactes pour chaque reprise rapide (voir les contrôles AZERTY/QWERTY, L16).
- Le temps accepté pour l'exercice de déplacement (20 s est une proposition).
- Si la Cour doit compter les essais, ou seulement afficher le dernier résultat.
