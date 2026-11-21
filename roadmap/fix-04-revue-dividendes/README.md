# fix-04 · Revue de la feature 11 : dividendes, splits et devise

- **Statut** : Livrée
- **Roadmap** : hors roadmap annuelle — correctif après la feature 11
- **Période** : 2026-11-12
- **Branche / PR** : commits directs sur `develop`
- **Points** : 14 — estimés a posteriori
- **Maquettes** : aucune
- **Écrans modifiés** : aucun

## Objectif

La feature 11 est corrigée après revue : boutons visibles, migrations propres, persistance testée, aides, types dérivés du contrat.

## Comment

Web : bouton Dividendes et change toujours visible (`8aad9e4`), `nativeButton={false}` sur les boutons-liens (`264967d`), aide sur les cartes et type `DividendEvent` du contrat (`e1134bc`). Backend : migration d'origine restaurée, colonnes finales dans une seconde migration (`5f0d976`) ; revue, test de persistance (`b554a81`), résumé sans `dividendEvents` (`0928220`), `priceType`, `MarketExtras` et test `backtest.fx` (`d3d2285`).

## Décisions

Aucune décision structurante.

## Écarts au plan

Aucun : correctif hors plan, classé a posteriori.

## Bilan

Corrections livrées le jour de la clôture de la feature 11. Points estimés a posteriori d'après les diffs.

## Fichiers

- [`US.md`](US.md) — user story et critères d'acceptation
- [`TASKS.md`](TASKS.md) — tâches, points, dépendances
