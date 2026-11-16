// Limite de drawdown saisie, en pourcent entier : miroir de RISK_LIMIT_BOUNDS (contracts, en ratio), que le web
// n'importe pas à l'exécution ; le backend reste juge (400 INVALID_RISK_LIMIT)
export const RISK_LIMIT_PERCENT = { min: 1, max: 99 } as const

// Après la fin d'un backtest, risk-engine publie le risque quelques secondes plus tard : l'écran le rafraîchit pendant
// `RESULT_WAIT_MS` (le serveur n'expire pas cette attente)
export const RESULT_WAIT_MS = 2 * 60_000
