# Catalogue web : `features/projection`

Page Projection d'un backtest (feature 14, maquette `34 · Projection Monte Carlo`, états `34.1` indisponible et données insuffisantes). Toutes les valeurs viennent de `GET /api/projection/:backtestId` (calculées par risk-engine, stockées par core-backend) : le web sélectionne l'année de l'horizon dans `years`, filtre `points`, convertit les ratios en pourcentages et `day` en années (jours par année lus des données), sans rien calculer d'autre. Gabarits d'entrée : [`COMPONENTS.md`](../../../COMPONENTS.md#gabarits).

### BacktestProjection

- **Import** : `import { BacktestProjection } from "@/features/projection/backtest-projection"`.
- **Rôle** : écran de la route `routes.backtestProjection(id)` (`/app/projection?backtest=<id>`) : en-tête « Projection · <nom> » avec badge `Calculée` ou badge `En cours` (`StatusBadge` RUNNING) pendant le calcul, allocation, période, scénarios, horizon et `BacktestPicker` ; puis un seul état : erreur (« Réessayer »), chargement, calcul en cours (« Projection en cours de calcul… », sans bouton, rafraîchi toutes les 2 s tant qu'il est attendu, sans délai côté web : un calcul bloqué est expiré par le serveur), données insuffisantes, sans projection, y compris un calcul attendu depuis plus de 10 min, expiré par le serveur (« Relancer le backtest », désactivé pendant une exécution) ou `ComputedProjection` ; puis `ProjectionHistory` si l'historique n'est pas vide. Garde l'horizon choisi (5 par défaut) dans l'état local : le changer ne déclenche aucune requête. Instancie `useBacktest`, `useProjection` (rafraîchi par `projectionPollMs`) et `useRerunBacktest`.
- **Props** :
  - `backtestId` : id du backtest de l'URL ; `""` affiche l'état « Choisissez un backtest terminé ».
- **Source** : `src/features/projection/backtest-projection.tsx`.

### ProjectionBody

- **Import** : `import { ProjectionBody } from "@/features/projection/projection-body"`.
- **Rôle** : corps de `BacktestProjection` : une `StateCard` selon l'état (erreur, chargement, calcul en cours, données insuffisantes, indisponible) ou `ComputedProjection`.
- **Props** : `backtestId`, `backtestQuery` et `projectionQuery` (requêtes TanStack), `view` (`ProjectionView`), `execution`, `horizon` (années), `onHorizonChange`.
- **Source** : `src/features/projection/projection-body.tsx`.

### ProjectionHistory

- **Import** : `import { ProjectionHistory } from "@/features/projection/projection-history"`.
- **Rôle** : carte « Historique des calculs », sur le modèle de l'historique d'exécution du backtest : une ligne `HistoryRow` par exécution, la plus récente en haut : `#tentative`, badge d'état (`En cours` = `StatusBadge` RUNNING, `Calculée`, `Données insuffisantes`, `Indisponible`), date de réception (`<Dash />` sans), durée « en 0,7 s » (`<Dash />` sans).
- **Props** : `history` : `ProjectionRun[]` reçu.
- **Source** : `src/features/projection/projection-history.tsx`.

### ComputedProjection

- **Import** : `import { ComputedProjection } from "@/features/projection/computed-projection"`.
- **Rôle** : `ProjectionStats`, `ProjectionFanChart`, puis `ProjectionParams` et `ProjectionPercentiles` côte à côte, pour l'année dont `years` vaut l'horizon (message « horizon indisponible » sinon).
- **Props** : `projection` (`Projection` reçu), `horizon` (années), `onHorizonChange`.
- **Source** : `src/features/projection/computed-projection.tsx`.

### ProjectionStats

- **Import** : `import { ProjectionStats } from "@/features/projection/projection-stats"`.
- **Rôle** : quatre `StatCard` : capital médian (pastille P50, sous-titre « Investi »), scénario défavorable (P10), favorable (P90), probabilité de perte (pastille de l'horizon).
- **Props** :
  - `year` : `ProjectionYear` de l'horizon.
  - `capital` : capital de départ, EUR.
- **Source** : `src/features/projection/projection-stats.tsx`.

### ProjectionFanChart

- **Import** : `import { ProjectionFanChart } from "@/features/projection/projection-fan-chart"`.
- **Rôle** : carte « Éventail des trajectoires » : `ComposedChart` dans `ChartContainer` (aires `[p10, p90]` et `[p25, p75]`, ligne p50, `ReferenceLine` au capital, étiquettes P10 / médiane / P90 de fin d'horizon), `ChartLegend` et phrase de probabilité de perte. Axe X en années (`day` divisé par les jours de l'année, lus de `year.day / year.years`), points limités à l'horizon.
- **Props** :
  - `points` : `ProjectionPoint[]` reçus (EUR).
  - `capital` : capital de départ, EUR (ligne de référence).
  - `horizonYears` : horizon affiché, années.
  - `paths` : nombre de scénarios (description).
  - `year` : `ProjectionYear` de l'horizon (étiquettes, probabilité).
- **Source** : `src/features/projection/projection-fan-chart.tsx` (séries, infobulle et étiquettes dans `fan-chart-parts.tsx`).

### ProjectionPercentiles

- **Import** : `import { ProjectionPercentiles } from "@/features/projection/projection-percentiles"`.
- **Rôle** : carte « Percentiles par horizon » : une ligne par année ≤ `horizonYears` (P10, médiane, P90 en EUR entiers), paginées par `PERCENTILES_PAGE_SIZE` (`TablePagination`, page ramenée à la dernière si l'horizon raccourcit), et mention « pas une promesse ».
- **Props** :
  - `years` : `ProjectionYear[]` reçus.
  - `horizonYears` : dernière année affichée.
- **Source** : `src/features/projection/projection-percentiles.tsx`.

### ProjectionParams

- **Import** : `import { ProjectionParams } from "@/features/projection/projection-params"`.
- **Rôle** : carte « Paramètres de la projection » : `FilterTabs` des horizons de `HORIZON_YEARS` présents dans `projection.years` (1 / 3 / 5 / 10 / 20 / 30 ans pour un calcul de 30 ans, jusqu'à 10 pour un ancien), puis `DetailRow` en lecture seule : montant investi, scénarios, seed, taille des blocs (effective, peut être inférieure à 21), historique utilisé (période et nombre de jours, dès 2 jours).
- **Props** :
  - `projection` : `Projection` reçue.
  - `horizon` : horizon choisi, années.
  - `onHorizonChange` : reçoit le nouvel horizon (état local, aucune requête).
- **Source** : `src/features/projection/projection-params.tsx`.

### `features/projection/api.ts`

- **Import** : `import { getProjection } from "@/features/projection/api"`.

| Export | Rôle (et unité) |
| --- | --- |
| `getProjection` | `GET /api/projection/:backtestId` → `ProjectionView` (`PENDING`, `COMPUTED`, `INSUFFICIENT_DATA`, `UNAVAILABLE`, et `history`). |

### `features/projection/hook.ts`

- **Import** : `import { useProjection } from "@/features/projection/hook"`.

| Export | Rôle (et unité) |
| --- | --- |
| `useProjection(backtestId)` | Requête `["projection", "detail", id]`, aucune sans id ; rafraîchie selon `projectionPollMs`. |

### `features/projection/constants.ts`

- **Import** : `import { HORIZON_YEARS, DEFAULT_PROJECTION_HORIZON } from "@/features/projection/constants"`.

| Export | Rôle (et unité) |
| --- | --- |
| `HORIZON_YEARS` | Horizons proposés, années : 1, 3, 5, 10, 20, 30, filtrés par `projection.years` à l'affichage (choix d'affichage du web, borné par `PROJECTION_PARAMS.horizonYears` du contrat). |
| `DEFAULT_PROJECTION_HORIZON` | Horizon initial, 5 ans. |
| `PERCENTILES_PAGE_SIZE` | Lignes par page du tableau « Percentiles par horizon » : 5. |

### `features/projection/types.ts`

- **Import** : `import type { Projection, ProjectionView } from "@/features/projection/types"`.
- **Rôle** : réexporte `Projection`, `ProjectionPoint`, `ProjectionYear`, `ProjectionState`, `ProjectionView` du contrat (EUR, probabilités en ratio).

### `features/projection/utils.ts`

- **Import** : `import { formatComputationDuration, projectionPollMs } from "@/features/projection/utils"`.

| Export | Rôle (et unité) |
| --- | --- |
| `formatComputationDuration(f, t, durationMs)` | Durée du calcul reçue en millisecondes, au format de la page backtest : « 0,7 s » sous une minute (une décimale), « 1 min 5 s » au-delà (`t` = traducteur `backtest`). |
| `projectionPollMs(view)` | Intervalle de rafraîchissement (ms, `RESULT_POLL_MS`) tant que `projection.completed` est attendu (`PENDING`, ou `UNAVAILABLE` avec un calcul `PENDING` dans l'historique) ; `false` sinon. Sans horloge. |
