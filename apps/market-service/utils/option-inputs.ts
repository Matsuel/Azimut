import { TRADING_DAYS_PER_YEAR } from "@azimut/utils";
import { OPTION_INPUTS_MIN_RETURNS } from "../constants/market.constants";

/**
 * Volatilité annualisée d'une série de clôtures (dans l'ordre chronologique) : écart-type échantillon des rendements
 * logarithmiques journaliers × √252. `null` sous `OPTION_INPUTS_MIN_RETURNS` rendements exploitables (historique trop court),
 * ou si la série est plate : une volatilité nulle ne peut pas servir au pricing.
 */
export function historicalVolatility(closes: number[]): number | null {
    const returns: number[] = []
    for (let i = 1; i < closes.length; i++) {
        const previous = closes[i - 1]!
        const current = closes[i]!
        if (previous > 0 && current > 0) returns.push(Math.log(current / previous))
    }
    if (returns.length < OPTION_INPUTS_MIN_RETURNS) return null

    const mean = returns.reduce((sum, value) => sum + value, 0) / returns.length
    const variance = returns.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (returns.length - 1)
    const volatility = Math.sqrt(variance * TRADING_DAYS_PER_YEAR)
    return volatility > 0 ? volatility : null
}

/** Rendement du dividende : somme des montants par titre des 12 derniers mois / spot (même devise), 0 sans dividende. */
export function trailingDividendYield(amounts: number[], spot: number): number {
    return amounts.reduce((sum, amount) => sum + amount, 0) / spot
}
