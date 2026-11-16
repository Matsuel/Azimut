# 14 · Projection Monte Carlo

- **Statut** : Livrée
- **Roadmap** : Mois 7 — Mois 7 — Projection (Monte Carlo seedé, fan chart, percentiles, probabilité de perte)
- **Période** : 2026-11-16 → 2026-11-16
- **Branche / PR** : `feat/projection-monte-carlo` — PR à ouvrir
- **Points** : 32 (MUST 31, SHOULD 1) prévus, 32 réalisés
- **Maquettes** : `34 · Projection Monte Carlo` (mise à jour le 2026-11-16, node `455:12320`) ; états `34.1 · Projection · indisponible` (node `563:14423`) et `34.2 · Projection · données insuffisantes` (node `563:15104`)
- **Écrans modifiés** : aucun (page `Projection` de la sidebar, le backtest se choisit avec le sélecteur de l'en-tête de la page 34)
- **Dépend de** : 12 (robustesse). Le moteur est réutilisé en 18 pour le pricing.

## Objectif

L'utilisateur voit la distribution des futurs possibles de son allocation, bâtie sur son propre passé. Le moteur est le même que celui qui pricera les options exotiques (18) : c'est le socle du pricing.

## Comment

Même patron que le Risque (feature 13). `risk-engine` consomme déjà `backtest.completed` et calcule les rendements journaliers EUR sur dates communes (D11) ; il en tire aussi la projection (bootstrap par blocs, PRNG seedé, un seul calcul sur 10 ans, D9) et publie `projection.completed` (D4′). `core-backend` la stocke sur `BacktestResult` (colonnes nullables, première réception gagne) et l'expose par `GET /api/projection/:backtestId`. Il n'y a ni demande ni POST : la projection est calculée après chaque backtest, ses paramètres sont fixes et affichés en lecture seule (D6′). Le web choisit le backtest avec le sélecteur, puis l'horizon (1, 3, 5 ou 10 ans) parmi les points annuels stockés, sans aucun calcul.

## Décisions

| # | Décision | Raison | Trace |
| --- | --- | --- | --- |
| D1 | **Générateur** : PRNG seedé implémenté dans l'engine (sans dépendance) | Une seed explicite rend le résultat testable ; une dépendance pour un générateur n'apporte rien ici. | `US.md` (à valider) |
| D2 | **Blocs** : 21 jours ouvrés, fixe | Conserve un peu d'enchaînement des jours sans paramètre à exposer. | `US.md` (à valider) |
| D3 | **Stockage** : Percentiles seulement | 10 000 trajectoires × 2 520 jours ne se stockent pas ; on garde ce qui s'affiche. Précisée par D10. | `US.md` (à valider) |
| D4 | ~~Deux nouveaux topics Kafka, demande par POST~~ | Remplacée par D4′. | Remplacée le 2026-11-16 |
| D4′ | **Transport** : un seul nouveau topic, `projection.completed`. Calculée automatiquement après chaque backtest, dans `risk-engine`, sur le même `backtest.completed`. Ni `projection.requested` ni POST. | Évite un second aller-retour pour un calcul qui ne dépend que du backtest ; rejeu géré par statut côté core-backend. | Décision du 2026-11-16 |
| D5 | **Source** : blocs tirés sur les actifs ensemble, pondérés aux poids du backtest | Les mêmes jours sont tirés pour tous les actifs : les corrélations sont conservées (même base que la 13). | Décision du 2026-11-14 |
| D6 | ~~Horizon choisi en années, envoyé au calcul~~ | Remplacée par D6′. | Remplacée le 2026-11-16 |
| D6′ | **Paramètres** : la projection repose sur un backtest, choisi avec le sélecteur comme pour le Risque. Paramètres fixes, affichés en lecture seule : 10 000 scénarios, seed 42, blocs de 21 jours ouvrés, historique = période du backtest, capital = `totalInvested`. Seul l'horizon (1, 3, 5, 10 ans) se choisit, sans déclencher de calcul. | Un seul résultat par backtest, identique pour tous les clients ; la seed est stockée avec le résultat. | Décision du 2026-11-16 |
| D7 | **Percentiles stockés** : P5, P10, P25, P50, P75, P90, P95 par date | Deux bandes imbriquées (P10-P90, P25-P75) plus la médiane et des extrêmes. | Décision du 2026-11-14 |
| D8 | ~~Probabilité de perte à l'horizon final seulement~~ | Remplacée par D8′. | Remplacée le 2026-11-16 |
| D8′ | **Probabilité de perte** : calculée à chaque fin d'année (1 à 10 ans) : part des scénarios dont la valeur est strictement sous le capital (EUR). | Le sélecteur d'horizon et le tableau par horizon l'affichent sans recalcul. Sans versements, le capital investi est le capital initial. | Décision du 2026-11-16 |
| D9 | **Un seul calcul sur 10 ans** : 2 520 jours ouvrés (10 × 252). Le sélecteur d'horizon tronque l'affichage ; les trajectoires à 5 ans sont les 5 premières années de celles à 10 ans, même seed. | Un horizon changé ne coûte rien et reste cohérent entre les vues. | Décision du 2026-11-16 |
| D10 | **Courbe** : un point tous les 21 jours ouvrés (fin de bloc), jour 0 compris : 121 points sur 10 ans. | Précise D3 : la taille du résultat stocké reste petite. | Décision du 2026-11-16 |
| D11 | **Moteur dans `risk-engine`**, pas dans `backtest-engine` : `toEuros`, `commonDates` et `dailyReturns` y existent déjà. | Pas de second code de rendements EUR à maintenir. | Décision du 2026-11-16 |
| D12 | **Historique minimal** : 2 jours communs (1 rendement), pas 250. Les blocs font `min(21, rendements disponibles)` jours ; `blockDays` du résultat = longueur effective. Un historique court donne une projection peu précise, affichée avec son nombre de jours. `null` seulement sous 2 jours ou si un actif n'a aucun cours. | `MIN_COMMON_DAYS` (250) ne vaut plus pour la projection. | Décision du 2026-11-16 |

## Écarts au plan

Le plan initial plaçait le moteur dans `backtest-engine` avec deux topics et un POST (D4, D6, D8) ; il est remplacé le 2026-11-16 par D4′, D6′, D8′, D9, D10 et D11. Rien n'était codé : les tâches sont re-découpées (T-01 à T-07), de 26 à 32 points.

## Bilan

Livré : moteur de projection par bootstrap de blocs seedé (`risk-engine/engine/`, 10 000 trajectoires, blocs de 21 jours, 121 points sur 10 ans, percentiles P5 à P95, probabilité de perte à chaque fin d'année), publication de `projection.completed` après le risque, stockage nullable sur `BacktestResult` (première réception gagnante), `GET /api/projection/:backtestId` (`COMPUTED`, `INSUFFICIENT_DATA`, `UNAVAILABLE`), page Projection (fan chart, percentiles, paramètres en lecture seule, états des maquettes 34.1 et 34.2). Le web n'affiche que des valeurs reçues. `bun run verify` passe (tsc, tests, lint, format).

32 points réalisés pour 32 prévus. Écarts : D12 (historique minimal de 2 jours au lieu de 250) ajoutée en cours de route, moteur, plan et AGENTS.md de risk-engine alignés ; le seuil rouge de perte a été retiré du web car c'est une règle métier ; le helper d'attente de résultat (`awaitResultPollMs`) est partagé avec la page Risque (refactor de T-05/T-06). Le cadre Figma 34.2 citait 250 jours : corrigé selon D12. Le critère de comparaison visuelle reste non coché : l'app n'a pas tourné avec backend, Kafka et base. Dette ouverte : TD-39 (`features/backtest/utils.ts` à 155 lignes), TD-40 (`HORIZON_YEARS` recopie `PROJECTION_HORIZONS`), TD-41 (comparaison visuelle, chevauchement possible des étiquettes du fan chart), TD-42 (pas de test d'omission de `projection` dans `GET /api/backtest/:id`). Redémarrer core-backend et risk-engine (nouveau topic `projection.completed`, migration `20261116105242_add_backtest_result_projection`).

## Fichiers

- [`US.md`](US.md) — user stories et critères d’acceptation
- [`TASKS.md`](TASKS.md) — tâches, points, dépendances
