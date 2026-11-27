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

/** Clôture datée (`date` `YYYY-MM-DD`) d'une série journalière. */
export interface DatedClose {
    date: string;
    close: number;
}

/**
 * Matrice de corrélation de Pearson (valeurs entre -1 et 1, arrondies à 4 décimales, diagonale 1, symétrique) des rendements
 * logarithmiques journaliers de chaque série, calculés entre dates communes consécutives : seules les dates présentes dans toutes les
 * séries comptent, un rendement n'est jamais pris à cheval sur une date manquante d'une série. Les clôtures sont dans la même
 * devise de cotation, ordre quelconque. `null` si moins de `minReturns` rendements communs, si une clôture n'est pas positive
 * ou si une série est plate (corrélation indéfinie) : on ne renvoie jamais une corrélation inventée.
 */
export function returnsCorrelation(series: DatedClose[][], minReturns: number): number[][] | null {
    if (series.length === 0) return null;

    const byDate = series.map((points) => new Map(points.map((point) => [point.date, point.close])));
    const dates = [...byDate[0]!.keys()].filter((date) => byDate.every((closes) => closes.has(date))).sort();
    if (dates.length - 1 < Math.max(minReturns, 2)) return null;

    const returns: number[][] = [];
    for (const closes of byDate) {
        const values: number[] = [];
        for (let i = 1; i < dates.length; i++) {
            const previous = closes.get(dates[i - 1]!)!;
            const current = closes.get(dates[i]!)!;
            if (!(previous > 0 && current > 0)) return null;
            values.push(Math.log(current / previous));
        }
        returns.push(values);
    }

    const means = returns.map((values) => values.reduce((sum, value) => sum + value, 0) / values.length);
    const deviations = returns.map((values, i) => values.map((value) => value - means[i]!));
    const norms = deviations.map((values) => Math.sqrt(values.reduce((sum, value) => sum + value * value, 0)));
    if (norms.some((norm) => norm === 0)) return null;

    const matrix = series.map(() => series.map(() => 1));
    for (let i = 0; i < series.length; i++) {
        for (let j = i + 1; j < series.length; j++) {
            const dot = deviations[i]!.reduce((sum, value, k) => sum + value * deviations[j]![k]!, 0);
            // Le plafond absorbe l'erreur d'arrondi flottant qui donnerait 1.0000000000000002
            const correlation = round(Math.max(-1, Math.min(1, dot / (norms[i]! * norms[j]!))), 4);
            matrix[i]![j] = correlation;
            matrix[j]![i] = correlation;
        }
    }
    return matrix;
}
