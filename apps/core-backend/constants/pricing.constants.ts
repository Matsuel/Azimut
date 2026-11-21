// Une demande `PENDING` plus ancienne que cela est déclarée échouée à sa lecture : le calcul d'une obligation dure moins
// d'une seconde, donc backtest-engine est arrêté ou le message s'est perdu
export const PRICING_TIMEOUT_MS = 2 * 60_000

// Cause enregistrée sur une demande expirée
export const PRICING_TIMEOUT_REASON = "Pricing timed out: no answer from the pricing worker"
