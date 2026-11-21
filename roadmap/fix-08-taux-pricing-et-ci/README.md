# fix-08 · Correctifs après les taux et obligations

- **Statut** : Livrée
- **Roadmap** : hors roadmap annuelle — correctif après la feature 17
- **Période** : 2026-11-21
- **Branche / PR** : commits directs sur `develop`
- **Points** : 8 — estimés a posteriori
- **Maquettes** : aucune
- **Écrans modifiés** : aucun

## Objectif

Le pricing expire et limite ses demandes, ses topics existent au démarrage, la page Taux colle à la maquette 35, et la CI génère les types Next.

## Comment

`27e7a4b` (TD-53), `0e0aa30` crée les topics `pricing.*` au démarrage, `d3e2727` aligne la page Taux sur la maquette 35 (TD-54 réduite), `60bdf67` génère les types Next avant `tsc` du web.

## Décisions

Aucune décision structurante.

## Écarts au plan

Aucun : correctif hors plan, classé a posteriori.

## Bilan

TD-53 fermée, TD-54 réduite. Points estimés a posteriori d'après les diffs.

## Fichiers

- [`US.md`](US.md) — user story et critères d'acceptation
- [`TASKS.md`](TASKS.md) — tâches, points, dépendances
