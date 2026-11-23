# Catalogue web : `features/pricing`

Pages Taux et obligations (feature 17, maquette `35 · Taux et obligations`) et Options (feature 18, maquette `36 · Calculateur d'option`). La courbe vient de `GET /api/market/rates` (lue chez Yahoo par market-service), le prix et les durations de `POST` puis `GET /api/pricing/:id` (calculés par backtest-engine, stockés par core-backend) : le web convertit les ratios en pourcentages, regroupe les échéances sans flux pour l'affichage et ne calcule rien d'autre. Gabarits d'entrée : [`COMPONENTS.md`](../../../COMPONENTS.md#gabarits).

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

### CurveLegend et PointLabel

- **Import** : `import { CurveLegend, PointLabel, type InterpolatedRate } from "@/features/pricing/rate-curve-parts"`.
- **Rôle** : pièces de `RateCurveChart`. `CurveLegend` : points de marché, et taux interpolé si `interpolated` (dans `CardAction` de l'en-tête). `PointLabel` : valeur d'un point de la courbe (`LabelList` `content`), au-dessus du point, sous lui pour un creux.
- **Props** : `CurveLegend` : `interpolated` (`InterpolatedRate`, non requis). `PointLabel` : `x`, `y`, `index` du point, `points` (`RateCurvePoint[]`).
- **Source** : `src/features/pricing/rate-curve-parts.tsx`.

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

### OptionsPage

- **Import** : `import { OptionsPage } from "@/features/pricing/options-page"`.
- **Rôle** : écran de la route `routes.options` (`/app/options`, `?symbol=AAPL` depuis la fiche d'un symbole, `routes.symbolOptions`). En-tête « Calculateur d'option » (symbole, badge « Black-Scholes · européen », spot, strike et maturité de la demande, « Réinitialiser »), puis, à un résultat reçu, `OptionCards`, `OptionForm` à côté de `PayoffChart`, `ParityCard` et `PayoffGrid`. Avant un résultat, la zone du diagramme n'affiche qu'un état : rien demandé, calcul en cours, échec (cause reçue) ou lecture impossible. Préremplit le formulaire par `useOptionInputs` (spot, dividende, volatilité 1 an) et `useRateCurve` (`^IRX`) ; un préremplissage en échec laisse les champs vides avec un message, la saisie manuelle reste possible. La volatilité inchangée depuis le préremplissage est annoncée « historique », sinon « saisie ». Instancie `useCreatePricing` et `usePricing` (rafraîchi toutes les secondes tant que la demande est `PENDING`).
- **Props** :
  - `symbol` : symbole de l'URL, ou `null` (saisie manuelle).
- **Source** : `src/features/pricing/options-page.tsx`.

### OptionsHeader

- **Import** : `import { OptionsHeader } from "@/features/pricing/options-header"`.
- **Rôle** : `PageHeader` de la page Options : titre « Calculateur d'option » (avec le symbole s'il y en a un), badge « Black-Scholes · européen », description (spot, strike et maturité en jours de la demande affichée, sinon une phrase générale) et boutons « Réinitialiser » et, avec un symbole, « Volatilité implicite » (vers `routes.symbolOptionsSmile`).
- **Props** :
  - `symbol` : symbole de l'URL, ou `null`.
  - `input` : `OptionInput` de la demande affichée, ou `null`.
  - `currency` : devise du sous-jacent.
  - `onReset` : remet la page à zéro.
- **Source** : `src/features/pricing/options-header.tsx`.

### OptionForm

- **Import** : `import { OptionForm } from "@/features/pricing/option-form"`.
- **Rôle** : carte « Paramètres » : spot, strike, maturité en jours (avec sa valeur en années), taux sans risque (%), dividende continu q (%), volatilité (%) avec `InfoHint`. Valeurs de départ = `defaults`, tout reste modifiable. Validation par `createOptionSchema` (`noValidate` : pas de `step` natif).
- **Props** :
  - `defaults` : `Partial<OptionFormValues>`, issus de `optionDefaults`.
  - `onSubmit(values)` : `OptionFormValues` validées ; l'écran les convertit par `toOptionPricingInput`.
  - `pending` : désactive « Calculer » pendant l'envoi et le calcul.
  - `notice` : message de préremplissage impossible, non requis.
  - `error` : message d'erreur de l'API, non requis.
- **Source** : `src/features/pricing/option-form.tsx`.

### OptionCards

- **Import** : `import { OptionCards } from "@/features/pricing/option-cards"`.
- **Rôle** : quatre `StatCard` d'un résultat : prix du call et du put (badge « par action », valeur temps et intrinsèque reçues), parité (« Vérifiée » selon `parityVerified` reçu, `<Dash />` pour un résultat antérieur sans ce champ, écart à 6 décimales) et volatilité utilisée. Aides `InfoHint` `optionPrice`, `callPutParity`, `optionVolatility`.
- **Props** :
  - `result` : `OptionResult` reçu.
  - `volatility` : ratio annuel de la demande.
  - `currency` : devise du sous-jacent.
  - `historical` : volatilité inchangée depuis le préremplissage.
- **Source** : `src/features/pricing/option-cards.tsx`.

### PayoffChart

- **Import** : `import { PayoffChart } from "@/features/pricing/payoff-chart"`.
- **Rôle** : carte « Gain ou perte à l'échéance » : `LineChart` dans `ChartContainer` du résultat net d'un achat de call et de put sur `payoffGrid`, ligne du strike, points morts reçus (`breakEven`) en `ReferenceDot`, légende, infobulle et phrase des points morts.
- **Props** :
  - `result` : `OptionResult` reçu.
  - `strike` : strike de la demande.
  - `currency` : devise du sous-jacent.
- **Source** : `src/features/pricing/payoff-chart.tsx`.

### ParityCard

- **Import** : `import { ParityCard } from "@/features/pricing/parity-card"`.
- **Rôle** : carte « Parité call-put » : Call − Put, second membre S·e^(−qT) − K·e^(−rT) et écart (badge « vérifiée » selon `parityVerified`, `<Dash />` s'il est absent), reçus du moteur.
- **Props** : `result` : `OptionResult` reçu ; `currency` : devise du sous-jacent.
- **Source** : `src/features/pricing/parity-card.tsx`.

### PayoffGrid

- **Import** : `import { PayoffGrid } from "@/features/pricing/payoff-grid"`.
- **Rôle** : tableau « Grille de payoff » : cours final, payoff call et put, résultat net call et put (coloré gain ou perte) pour chaque point de `payoffGrid`.
- **Props** : `result` : `OptionResult` reçu ; `currency` : devise du sous-jacent.
- **Source** : `src/features/pricing/payoff-grid.tsx`.

### OptionChainPage

- **Import** : `import { OptionChainPage } from "@/features/pricing/chain-page"`.
- **Rôle** : écran « Grecques et smile » (maquette 37, route `routes.optionsSmile`, `?symbol=SPY` par `routes.symbolOptionsSmile`). Lance à l'ouverture une demande `OPTION_CHAIN` (`useChainPricing`) puis affiche `ChainStats`, `SmileChart` à côté de `GreeksCard`, et `ChainTable`. En-tête : titre avec symbole, badge « Chaîne du JJ/MM/AAAA », « Changer de sous-jacent » (vers le marché) et « Recalculer ». Sans symbole : une invitation, aucun calcul. Calcul en cours, échec (cause reçue) ou lecture impossible : un état à la place du contenu. La page route `app/app/options/smile/page.tsx` la clé sur le symbole, pour relancer le calcul quand il change.
- **Props** :
  - `symbol` : symbole de l'URL, ou `null`.
- **Source** : `src/features/pricing/chain-page.tsx`.

### OptionsTabs

- **Import** : `import { OptionsTabs } from "@/features/pricing/options-tabs"`.
- **Rôle** : onglets des pages Options, « Calculateur » (maquette 36) et « Grecques et smile » (maquette 37), en liens qui gardent le symbole.
- **Props** :
  - `active` : `calculator` ou `chain`.
  - `symbol` : symbole de l'URL, ou `null`.
- **Source** : `src/features/pricing/options-tabs.tsx`.

### ChainStats

- **Import** : `import { ChainStats } from "@/features/pricing/chain-stats"`.
- **Rôle** : quatre `StatCard` : contrats retenus sur le total, contrats écartés, volatilité implicite ATM (badge : échéance détaillée), volatilité historique 30 jours (badge : écart `volatilityPremium` en points). Valeurs du moteur, jamais recalculées ; `<Dash />` si absente.
- **Props** :
  - `chain` : `OptionChainResult`.
- **Source** : `src/features/pricing/chain-stats.tsx`.

### SmileChart

- **Import** : `import { SmileChart } from "@/features/pricing/smile-chart"`.
- **Rôle** : carte « Smile de volatilité » : volatilité implicite selon le strike, une courbe par échéance (couleurs `SMILE_COLORS`), repère pointillé du spot. Seuls les points reçus sont tracés.
- **Props** :
  - `chain` : `OptionChainResult`.
- **Source** : `src/features/pricing/smile-chart.tsx`.

### GreeksCard

- **Import** : `import { GreeksCard } from "@/features/pricing/greeks-card"`.
- **Rôle** : carte « Grecques » : liste des contrats retenus de l'échéance détaillée (par défaut le plus proche du spot), sa volatilité implicite en lecture seule, puis delta, gamma, vega, theta et rho avec valeur, unité, phrase de lecture et `InfoHint`. Tous les chiffres viennent du moteur.
- **Props** :
  - `chain` : `OptionChainResult`.
- **Source** : `src/features/pricing/greeks-card.tsx`.

### ChainTable

- **Import** : `import { ChainTable } from "@/features/pricing/chain-table"`.
- **Rôle** : carte « Chaîne » : toutes les cotations de l'échéance détaillée (strike, type, bid, ask, prix milieu, IV du moteur en gras, IV Yahoo grisée, badge de statut `QUOTE_STATUS_BADGES`) et le décompte des contrats écartés par cause.
- **Props** :
  - `chain` : `OptionChainResult`.
- **Source** : `src/features/pricing/chain-table.tsx`.

### `features/pricing/api.ts`

- **Import** : `import { getRateCurve, createPricing, getPricing, getOptionInputs } from "@/features/pricing/api"`.

| Export | Rôle (et unité) |
| --- | --- |
| `getRateCurve` | `GET /api/market/rates` → `RateCurve` (taux en ratio annuel, maturités en années). |
| `createPricing` | `POST /api/pricing` avec un `PricingInput` → `PricingView` `PENDING`. |
| `getPricing` | `GET /api/pricing/:id` → `PricingView` (`PENDING`, `COMPLETED` avec `result`, `FAILED` avec `error`). |
| `getOptionInputs` | `GET /api/market/option-inputs?symbol=` → `OptionInputs` (spot en devise principale, dividende et volatilité 1 an en ratios annuels, `volatility` `null` sans historique). |

### `features/pricing/hook.ts`

- **Import** : `import { useRateCurve, useCreatePricing, usePricing, useOptionInputs, useChainPricing } from "@/features/pricing/hook"`.

| Export | Rôle |
| --- | --- |
| `useRateCurve()` | Courbe (clé `["pricing", "rates"]`), gardée `RATE_CURVE_STALE_MS`. |
| `useCreatePricing()` | Mutation `createPricing` ; la vue `PENDING` renvoyée entre dans le cache de `usePricing`. |
| `useOptionInputs(symbol)` | Préremplissage d'un symbole (clé `["pricing", "option-inputs", symbol]`), sans requête si `symbol` est `null`, sans nouvel essai. |
| `useChainPricing(symbol)` | Lance `POST /api/pricing` (`OPTION_CHAIN`) une fois à l'ouverture, lit la demande ; renvoie `view`, `result` (chaîne si `COMPLETED`), `pending`, `readFailed`, `createError` et `recompute`. |
| `usePricing(id)` | Demande (clé `["pricing", "detail", id]`), sans requête si `id` est `null`, rafraîchie toutes les `PRICING_POLL_MS` tant qu'elle est `PENDING`. |

### `features/pricing/schema.ts`

- **Import** : `import { createBondSchema, createOptionSchema, type BondFormValues, type OptionFormValues } from "@/features/pricing/schema"`.

| Export | Rôle |
| --- | --- |
| `createBondSchema(t)` | Schéma zod traduit du formulaire : nominal > 0, coupon et taux plat en pourcent de 0 à 100, maturité entière de 1 à 30, taux plat exigé seulement s'il est choisi. |
| `BondFormValues` | Type de la saisie, dérivé du schéma. |
| `createOptionSchema(t)` | Schéma zod traduit du formulaire d'option : spot et strike > 0, maturité entière de 1 à 10 950 jours, taux de −10 à 100 %, q de 0 à 100 %, volatilité > 0 et ≤ 500 %. |
| `OptionFormValues` | Type de la saisie d'option, dérivé du schéma. |

### `features/pricing/utils.ts`

- **Import** : `import { toPricingInput, groupFlows, toOptionPricingInput, optionDefaults, toMaturityDays } from "@/features/pricing/utils"`.

| Export | Rôle |
| --- | --- |
| `toPricingInput(values)` | Saisie → corps de `POST /api/pricing` : pourcentages en ratios, coupon à 0 pour un zéro-coupon, date de valeur en `YYYY-MM-DD` local. |
| `groupFlows(flows)` | Regroupe les échéances consécutives sans flux en une ligne (`from`, `to`, `flow`). |
| `toOptionPricingInput(values)` | Saisie d'option → corps de `POST /api/pricing` : pourcentages en ratios, jours en années de 365 jours. |
| `optionDefaults(inputs, curve)` | Valeurs de départ du formulaire d'option : spot, strike (spot arrondi), 182 jours, taux `^IRX`, q et volatilité en pourcentages ; un champ sans source reste absent. |
| `toMaturityDays(years)` | Années de la demande → jours entiers (× 365). |

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
| `DAYS_PER_YEAR` | Jours d'une année de maturité d'option (365). |
| `OPTION_MATURITY_MAX_DAYS` | Maturité maximale saisie en jours (30 ans), miroir du contrat. |
| `DEFAULT_OPTION_MATURITY_DAYS` | Maturité de départ (182 jours). |
| `RISK_FREE_SYMBOL` | Indice de la courbe lu comme taux sans risque (`^IRX`). |
| `OPTION_DEFAULT_CURRENCY` | Devise d'une option saisie sans symbole (`USD`). |
| `SMILE_COLORS` | Couleur de la courbe de chaque échéance du smile. |
| `QUOTE_STATUS_BADGES` | Statut d'une cotation → clé de libellé et variant de `Badge`. |

### `features/pricing/types.ts`

- **Import** : `import type { PricingView, RateCurve, … } from "@/features/pricing/types"`.
- Réexports des types du contrat : `BondFlow`, `BondInput`, `BondResult`, `ChainRow`, `OptionChainResult`, `OptionGreeks`, `OptionInput`, `OptionInputs`, `OptionPrice`, `OptionResult`, `PayoffPoint`, `PricingInput`, `PricingResult`, `PricingStatus`, `PricingView`, `QuoteStatus`, `RateCurve`, `RateCurvePoint`, `SmileCurve`.
