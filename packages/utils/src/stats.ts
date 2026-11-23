import { TRADING_DAYS_PER_YEAR } from "./period";

// Rendements journaliers (environ un mois de cotation) sous lesquels la volatilité historique n'est pas estimée
export const HISTORICAL_VOLATILITY_MIN_RETURNS = 20;

/**
 * Médiane d'une liste de nombres non vide (non triée acceptée, l'entrée n'est pas modifiée) : moyenne des deux valeurs
 * centrales si le nombre est pair. Une liste vide n'a pas de médiane : le résultat est `NaN`.
 */
export const median = (values: number[]) => {
    const sorted = [...values].sort((a, b) => a - b);
    const middle = sorted.length >> 1;
    return sorted.length % 2 ? sorted[middle]! : (sorted[middle - 1]! + sorted[middle]!) / 2;
};

/**
 * Arrondit au nombre de décimales demandé (2 pour un montant, 4 pour un cours, 6 pour un ratio ou une quantité).
 * À n'appliquer qu'aux valeurs publiées : les cumuls se font sur les valeurs non arrondies.
 */
export const round = (value: number, decimals: number) => {
    const factor = 10 ** decimals;
    return Math.round(value * factor) / factor;
};

/**
 * Volatilité annualisée d'une série de clôtures (dans l'ordre chronologique) : écart-type échantillon des rendements
 * logarithmiques journaliers × √252. `null` sous `HISTORICAL_VOLATILITY_MIN_RETURNS` rendements exploitables (historique trop court),
 * ou si la série est plate : une volatilité nulle ne peut pas servir au pricing.
 */
export function historicalVolatility(closes: number[]): number | null {
    const returns: number[] = [];
    for (let i = 1; i < closes.length; i++) {
        const previous = closes[i - 1]!;
        const current = closes[i]!;
        if (previous > 0 && current > 0) returns.push(Math.log(current / previous));
    }
    if (returns.length < HISTORICAL_VOLATILITY_MIN_RETURNS) return null;

    const mean = returns.reduce((sum, value) => sum + value, 0) / returns.length;
    const variance = returns.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (returns.length - 1);
    const volatility = Math.sqrt(variance * TRADING_DAYS_PER_YEAR);
    return volatility > 0 ? volatility : null;
}
