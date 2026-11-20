# Catalogue web : `features/pricing`

Page Taux et obligations (feature 17, maquette `35 · Taux et obligations`). La courbe vient de `GET /api/market/rates` (lue chez Yahoo par market-service), le prix et les durations de `POST` puis `GET /api/pricing/:id` (calculés par backtest-engine, stockés par core-backend) : le web convertit les ratios en pourcentages, regroupe les échéances sans flux pour l'affichage et ne calcule rien d'autre. Gabarits d'entrée : [`COMPONENTS.md`](../../../COMPONENTS.md#gabarits).

### RatesPage

- **Import** : `import { RatesPage } from "@/features/pricing/rates-page"`.
- **Rôle** : écran de la route `routes.rates` (`/app/rates`) : en-tête « Taux et obligations » (badge « Taux US seulement », date de la courbe, bouton « Réinitialiser »), `RateCards`, `RateCurveChart` et `BondForm` côte à côte, puis `BondResult` et `PricingMethod`. La zone résultat n'affiche qu'un état : rien demandé, calcul en cours, échec (cause reçue), lecture impossible, ou le résultat. Instancie `useRateCurve`, `useCreatePricing` et `usePricing` (rafraîchi toutes les secondes tant que la demande est `PENDING`) ; « Réinitialiser » oublie la demande et remonte le formulaire.
- **Props** : aucune.
- **Source** : `src/features/pricing/rates-page.tsx`.

### RateCards

- **Import** : `import { RateCards } from "@/features/pricing/rate-cards"`.
- **Rôle** : quatre `StatCard` : libellé de la maturité, pastille de l'indice Yahoo, taux annuel (`formatPercent2`), jour de cotation.
- **Props** : `curve` : `RateCurve` reçue.
- **Source** : `src/features/pricing/rate-cards.tsx`.

### RateCurveChart

- **Import** : `import { RateCurveChart } from "@/features/pricing/rate-curve-chart"`.
- **Rôle** : carte « Courbe des taux US » : `LineChart` dans `ChartContainer`, axe X numérique en années (un tick par point, « 3 m » sous un an), axe Y en pourcentage, infobulle ; point orange `ReferenceDot` pour le taux interpolé de l'obligation ; légende et mention « taux US seulement ».
- **Props** :
  - `curve` : `RateCurve` reçue.
  - `interpolated` : `{ maturityYears, rate }`, non requis (résultat calculé au taux de la courbe).
- **Source** : `src/features/pricing/rate-curve-chart.tsx`.

### BondForm

- **Import** : `import { BondForm } from "@/features/pricing/bond-form"`.
- **Rôle** : carte « Prix d'une obligation » : onglets zéro-coupon / à coupons (coupon grisé à 0 pour un zéro-coupon), nominal (€), coupon annuel (%), maturité (années entières, 1 à 30), `DateField` de la date de valeur, onglets courbe US interpolée / taux euro saisi, taux plat (%) quand il est choisi. Saisie initiale `DEFAULT_BOND` (zéro-coupon de 100 € à 5 ans, 3 %).
- **Props** :
  - `onSubmit(values)` : `BondFormValues` validées par `createBondSchema` ; l'écran les convertit par `toPricingInput`.
  - `pending` : désactive « Calculer le prix » pendant l'envoi et le calcul.
  - `error` : message d'erreur de l'API, non requis.
- **Source** : `src/features/pricing/bond-form.tsx`.

### BondResultCard

- **Import** : `import { BondResultCard } from "@/features/pricing/bond-result"`.
- **Rôle** : carte « Résultat » d'une demande `COMPLETED` : trois `StatCard` (prix actualisé, duration de Macaulay, duration modifiée avec la variation de prix pour +1 point), `FlowsTable`, et la phrase « Un euro dans N ans vaut … » (facteur de la dernière échéance). Aide `InfoHint` sur `bondPrice`, `macaulayDuration`, `modifiedDuration`.
- **Props** : `view` : `PricingView` `COMPLETED`.
- **Source** : `src/features/pricing/bond-result.tsx`.

### FlowsTable

- **Import** : `import { FlowsTable } from "@/features/pricing/flows-table"`.
- **Rôle** : tableau année / flux / facteur / valeur actuelle ; les échéances consécutives sans flux forment une ligne « 1 à 4 » (`groupFlows`), les autres montrent l'échéance datée ; ligne « Total » (`totalCashFlow` et `price` reçus).
- **Props** : `bond` : `BondResult` reçu.
- **Source** : `src/features/pricing/flows-table.tsx`.

### PricingMethod

- **Import** : `import { PricingMethod } from "@/features/pricing/pricing-method"`.
- **Rôle** : carte « Méthode et source » : source des taux (indices Yahoo de la courbe), date des taux, taux utilisé (`<Dash />` sans résultat), actualisation, interpolation, courbe euro non disponible, risque de crédit non modélisé.
- **Props** :
  - `curve` : `RateCurve` reçue.
  - `bond` : `BondResult` reçu, ou `null` tant qu'aucun résultat.
- **Source** : `src/features/pricing/pricing-method.tsx`.

### `features/pricing/api.ts`

- **Import** : `import { getRateCurve, createPricing, getPricing } from "@/features/pricing/api"`.

| Export | Rôle (et unité) |
| --- | --- |
| `getRateCurve` | `GET /api/market/rates` → `RateCurve` (taux en ratio annuel, maturités en années). |
| `createPricing` | `POST /api/pricing` avec un `PricingInput` → `PricingView` `PENDING`. |
| `getPricing` | `GET /api/pricing/:id` → `PricingView` (`PENDING`, `COMPLETED` avec `result`, `FAILED` avec `error`). |

### `features/pricing/hook.ts`

- **Import** : `import { useRateCurve, useCreatePricing, usePricing } from "@/features/pricing/hook"`.

| Export | Rôle |
| --- | --- |
| `useRateCurve()` | Courbe (clé `["pricing", "rates"]`), gardée `RATE_CURVE_STALE_MS`. |
| `useCreatePricing()` | Mutation `createPricing` ; la vue `PENDING` renvoyée entre dans le cache de `usePricing`. |
| `usePricing(id)` | Demande (clé `["pricing", "detail", id]`), sans requête si `id` est `null`, rafraîchie toutes les `PRICING_POLL_MS` tant qu'elle est `PENDING`. |

### `features/pricing/schema.ts`

- **Import** : `import { createBondSchema, type BondFormValues } from "@/features/pricing/schema"`.

| Export | Rôle |
| --- | --- |
| `createBondSchema(t)` | Schéma zod traduit du formulaire : nominal > 0, coupon et taux plat en pourcent de 0 à 100, maturité entière de 1 à 30, taux plat exigé seulement s'il est choisi. |
| `BondFormValues` | Type de la saisie, dérivé du schéma. |

### `features/pricing/utils.ts`

- **Import** : `import { toPricingInput, groupFlows } from "@/features/pricing/utils"`.

| Export | Rôle |
| --- | --- |
| `toPricingInput(values)` | Saisie → corps de `POST /api/pricing` : pourcentages en ratios, coupon à 0 pour un zéro-coupon, date de valeur en `YYYY-MM-DD` local. |
| `groupFlows(flows)` | Regroupe les échéances consécutives sans flux en une ligne (`from`, `to`, `flow`). |

### `features/pricing/constants.ts`

- **Import** : `import { PRICING_POLL_MS, … } from "@/features/pricing/constants"`.

| Export | Rôle (et unité) |
| --- | --- |
| `PRICING_POLL_MS` | Intervalle de rafraîchissement d'une demande `PENDING`, ms. |
| `RATE_CURVE_STALE_MS` | Durée pendant laquelle une courbe lue est réutilisée, ms. |
| `PRICING_CURRENCY` | Devise d'affichage des prix (`EUR`). |
| `BOND_MATURITY_YEARS` | Bornes de la maturité saisie (1 à 30 ans), miroir du contrat. |
| `RATE_CARD_KEYS` | Indice Yahoo → clé de libellé de la carte. |
| `BOND_TYPES`, `DISCOUNT_SOURCES` | Valeurs des deux onglets du formulaire. |
| `DEFAULT_BOND` | Saisie initiale (zéro-coupon de 100 €, 5 ans, taux plat 3 %). |

### `features/pricing/types.ts`

- **Import** : `import type { PricingView, RateCurve, … } from "@/features/pricing/types"`.
- Réexports des types du contrat : `BondFlow`, `BondInput`, `BondResult`, `PricingInput`, `PricingResult`, `PricingStatus`, `PricingView`, `RateCurve`, `RateCurvePoint`.
