# 14 · Projection Monte Carlo — Tâches

> Décisions : `US.md`. Échelle de points, statuts et définition de terminé commune : [`roadmap/README.md`](../README.md). Points prévus.

## Synthèse

| Tâche | Titre | US | Couche | Priorité | Points | Dépend de | Commits |
| --- | --- | --- | --- | --- | --- | --- | --- |
| T-01 | Contrat : topic, paramètres et schémas de projection | US-01, US-03 | contracts | MUST | 2 | — | — |
| T-02 | Moteur de projection (risk-engine) | US-01, US-02 | risk-engine | MUST | 8 | T-01 | — |
| T-03 | Publication de `projection.completed` par risk-engine | US-01, US-03 | risk-engine | MUST | 3 | T-01, T-02 | — |
| T-04 | Stockage et route côté core-backend | US-01, US-03, US-04 | core-backend | MUST | 8 | T-01 | — |
| T-05 | Composants partagés de backtest | US-01 | web | MUST | 2 | — | — |
| T-06 | Écran Projection | US-01, US-02, US-04 | web | MUST | 8 | T-04, T-05 | — |
| T-07 | Clôture : vérifications, dette, bilan | US-01 | docs | SHOULD | 1 | T-03, T-06 | — |

**Total** : 32 points — MUST 31, SHOULD 1. Les tâches T-01 à T-07 suivent les Tâches 1 à 7 de `PLAN.md` (la Tâche 0, maquette et roadmap, est faite).

| Lot | Tâches | Points |
| --- | --- | --- |
| 1. Contrat | T-01 | 2 |
| 2. Moteur et publication | T-02 → T-03 | 11 |
| 3. Service | T-04 | 8 |
| 4. Écrans | T-05 → T-06 | 10 |
| 5. Clôture | T-07 | 1 |

**Chemin critique** (19 points) : T-01 → T-04 → T-06 → T-07. T-02 : la reproductibilité tient sur l'ordre de tirage fixe (trajectoire puis bloc) ; un test à seed fixe la protège. T-04 : colonnes nullables et première réception gagnante, pour le rejeu.

**Parallélisable** : T-01 et T-05 dès le début ; T-02 et T-04 après T-01 ; T-06 après T-04 et T-05.

## Graphe des dépendances

```mermaid
flowchart LR
    T01[T-01 Contrat  topic, paramètres, schémas]
    T02[T-02 Moteur de projection]
    T03[T-03 Publication par risk-engine]
    T04[T-04 Stockage et route core-backend]
    T05[T-05 Composants partagés]
    T06[T-06 Écran Projection]
    T07[T-07 Clôture]
    T01 --> T02
    T01 --> T03
    T02 --> T03
    T01 --> T04
    T04 --> T06
    T05 --> T06
    T03 --> T07
    T06 --> T07
```

---

## Lot 1 — Contrat

### T-01 · Contrat : topic, paramètres et schémas de projection

- **US** : US-01, US-03 · **Priorité** : MUST · **Points** : 2 · **Dépend de** : — · **Commits** : —
- **Fichiers** : `packages/contracts/src/projection.ts`, `packages/contracts/src/index.ts`

Critères d’acceptation :
- [ ] Topic `projection.completed`, `PROJECTION_PARAMS` (D6′), `PROJECTION_HORIZONS`, schémas de point, d'année et de projection, enveloppe `KafkaEvent` (D4′).
- [ ] Chaque champ numérique documente son unité (EUR, ratio, jours ouvrés, date `YYYY-MM-DD`).
- [ ] `ProjectionView` : états `COMPUTED`, `INSUFFICIENT_DATA`, `UNAVAILABLE`.

## Lot 2 — Moteur et publication

### T-02 · Moteur de projection (risk-engine)

- **US** : US-01, US-02 · **Priorité** : MUST · **Points** : 8 · **Dépend de** : T-01 · **Commits** : —
- **Fichiers** : `apps/risk-engine/engine/projection.utils.ts`, `engine/projection.engine.ts`, `engine/risk.utils.ts`, `test/projection.*.test.ts`

Critères d’acceptation :
- [ ] Même seed et mêmes entrées : sortie identique ; deux seeds donnent deux résultats différents.
- [ ] Blocs de 21 jours ouvrés, 10 000 trajectoires, un seul calcul sur 2 520 jours (D2, D6′, D9) ; 121 points tous les 21 jours (D10).
- [ ] Mêmes jours tirés pour tous les actifs, poids du backtest : corrélation conservée (D5) ; `portfolioReturns` partagé avec `computeRisk`.
- [ ] Percentiles P5 à P95 (D7) et probabilité de perte à chaque fin d'année (D8′), arrondis à la publication seulement.
- [ ] Moins de 250 jours communs ou actif sans cours : `null`. Rendements constants ou nuls : pas de division par zéro.

### T-03 · Publication de `projection.completed` par risk-engine

- **US** : US-01, US-03 · **Priorité** : MUST · **Points** : 3 · **Dépend de** : T-01, T-02 · **Commits** : —
- **Fichiers** : `apps/risk-engine/services/risk.service.ts`, `publishers/risk.publisher.ts`, `consumers/risk.consumer.ts`, `index.ts`, `test/risk.service.test.ts`

Critères d’acceptation :
- [ ] Après le risque, `projection.completed` est publié avec `executionId` et la projection (capital = `totalInvested`, seed 42).
- [ ] Les cours EUR sont lus une seule fois pour le risque et la projection (D11).

## Lot 3 — Service

### T-04 · Stockage et route côté core-backend

- **US** : US-01, US-03, US-04 · **Priorité** : MUST · **Points** : 8 · **Dépend de** : T-01 · **Commits** : —
- **Fichiers** : `apps/core-backend/prisma/schema.prisma` et migration, `repositories/`, `services/`, `controller/`, `consumers/`, `routes/projection/`, `API.md`, `test/projection.*.test.ts`

Critères d’acceptation :
- [ ] Colonnes `projection` et `projectionComputedAt` nullables ; un `projection.completed` rejoué n'écrase rien (première réception gagne).
- [ ] `GET /api/projection/:backtestId` renvoie `COMPUTED`, `INSUFFICIENT_DATA` ou `UNAVAILABLE` ; `NotFoundError` pour un autre utilisateur ; jamais de 500 pour un ancien résultat.
- [ ] Un message invalide est loggué et ignoré.
- [ ] Section « Projection » de `API.md`.

## Lot 4 — Écrans

### T-05 · Composants partagés de backtest

- **US** : US-01 · **Priorité** : MUST · **Points** : 2 · **Dépend de** : — · **Commits** : —
- **Fichiers** : `apps/web/src/components/backtest-picker.tsx`, `state-card.tsx`, `features/risk/`, `COMPONENTS.md`

Critères d’acceptation :
- [ ] `BacktestPicker` et `StateCard` déplacés vers `components/` ; page Risque inchangée.
- [ ] Catalogues mis à jour.

### T-06 · Écran Projection

- **US** : US-01, US-02, US-04 · **Priorité** : MUST · **Points** : 8 · **Dépend de** : T-04, T-05 · **Commits** : —
- **Fichiers** : `apps/web/src/features/projection/` (nouveau), `app/app/projection/page.tsx`, `lib/routes.ts`, `messages/{fr,en}.json`, `COMPONENTS.md`

Critères d’acceptation :
- [ ] En-tête dans la forme de la page Risque : titre, badge, allocation et période, sélecteur de backtest (maquette 34).
- [ ] Médiane et deux bandes P25-P75 et P10-P90 ; sélecteur d'horizon 1, 3, 5, 10 ans sans requête (D6′, D9).
- [ ] Paramètres affichés en lecture seule ; probabilité de perte et tableau par horizon affichés tels que reçus, avec la mention « calculée sur des scénarios historiques, pas une promesse ».
- [ ] États `UNAVAILABLE` (« Relancer le backtest ») et `INSUFFICIENT_DATA` (maquettes 34.1 et 34.2).
- [ ] Rendu comparé à la maquette avec le skill `verifier-rendu`.

## Lot 5 — Clôture

### T-07 · Clôture : vérifications, dette, bilan

- **US** : US-01 · **Priorité** : SHOULD · **Points** : 1 · **Dépend de** : T-03, T-06 · **Commits** : —
- **Fichiers** : `TECH-DEBT.md`, `roadmap/README.md`, `roadmap/14-projection-monte-carlo/`

Critères d’acceptation :
- [ ] `verify` et les contrôles manuels de `AGENTS.md` passés ; dette repérée ajoutée à `TECH-DEBT.md`.
- [ ] Critères cochés, commits et bilan écrits, statut `Livrée` dans l'index.
- [ ] Redémarrage de `risk-engine` et `core-backend` signalé (nouveau topic et contrat).
