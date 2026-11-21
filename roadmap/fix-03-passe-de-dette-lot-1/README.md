# fix-03 · Passe de dette : proxy, limites de débit et démarrage

- **Statut** : Livrée
- **Roadmap** : hors roadmap annuelle — correctif après la feature 11
- **Période** : 2026-11-12
- **Branche / PR** : commits directs sur `develop`
- **Points** : 11 — estimés a posteriori
- **Maquettes** : aucune
- **Écrans modifiés** : aucun

## Objectif

Les risques du registre de dette (TD-21, TD-22…) sont corrigés : limites de débit, démarrage de l'API, proxy market, plafond d'allocations.

## Comment

Correctifs côté core-backend et packages : la limite de débit ne vise plus `get-session` ni l'aperçu (`4d8bf6c`), l'API écoute avant Kafka avec un échec de démarrage franc (`59e1fb8`), proxy market en liste blanche, `DAY_MS` unique, cache et client de cours robustes (`b3969f8`), plafond d'allocations et `TRUST_PROXY` (`ec588af`). `ba272e9` retire des fichiers d'un ancien stash appliqué par erreur.

## Décisions

Aucune décision structurante.

## Écarts au plan

Aucun : correctif hors plan, classé a posteriori.

## Bilan

TD-21 et TD-22 fermées ; autres TD traitées dans `TECH-DEBT.md`. Points estimés a posteriori d'après les diffs.

## Fichiers

- [`US.md`](US.md) — user story et critères d'acceptation
- [`TASKS.md`](TASKS.md) — tâches, points, dépendances
