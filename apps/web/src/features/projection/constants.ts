// Horizons proposés, en années : miroir de HORIZON_YEARS (contracts), que le web n'importe pas à l'exécution
export const HORIZON_YEARS = [1, 3, 5, 10] as const

export const DEFAULT_PROJECTION_HORIZON = 5

// Jours ouvrés par année de la projection : miroir de TRADING_DAYS_PER_YEAR (utils), pour l'axe X du graphique
export const PROJECTION_DAYS_PER_YEAR = 252

// Après la fin d'un backtest, risk-engine publie la projection quelques secondes plus tard : la page la rafraîchit pendant ce délai
export const PROJECTION_WAIT_MS = 2 * 60_000
export const PROJECTION_POLL_MS = 2000
