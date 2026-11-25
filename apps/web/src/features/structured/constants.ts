import type { GlossaryKey } from "@/constants/glossary"
import type { StructuredProduct } from "./types"

// Types de produit proposés, dans l'ordre du sélecteur : miroir de STRUCTURED_PRODUCTS (contracts), que le web n'importe pas à l'exécution
export const STRUCTURED_PRODUCT_TYPES = [
    "CAPITAL_GUARANTEED",
    "REVERSE_CONVERTIBLE",
    "AUTOCALLABLE",
] as const satisfies readonly StructuredProduct[]

// Bornes de la maturité, miroir de STRUCTURED_MATURITY_BOUNDS (contracts) ; le backend reste juge
export const STRUCTURED_MATURITY_YEARS = { min: 1, max: 10 } as const

// Devise d'affichage : le produit est calculé en euros sur un nominal, jamais converti
export const STRUCTURED_CURRENCY = "EUR"

// Sous-jacents proposés : le libellé accompagne la demande, le prix se calcule en pourcentage du niveau initial (volatilité saisie), sans lecture de cours
export const STRUCTURED_UNDERLYINGS = [
    { value: "^STOXX50E", label: "Euro Stoxx 50" },
    { value: "^FCHI", label: "CAC 40" },
    { value: "^GSPC", label: "S&P 500" },
]

// Saisie initiale (pourcentages saisis, pas des ratios) : valeurs de la maquette 39
export const DEFAULT_STRUCTURED = {
    underlying: "^STOXX50E",
    nominal: 1000,
    maturityYears: 5,
    rate: 3,
    volatility: 18,
    guarantee: 100,
    callStrike: 100,
    putStrike: 100,
    recallLevel: 100,
    protectionBarrier: 60,
} as const

// Coupon annuel proposé selon le produit (pourcentage du nominal) : il change quand on change de type
export const DEFAULT_COUPON_RATE = { REVERSE_CONVERTIBLE: 4, AUTOCALLABLE: 6 } as const

// Champs propres à chaque produit : seuls ceux-là sont affichés et exigés
export const PRODUCT_FIELDS = {
    CAPITAL_GUARANTEED: ["guarantee", "callStrike"],
    REVERSE_CONVERTIBLE: ["couponRate", "putStrike"],
    AUTOCALLABLE: ["couponRate", "recallLevel", "protectionBarrier"],
} as const satisfies Record<StructuredProduct, readonly string[]>

// Couleur de chaque segment de la barre de décomposition et de sa légende
export const SEGMENT_COLORS = {
    ZERO_COUPON: "var(--chart-1)",
    BOND: "var(--chart-1)",
    CALL: "var(--chart-2)",
    AUTOCALL_NET_COUPONS: "var(--chart-2)",
    PUT: "var(--chart-4)",
    FAIR_VALUE: "var(--chart-1)",
    MARGIN: "var(--muted-foreground)",
} as const

export const PAYOFF_COLORS = { product: "var(--chart-1)", underlying: "var(--muted-foreground)" } as const

// Aide (`InfoHint`) du libellé d'un champ de saisie : seuls les paramètres qui changent le calcul sans se lire d'eux-mêmes en ont une
export const FIELD_HINTS = {
    recallLevel: "structuredRecallLevel",
    protectionBarrier: "structuredProtectionBarrier",
} as const satisfies Partial<Record<string, GlossaryKey>>
