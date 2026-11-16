// Limite de drawdown saisie, en pourcent entier : miroir de RISK_LIMIT_BOUNDS (contracts, en ratio), que le web
// n'importe pas à l'exécution ; le backend reste juge (400 INVALID_RISK_LIMIT)
export const RISK_LIMIT_PERCENT = { min: 1, max: 99 } as const
