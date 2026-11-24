/** Rendement du dividende : somme des montants par titre des 12 derniers mois / spot (même devise), 0 sans dividende. */
export function trailingDividendYield(amounts: number[], spot: number): number {
    return amounts.reduce((sum, amount) => sum + amount, 0) / spot
}
