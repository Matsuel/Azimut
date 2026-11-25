# Catalogue web : `features/structured`

Page Structuration (feature 21, maquette `39 · Constructeur de produit`, trois états : capital garanti, reverse convertible, autocallable). Le formulaire lance une demande `STRUCTURED` (`POST /api/pricing`), lue par `GET /api/pricing/:id` (calculée par backtest-engine, stockée par core-backend) : le web convertit les pourcentages saisis en ratios et affiche juste valeur, marge, briques, participation et probabilités telles que reçues. La seule valeur dérivée côté web est la diagonale du sous-jacent du graphique de payoff (`nominal × (1 + variation)`, repère visuel). Gabarits d'entrée : [`COMPONENTS.md`](../../../COMPONENTS.md#gabarits).

### StructuredPage

- **Import** : `import { StructuredPage } from "@/features/structured/structured-page"`.
- **Rôle** : écran de la route `routes.structured` (`/app/structured`) : `StructuredHeader`, `StructuredCards` (après un résultat), `StructuredForm` à côté de `DecompositionCard`, puis `PayoffCard` (précédée d'`ObservationsCard` pour l'autocallable). Avant un résultat, la zone de décomposition n'affiche qu'un état : rien demandé, calcul en cours, échec (cause reçue) ou lecture impossible. Instancie `useStructuredPricing` et garde le type choisi.
- **Props** : aucune.
- **Source** : `src/features/structured/structured-page.tsx`.

### StructuredHeader

- **Import** : `import { StructuredHeader } from "@/features/structured/structured-header"`.
- **Rôle** : titre « Constructeur de produit », badge du type de produit, description de la demande (sous-jacent, maturité, nominal, date des données, mention « pas un conseil »).
- **Props** :
  - `product` : `StructuredProduct`, type affiché en badge.
  - `input` : `StructuredInput | null`, demande affichée.
- **Source** : `src/features/structured/structured-header.tsx`.

### StructuredCards

- **Import** : `import { StructuredCards } from "@/features/structured/structured-cards"`.
- **Rôle** : quatre `StatCard` : juste valeur, prix client (nominal à 100 %), marge, puis participation (capital garanti), coupon (reverse convertible) ou probabilité de rappel (autocallable). Valeurs lues du résultat, avec leur aide (`InfoHint`).
- **Props** :
  - `result` : `StructuredResult` reçu.
  - `input` : `StructuredInput` de la même demande.
- **Source** : `src/features/structured/structured-cards.tsx`.

### StructuredForm

- **Import** : `import { StructuredForm } from "@/features/structured/structured-form"`.
- **Rôle** : carte « Produit » : onglets de type, sous-jacent, maturité, nominal, champs du produit (`PRODUCT_FIELDS`), taux et volatilité. Aucun champ « Prix client » (D5). Changer de type garde la saisie commune et remet le coupon à sa valeur de départ.
- **Props** :
  - `product` : `StructuredProduct` choisi (état de l'écran).
  - `onProductChange(product)` : changement de type.
  - `onSubmit(values)` : `StructuredFormValues` validées ; l'écran les convertit par `toStructuredPricingInput`.
  - `pending` : calcul en cours (bouton désactivé).
  - `error` : message de l'API, non requis.
- **Source** : `src/features/structured/structured-form.tsx`.

### DecompositionCard

- **Import** : `import { DecompositionCard } from "@/features/structured/decomposition-card"`.
- **Rôle** : carte « Décomposition » : barre empilée (`barSegments`), légende, tableau des briques (valeur, part du nominal), juste valeur, marge, prix client, puis la note de calcul de `useStructuredNotes`.
- **Props** : `result` et `input` (voir `StructuredCards`).
- **Source** : `src/features/structured/decomposition-card.tsx`.

### PayoffCard

- **Import** : `import { PayoffCard } from "@/features/structured/payoff-card"`.
- **Rôle** : carte « Payoff à l'échéance » : `LineChart` du montant reçu pour le nominal selon la variation du sous-jacent (de −50 % à +60 %), diagonale du sous-jacent en pointillés, note par produit.
- **Props** : `result` et `input` (voir `StructuredCards`).
- **Source** : `src/features/structured/payoff-card.tsx`.

### ObservationsCard

- **Import** : `import { ObservationsCard } from "@/features/structured/observations-card"`.
- **Rôle** : carte « Autocallable · dates d'observation » : prix simulé et erreur standard, barrière de protection, une ligne par année (seuil de rappel, coupon cumulé, probabilité de rappel), ligne d'échéance (probabilité d'y arriver sans rappel), note (trajectoires, seed). Ne rend rien pour une saisie d'un autre produit.
- **Props** :
  - `result` : `AutocallableResult`.
  - `input` : `StructuredInput`.
- **Source** : `src/features/structured/observations-card.tsx`.

### `features/structured/hook.ts`

- **Import** : `import { useStructuredPricing } from "@/features/structured/hook"`.

| Export | Rôle |
| --- | --- |
| `useStructuredPricing()` | Lance la demande (`useCreatePricing`), la lit (`usePricing`) et renvoie `view`, `input`, `result` (`COMPLETED` seulement), `readFailed`, `createError`, `pending` et `submit(values)`. |

### `features/structured/schema.ts`

- **Import** : `import { createStructuredSchema, type StructuredFormValues } from "@/features/structured/schema"`.

| Export | Rôle |
| --- | --- |
| `createStructuredSchema(t)` | Schéma zod traduit : nominal > 0, maturité entière de 1 à 10, taux de 0 à 100 %, volatilité > 0 et ≤ 500 %, niveaux et coupon en pourcentage ; les champs du produit choisi sont exigés. |
| `StructuredFormValues` | Type de la saisie, dérivé du schéma. |
| `StructuredTranslator` | Traducteur de `pages.structured`. |

### `features/structured/utils.ts`

- **Import** : `import { structuredDefaults, toStructuredPricingInput, structuredOf, payoffRows, barSegments } from "@/features/structured/utils"`.

| Export | Rôle |
| --- | --- |
| `structuredDefaults(product)` | Saisie de départ (valeurs de la maquette), coupon propre au produit. |
| `toStructuredPricingInput(values, today?)` | Saisie → corps de `POST /api/pricing` : pourcentages en ratios, date du jour, champs du seul produit choisi, jamais de prix client. |
| `structuredOf(view)` | Entrée et résultat (`COMPLETED`) d'une vue `STRUCTURED` ; `null` pour un autre kind. |
| `payoffRows(payoff, nominal)` | Lignes du graphique : le payoff reçu et la diagonale du sous-jacent. |
| `barSegments(result)` | Segments de la barre de décomposition : briques positives, ou la juste valeur seule si une brique est négative, puis la marge positive. |

### `features/structured/notes.ts`

- **Import** : `import { useStructuredNotes } from "@/features/structured/notes"`.

| Export | Rôle |
| --- | --- |
| `useStructuredNotes()` | `{ decomposition(result, input), payoff(result, input) }` : phrases de bas de carte composées des valeurs du moteur. |

### `features/structured/constants.ts`

- **Import** : `import { STRUCTURED_PRODUCT_TYPES, PRODUCT_FIELDS, … } from "@/features/structured/constants"`.

| Export | Rôle (et unité) |
| --- | --- |
| `STRUCTURED_PRODUCT_TYPES` | Types proposés, dans l'ordre du sélecteur. |
| `STRUCTURED_MATURITY_YEARS` | Bornes de la maturité, en années (miroir du contrat). |
| `STRUCTURED_CURRENCY` | Devise d'affichage (`EUR`). |
| `STRUCTURED_UNDERLYINGS` | Sous-jacents proposés (`value` symbole, `label`). |
| `DEFAULT_STRUCTURED`, `DEFAULT_COUPON_RATE` | Saisie de départ en pourcentages. |
| `PRODUCT_FIELDS` | Champs propres à chaque produit. |
| `FIELD_HINTS` | Entrée de glossaire de l'aide d'un champ. |
| `SEGMENT_COLORS`, `PAYOFF_COLORS` | Couleurs de la barre et du graphique. |

### `features/structured/types.ts`

- **Import** : `import type { StructuredInput, StructuredResult, … } from "@/features/structured/types"`.
- **Rôle** : réexporte les types du contrat `STRUCTURED` (entrée, résultat par produit, brique, point de payoff, observation) ; montants en EUR, niveaux en ratios.
