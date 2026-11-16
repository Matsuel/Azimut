# Catalogue web : `features/risk`

Page Risque d'un backtest (feature 13, maquette `33 · Risque`, états du cadre `33 · Risque · états (F13)`). Toutes les valeurs viennent de `GET /api/risk/:backtestId` (calculées par risk-engine, stockées par core-backend) : le web convertit les ratios en pourcentages et ne calcule rien. Gabarits d'entrée : [`COMPONENTS.md`](../../../COMPONENTS.md#gabarits).

### BacktestRisk

- **Import** : `import { BacktestRisk } from "@/features/risk/backtest-risk"`.
- **Rôle** : écran de la route `routes.backtestRisk(id)` (`/app/risk?backtest=<id>`) : en-tête « Risque · <nom> » avec badge `Calculé` (risque présent), allocation, période et `BacktestPicker` ; puis un seul état : erreur (« Réessayer »), chargement, données insuffisantes, sans risque (« Relancer le backtest », désactivé pendant une exécution), ou `RiskStats`, `CorrelationMatrix`, `RiskContributions`, `DrawdownConstraint` et `AssetExposures`. Instancie `useBacktest`, `useRisk` (rafraîchi par `awaitResultPollMs` de `features/backtest`), `useRerunBacktest` et `useSetRiskLimit`.
- **Props** :
  - `backtestId` : id du backtest de l'URL ; `""` affiche l'état « Choisissez un backtest terminé ».
- **Source** : `src/features/risk/backtest-risk.tsx`.

### RiskStats

- **Import** : `import { RiskStats } from "@/features/risk/risk-stats"`.
- **Rôle** : quatre `StatCard` : volatilité annualisée (pastille « période »), VaR et CVaR 95 % (pastille « historique »), concentration (poids max, pastille HHI, actifs effectifs).
- **Props** :
  - `risk` : `Risk` reçu.
- **Source** : `src/features/risk/risk-stats.tsx`.

### CorrelationMatrix

- **Import** : `import { CorrelationMatrix } from "@/features/risk/correlation-matrix"`.
- **Rôle** : carte « Matrice de corrélation » : grille carrée (deux décimales), cellule bleue `chart-1` si positive, rouge `destructive` si négative, opacité selon la valeur absolue ; phrase de lecture sur `reading.mostCorrelatedPair` (absente avec un seul actif).
- **Props** :
  - `risk`, `reading` : reçus de l'API.
- **Source** : `src/features/risk/correlation-matrix.tsx`.

### RiskContributions

- **Import** : `import { RiskContributions } from "@/features/risk/risk-contributions"`.
- **Rôle** : carte « Contribution au risque » : une barre `Progress` (`variant="chart"`) par actif, « Poids · Risque », total 100 % et phrase de lecture sur `reading.topContributor`.
- **Props** :
  - `risk`, `reading` : reçus de l'API.
- **Source** : `src/features/risk/risk-contributions.tsx`.

### DrawdownConstraint

- **Import** : `import { DrawdownConstraint } from "@/features/risk/drawdown-constraint"`.
- **Rôle** : carte « Contrainte de drawdown » : champ entier de 1 à 99 % (`createRiskLimitSchema`) et bouton « Vérifier », puis tableau Actuelle / Précédente (limite, drawdown mesuré en rouge si non respectée, badge de statut) et avertissement.
- **Props** :
  - `constraint` : `RiskConstraint` reçu, `null` sans limite saisie (pas de tableau).
  - `onCheck` : reçoit l'entier saisi (pourcent) ; l'écran le convertit en ratio.
  - `pending` : désactive « Vérifier ».
  - `error` (optionnel) : message d'erreur de l'API sous le champ.
- **Source** : `src/features/risk/drawdown-constraint.tsx`.

### AssetExposures

- **Import** : `import { AssetExposures } from "@/features/risk/asset-exposures"`.
- **Rôle** : carte « Expositions par actif » : poids, volatilité propre et part du risque ; ligne Total avec la volatilité du portefeuille.
- **Props** :
  - `risk` : `Risk` reçu.
- **Source** : `src/features/risk/asset-exposures.tsx`.

### `features/risk/api.ts`

- **Import** : `import { getRisk, setRiskLimit } from "@/features/risk/api"`.

| Export | Rôle (et unité) |
| --- | --- |
| `getRisk` | `GET /api/risk/:backtestId` → `RiskView`. |
| `setRiskLimit` | `PUT /api/risk/:backtestId/constraint`, limite en ratio (0,01 à 0,99) → `RiskView` réévaluée. |

### `features/risk/hook.ts`

- **Import** : `import { useRisk, useSetRiskLimit } from "@/features/risk/hook"`.

| Export | Rôle (et unité) |
| --- | --- |
| `useRisk` | Requête `["risk", "detail", id]`, aucune sans id ; `pollMs(view)` donne l'intervalle de rafraîchissement (ms) ou `false`. |
| `useSetRiskLimit` | Mutation de la limite ; la vue renvoyée remplace le cache. |

### `features/risk/schema.ts`

- **Import** : `import { createRiskLimitSchema, type RiskLimitValues, type RiskTranslator } from "@/features/risk/schema"`.

| Export | Rôle (et unité) |
| --- | --- |
| `createRiskLimitSchema(t)` | Formulaire de la limite : `limit` entier de 1 à 99 (pourcent), message traduit. |
| `RiskLimitValues`, `RiskTranslator` | Valeurs du formulaire ; traducteur du namespace `risk`. |

### `features/risk/constants.ts`

- **Import** : `import { RISK_LIMIT_PERCENT } from "@/features/risk/constants"`.

| Export | Rôle (et unité) |
| --- | --- |
| `RISK_LIMIT_PERCENT` | Bornes de la limite saisie, en pourcent entier (miroir de `RISK_LIMIT_BOUNDS` du contrat). |

### `features/risk/types.ts`

- **Import** : `import type { Risk, RiskView, … } from "@/features/risk/types"`.

| Export | Rôle (et unité) |
| --- | --- |
| `Risk`, `AssetRisk`, `RiskView`, `RiskReading`, `RiskConstraint`, `RiskConstraintCheck`, `RiskConstraintStatus`, `RiskState` | Réexports de `@azimut/contracts` (`risk.ts`) : ratios en nombres JSON. |
