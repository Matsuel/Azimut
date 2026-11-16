---
name: implementer-feature
description: Coder une feature planifiée de `roadmap/<NN>-<slug>/`, du premier commit à la PR. Use when l'utilisateur dit « commence / continue / termine la feature N » ou « lance T-xx ».
---

# implementer-feature

Une feature se code depuis ses **décisions écrites** : le `README.md` de son dossier roadmap (décisions `D<n>`, écrans modifiés, hors périmètre) et ses cadres Figma. `TASKS.md` dit l'ordre, pas l'architecture. Une feature sans dossier (statut absent de l'index) passe d'abord par `feature-roadmap` en mode planification.

## Étapes

1. **Lire le dossier** `roadmap/<NN>-*/` : `README.md` en entier, puis `US.md`, `TASKS.md` et `PLAN.md` s'il existe. Relève chaque décision structurante : nouveau service ou app, contrat ou schéma modifié, écran nouveau ou modifié, ce qui est hors périmètre. Terminé quand chaque `D<n>` et chaque ligne « Écrans modifiés » est listée dans tes notes.

2. **Lire la maquette.** Pour chaque cadre cité (nouveaux écrans et copies `· à modifier (F<NN>)`), `get_screenshot` dans le fichier Figma de `roadmap/README.md`, et regarde-le. Un cadre `à dessiner` ou absent bloque le code de cet écran (`apps/web/AGENTS.md`) : dessine-le ou demande la validation, selon ce que l'utilisateur a dit. Terminé quand chaque écran de la feature a sa capture vue ou son blocage annoncé.

3. **Annoncer le cadre** en 3 à 5 lignes avant toute écriture : où vit le code (app ou service existant, ou nouveau service via `nouveau-service`), écrans touchés avec leur numéro de maquette, tâches parallélisables. Une contradiction entre `TASKS.md` et le `README.md` se tranche en faveur du README, ou par une question si le README est muet. Terminé quand l'annonce est écrite ; attends un « ok » seulement si une question y figure.

4. **Coder** sur une branche `feat/<NN>-<slug>` partie de `develop`. Tâches indépendantes en sous-agents, chacun avec : sa tâche, les décisions de l'étape 1 qui la concernent, les fichiers qu'il possède. Un commit par tâche, hash reporté dans `TASKS.md`. Une décision prise en conversation s'écrit dans le `README.md` de la feature au moment où elle est prise.

5. **Prouver** : `verify` jusqu'au code 0, puis `verifier-rendu` sur chaque écran web touché, contre son cadre. Une migration appliquée reste intacte ; un changement de schéma ajoute une nouvelle migration. Terminé quand `verify` sort à 0 et que chaque écran a sa mesure.

6. **Clôturer** : `feature-roadmap` en mode clôture, puis `pr` pour la PR vers `develop`. Le merge attend l'accord explicite de l'utilisateur.
