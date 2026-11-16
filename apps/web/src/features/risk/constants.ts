// Limite de drawdown saisie, en pourcent entier : miroir de RISK_LIMIT_BOUNDS (contracts, en ratio), que le web
// n'importe pas à l'exécution ; le backend reste juge (400 INVALID_RISK_LIMIT)
export const RISK_LIMIT_PERCENT = { min: 1, max: 99 } as const

// Backtests terminés proposés par « Choisir un backtest » (les plus récents)
export const RISK_PICKER_LIMIT = 50

// Après la fin d'un backtest, risk-engine publie le risque quelques secondes plus tard : la page le rafraîchit pendant ce délai
export const RISK_WAIT_MS = 2 * 60_000
export const RISK_POLL_MS = 2000
