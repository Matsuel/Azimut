# fix-05 · CI sur les PR et passe de dette du 13 novembre

- **Statut** : Livrée
- **Roadmap** : hors roadmap annuelle — correctif après la feature 12
- **Période** : 2026-11-12 → 2026-11-13
- **Branche / PR** : commits directs sur `develop`
- **Points** : 7 — estimés a posteriori
- **Maquettes** : aucune
- **Écrans modifiés** : aucun

## Objectif

Les pull requests vers `develop` lancent Biome et les tests ; la dette TD-30 et TD-34 est traitée.

## Comment

CI : workflow biome + tests (`77947b1`). Backend : création d'un lot atomique et tests de l'authentification et du proxy (`ef551a9`). Contrats : unités manquantes (`2c0379e`). Verify : `.env.example` ignorés (`d059d35`).

## Décisions

Aucune décision structurante.

## Écarts au plan

Aucun : correctif hors plan, classé a posteriori.

## Bilan

TD-30 et TD-34 fermées. Points estimés a posteriori d'après les diffs.

## Fichiers

- [`US.md`](US.md) — user story et critères d'acceptation
- [`TASKS.md`](TASKS.md) — tâches, points, dépendances
