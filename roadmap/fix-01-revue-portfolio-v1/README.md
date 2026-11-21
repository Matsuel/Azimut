# fix-01 · Revue de la PR Portfolio Management V1

- **Statut** : Livrée
- **Roadmap** : hors roadmap annuelle — correctif après la feature 08
- **Période** : 2026-10-31
- **Branche / PR** : commits directs sur `develop`
- **Points** : 3 — estimés a posteriori
- **Maquettes** : aucune
- **Écrans modifiés** : aucun

## Objectif

Les résultats de la feature 08 restent justes après relecture de la PR : reprise d'un backtest ancien, calendrier d'une stratégie seule, taux sans risque, clé de période.

## Comment

Un commit unique corrige les écarts relevés en revue : tiret pour un résultat antérieur sans recalcul, calendrier propre à la stratégie, taux sans risque publié par l'engine (le web ne le calcule pas), `periodKey` partagé dans `@azimut/utils`, statuts de repository dérivés du service.

## Décisions

Aucune décision structurante.

## Écarts au plan

Aucun : correctif hors plan, classé a posteriori.

## Bilan

Un seul commit, sans dette laissée. Points estimés a posteriori d'après les diffs.

## Fichiers

- [`US.md`](US.md) — user story et critères d'acceptation
- [`TASKS.md`](TASKS.md) — tâches, points, dépendances
