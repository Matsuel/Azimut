import type { Period } from "@azimut/contracts";

export const DEFAULT_TICKERS = [
    "AAPL",    // Apple
    "MSFT",    // Microsoft
    "NVDA",    // NVIDIA
    "AMZN",    // Amazon
    "GOOGL",   // Alphabet
    "TSLA",    // Tesla
    "META",    // Meta
    "JPM",     // JPMorgan
    "BTC-USD", // Bitcoin
    "KO",      // Coca-Cola
    "AZN.L",   // AstraZeneca
    "HSBA.L",  // HSBC
    "MC.PA",   // LVMH
    "TTE.PA",  // TotalEnergies
    "^GSPC",   // S&P 500
];
const MINUTE_MS = 60_000;

// Nombre maximal d'entrées du cache mémoire
export const CACHE_MAX_ENTRIES = 500;

// Durée de garde en cache des réponses du fournisseur : la recherche change peu, un historique court se périme plus vite qu'un long
export const SEARCH_CACHE_TTL_MS = 10 * MINUTE_MS;
export const ASSETS_CACHE_TTL_MS = MINUTE_MS;
export const DETAILS_CACHE_TTL_MS: Record<Period, number> = {
    "1d": MINUTE_MS,
    "1w": 5 * MINUTE_MS,
    "1m": 30 * MINUTE_MS,
    "1y": 60 * MINUTE_MS,
    max: 6 * 60 * MINUTE_MS,
};

// Courbe des taux US : un indice Yahoo par maturité fixe (années). Yahoo les cote en pourcentage (4.21 = 4,21 %)
export const RATE_CURVE_SYMBOLS = [
    { symbol: "^IRX", maturityYears: 0.25 },
    { symbol: "^FVX", maturityYears: 5 },
    { symbol: "^TNX", maturityYears: 10 },
    { symbol: "^TYX", maturityYears: 30 },
] as const;
export const RATE_CURVE_CURRENCY = "USD";
// Les taux ne bougent qu'en séance : une demi-heure de cache évite de rappeler Yahoo à chaque calcul
export const RATES_CACHE_TTL_MS = 30 * MINUTE_MS;

// Contrôle du fournisseur par `/readiness` (D10) : un symbole liquide toujours coté, un délai sous les 2 s de l'agrégation
// de core-backend, et un résultat (succès ou échec) gardé une minute pour ne pas marteler Yahoo à chaque sonde
export const PROVIDER_PROBE_SYMBOL = "SPY";
export const PROVIDER_PROBE_TIMEOUT_MS = 1_500;
export const PROVIDER_PROBE_CACHE_TTL_MS = MINUTE_MS;

// Devises cotées en sous-unité par Yahoo (pence, agorot, cents) : devise principale et nombre de sous-unités qu'elle contient
export const CURRENCY_SUBUNITS: Record<string, { currency: string; divisor: number }> = {
    GBp: { currency: "GBP", divisor: 100 },
    GBX: { currency: "GBP", divisor: 100 },
    ILA: { currency: "ILS", divisor: 100 },
    ZAc: { currency: "ZAR", divisor: 100 },
};

// Préremplissage du calculateur d'option (D4) : fenêtre d'un an (clôtures et dividendes)
export const OPTION_INPUTS_WINDOW_YEARS = 1;
