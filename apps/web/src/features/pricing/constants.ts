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
