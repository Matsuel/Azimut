// Intervalle de rafraîchissement d'une demande de pricing `PENDING` (ms) : le calcul d'une obligation dure moins d'une seconde
export const PRICING_POLL_MS = 1_000

// Les taux ne changent qu'en séance : une courbe lue il y a moins de 10 minutes est réutilisée
export const RATE_CURVE_STALE_MS = 10 * 60_000

// Devise d'affichage du nominal et des prix (le calculateur ne pricie qu'en euros, D4)
export const PRICING_CURRENCY = "EUR"

// Bornes de la saisie, miroir de BOND_MATURITY_BOUNDS (contracts), que le web n'importe pas à l'exécution ; le backend reste juge
export const BOND_MATURITY_YEARS = { min: 1, max: 30 } as const

// Clé de carte (`pages.rates.cards.<clé>`) de chaque indice de la courbe
export const RATE_CARD_KEYS = { "^IRX": "irx", "^FVX": "fvx", "^TNX": "tnx", "^TYX": "tyx" } as const

export const BOND_TYPES = ["ZERO", "COUPON"] as const
export const DISCOUNT_SOURCES = ["CURVE", "FLAT"] as const

// Saisie initiale : zéro-coupon de 100 € à 5 ans actualisé à 3 % (référence testée par l'engine : 86,26 €)
export const DEFAULT_BOND = {
    type: "ZERO",
    nominal: 100,
    couponRate: 0,
    maturityYears: 5,
    discountSource: "FLAT",
    flatRate: 3,
} as const

// Saisie d'une option : la maturité se tape en jours, le backend la reçoit en années de 365 jours (182 jours = 182 / 365)
export const DAYS_PER_YEAR = 365

// Miroir de OPTION_MATURITY_MAX_YEARS (contracts), que le web n'importe pas à l'exécution ; le backend reste juge
export const OPTION_MATURITY_MAX_DAYS = 30 * DAYS_PER_YEAR

// Maturité proposée au départ (jours) : un semestre
export const DEFAULT_OPTION_MATURITY_DAYS = 182

// Indice Yahoo du taux 13 semaines, pré-remplissage du taux sans risque (D4)
export const RISK_FREE_SYMBOL = "^IRX"

// Devise d'affichage d'une option saisie sans symbole (les montants sont dans la devise du sous-jacent, jamais convertis)
export const OPTION_DEFAULT_CURRENCY = "USD"

// Couleur de la courbe de chaque échéance du smile, dans l'ordre des échéances (3 au plus, SMILE_EXPIRATIONS du contrat)
export const SMILE_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-4)"] as const

// Libellé (`pages.optionChain.status.<clé>`) et variant de `Badge` de chaque statut d'une cotation
export const QUOTE_STATUS_BADGES = {
    KEPT: { key: "kept", variant: "success" },
    NO_BID_ASK: { key: "noBidAsk", variant: "outline" },
    NO_PRICE: { key: "noPrice", variant: "outline" },
    IV_OUT_OF_BOUNDS: { key: "ivOutOfBounds", variant: "outline" },
} as const

// Lignes par page de la grille de payoff et de la chaîne : plus courtes que `PAGE_SIZE`, les cartes sont étroites
export const OPTION_TABLE_PAGE_SIZE = 10
