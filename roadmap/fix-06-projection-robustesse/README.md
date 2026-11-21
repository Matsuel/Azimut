# fix-06 · Robustesse de la projection Monte Carlo

- **Statut** : Livrée
- **Roadmap** : hors roadmap annuelle — correctif après la feature 14
- **Période** : 2026-11-16
- **Branche / PR** : commits directs sur `develop`
- **Points** : 6 — estimés a posteriori
- **Maquettes** : aucune
- **Écrans modifiés** : aucun

## Objectif

Une projection ne reste pas bloquée : expiration, relance depuis le web, contrat compatible au déploiement, axes lisibles.

## Comment

`82fd40f` rend `durationMs` optionnel pour un déploiement sans perte ; `dd22326` expire une projection en attente après 10 min ; `7d8bc4f` permet de relancer le backtest depuis un calcul bloqué ; `6301e72` compacte les graduations d'axe à partir du million.

## Décisions

Aucune décision structurante.

## Écarts au plan

Aucun : correctif hors plan, classé a posteriori.

## Bilan

Aucune dette ouverte. Points estimés a posteriori d'après les diffs.

## Fichiers

- [`US.md`](US.md) — user story et critères d'acceptation
- [`TASKS.md`](TASKS.md) — tâches, points, dépendances
