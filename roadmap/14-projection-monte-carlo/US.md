# 14 · Projection Monte Carlo — User stories

> Sources : README racine : Projection SHOULD « Monte Carlo seedé » ; section « Projection Monte Carlo » ; roadmap mois 7. Décisions du 2026-11-16 : D4′, D6′, D8′, D9, D10 et D11 (`README.md`).

## Point de départ

| Couche | Existant | Manque |
| --- | --- | --- |
| `apps/risk-engine/engine/` | `toEuros`, `commonDates`, `dailyReturns` (`risk.utils.ts`), `MIN_COMMON_DAYS` (250), `computeRisk` ; `TRADING_DAYS_PER_YEAR` dans `@azimut/utils`. | PRNG seedé, bootstrap par blocs, percentiles, `portfolioReturns` partagé. |
| `apps/risk-engine/{services,publishers,consumers}/` | Consumer `backtest.completed`, publication de `risk.completed`. | Publication de `projection.completed` après le risque. |
| `packages/contracts/src/` | `backtest.ts`, `risk.ts`, `event.ts`, `market.ts`. | `projection.ts` : topic, paramètres, schémas, `ProjectionView`. |
| `apps/core-backend` | `BacktestResult.risk` et `riskComputedAt`, route `GET /api/risk/:backtestId`. | Colonnes `projection` et `projectionComputedAt`, consumer, route `GET /api/projection/:backtestId`. |
| `apps/web/src/features/risk/` | `BacktestPicker` et `RiskStateCard`, propres au Risque. | Composants partagés, page Projection (le dossier `projection` est vide). |

## Hors périmètre

- Flux (versements, retraits) : taux de retrait et objectif financier (COULD).
- Scénarios de crise personnalisés (COULD).
- Modèles statistiques plus riches (COULD du README).
- Trajectoires individuelles affichées.
- Paramètres de projection modifiables (scénarios, seed, blocs, historique) et relance par l'utilisateur : voir D6′.

## Décisions

| # | Sujet | Décision | Raison |
| --- | --- | --- | --- |
| D1 | Générateur | PRNG seedé implémenté dans l'engine (sans dépendance) | Une seed explicite rend le résultat testable. |
| D2 | Blocs | 21 jours ouvrés, fixe | Conserve un peu d'enchaînement des jours sans paramètre à exposer. |
| D3 | Stockage | Percentiles seulement | 10 000 trajectoires × 2 520 jours ne se stockent pas ; précisée par D10. |
| D4′ | Transport | Un seul topic, `projection.completed` ; calcul automatique après chaque backtest, sans POST | Remplace D4 (deux topics, demande par POST). |
| D5 | Source | Blocs tirés sur les actifs ensemble, pondérés aux poids du backtest | Les corrélations sont conservées. Validée le 2026-11-14. |
| D6′ | Paramètres | Adossée à un backtest ; paramètres fixes en lecture seule (10 000 scénarios, seed 42, blocs de 21 jours, historique du backtest, capital `totalInvested`) ; seul l'horizon se choisit, sans calcul | Remplace D6. |
| D7 | Percentiles | P5, P10, P25, P50, P75, P90, P95 par date | Deux bandes et la médiane. Validée le 2026-11-14. |
| D8′ | Probabilité de perte | À chaque fin d'année (1 à 10 ans) : part des scénarios dont la valeur est < capital (EUR) | Remplace D8 (horizon final seulement). |
| D9 | Horizon | Un seul calcul sur 2 520 jours ouvrés ; le sélecteur tronque l'affichage | Même seed, vues cohérentes. |
| D10 | Courbe | Un point tous les 21 jours ouvrés, jour 0 compris : 121 points | Résultat stocké de petite taille. |
| D11 | Moteur | Dans `risk-engine`, pas dans `backtest-engine` | Les rendements EUR sur dates communes y existent déjà. |

---

## User stories

### Lot 1 — Contrat

#### US-03 · Rejouer une projection sans doublon — MUST

**En tant que** développeur, **je veux** qu'un message Kafka rejoué ne crée pas deux résultats **afin de** respecter la règle at-least-once du projet.

Critères d’acceptation :
- [ ] Un `projection.completed` rejoué n'écrase pas la première projection stockée (test).
- [ ] Un message invalide est loggué et ignoré, il ne fait pas lever le consumer (test).

Tâches : T-01, T-03, T-04 (détail dans `TASKS.md`).

---

### Lot 2 — Moteur

#### US-01 · Voir des futurs plausibles pour mon allocation — MUST

**En tant que** utilisateur, **je veux** voir un éventail de trajectoires futures construit sur l'historique de mon backtest **afin de** comprendre l'incertitude au lieu d'un seul chiffre.

Critères d’acceptation :
- [ ] Un fan chart montre la médiane et les bandes P25-P75 et P10-P90 sur l'horizon choisi (1, 3, 5 ou 10 ans).
- [ ] La projection est calculée après chaque backtest, avec les paramètres fixes affichés en lecture seule (D6′).
- [ ] La même seed et les mêmes rendements donnent le même résultat (test de reproductibilité).
- [ ] Changer l'horizon ne déclenche aucune requête.

Tâches : T-01, T-02, T-03, T-04, T-05, T-06, T-07 (détail dans `TASKS.md`).

---

#### US-02 · Connaître la probabilité de perte — MUST

**En tant que** utilisateur, **je veux** voir la probabilité que mon capital finisse sous son montant investi, à chaque horizon, **afin de** mesurer le risque de perte.

Critères d’acceptation :
- [ ] La probabilité est calculée à chaque fin d'année (D8′) et affichée avec la mention « calculée sur des scénarios historiques, pas une promesse ».
- [ ] Le tableau par horizon donne P10, médiane, P90 et probabilité de perte, une ligne par année jusqu'à l'horizon.

Tâches : T-02, T-06 (détail dans `TASKS.md`).

---

### Lot 3 — Écrans

#### US-04 · Comprendre l'absence de projection — SHOULD

**En tant que** utilisateur, **je veux** un message clair quand un backtest n'a pas de projection **afin de** savoir quoi faire (maquettes 34.1 et 34.2).

Critères d’acceptation :
- [ ] Backtest antérieur à la projection ou exécution en cours (`UNAVAILABLE`) : message « Relancer le backtest », jamais une erreur 500.
- [ ] Moins de 2 jours communs ou actif sans cours (`INSUFFICIENT_DATA`, D12) : message « données insuffisantes », aucun chiffre partiel.

Tâches : T-04, T-06 (détail dans `TASKS.md`).

---

## Récapitulatif

| US | Titre | Priorité | Lot | Couches |
| --- | --- | --- | --- | --- |
| US-01 | Voir des futurs plausibles pour mon allocation | MUST | 2 | contracts, risk-engine, core-backend, web, docs |
| US-02 | Connaître la probabilité de perte | MUST | 2 | risk-engine, web |
| US-03 | Rejouer une projection sans doublon | MUST | 1 | contracts, risk-engine, core-backend |
| US-04 | Comprendre l'absence de projection | SHOULD | 3 | core-backend, web |
