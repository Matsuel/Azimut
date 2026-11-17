import type { DailyCloses } from "@azimut/contracts";
import { REFERENCE_CURRENCY, fxPairSymbol, rateOn } from "@azimut/utils";
import { VAR_CONFIDENCE } from "../constants/risk.constants";

/**
 * Cours convertis en euros au taux du jour : `euros = cours local / taux`, `taux` = unités de devise pour 1 €.
 * Taux du jour = dernier taux connu à cette date, ou le premier de la série si elle le précède.
 * Un symbole coté en euros ou sans devise connue reste inchangé. Lève une erreur si le taux d'une devise manque.
 */
export function toEuros(prices: DailyCloses, currencies: Record<string, string>, fxRates: DailyCloses): DailyCloses {
    const converted: DailyCloses = {};
    for (const [symbol, series] of Object.entries(prices)) {
        const currency = currencies[symbol];
        if (!currency || currency === REFERENCE_CURRENCY) {
            converted[symbol] = series;
            continue;
        }
        const rates = fxRates[fxPairSymbol(currency)];
        if (!rates?.length) throw new Error(`No market data for ${fxPairSymbol(currency)}`);
        converted[symbol] = series.map(({ date, close }) => ({ date, close: close / rateOn(rates, date) }));
    }
    return converted;
}

/** Jours de cotation présents dans toutes les séries, triés ; vide sans série. */
export function commonDates(series: { date: string }[][]): string[] {
    const [first, ...others] = series;
    if (!first) return [];
    const sets = others.map((points) => new Set(points.map((point) => point.date)));
    return first.map((point) => point.date).filter((date) => sets.every((set) => set.has(date)));
}

/** Rendements journaliers `close[t] / close[t−1] − 1` d'une série restreinte à `dates` (triées) ; `dates.length − 1` valeurs. */
export function dailyReturns(series: { date: string; close: number }[], dates: string[]): number[] {
    const closes = new Map(series.map(({ date, close }) => [date, close]));
    return dates.slice(1).map((date, i) => closes.get(date)! / closes.get(dates[i]!)! - 1);
}

const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;

/** Covariance d'échantillon (n − 1) de deux séries de même longueur ≥ 2. */
export function covariance(a: number[], b: number[]): number {
    const meanA = mean(a);
    const meanB = mean(b);
    return a.reduce((sum, value, i) => sum + (value - meanA) * (b[i]! - meanB), 0) / (a.length - 1);
}

/** Matrice de covariance des séries, dans leur ordre. */
export const covarianceMatrix = (returns: number[][]) => returns.map((a) => returns.map((b) => covariance(a, b)));

/**
 * Corrélation de Pearson déduite de la covariance : `cov(i, j) / (σᵢ σⱼ)`, entre −1 et 1, diagonale 1.
 * Une série constante (σ = 0) n'est corrélée à aucune autre : 0 hors diagonale.
 */
export function correlationMatrix(cov: number[][]): number[][] {
    return cov.map((row, i) =>
        row.map((value, j) => {
            if (i === j) return 1;
            const scale = Math.sqrt(cov[i]![i]! * cov[j]![j]!);
            return scale === 0 ? 0 : Math.max(-1, Math.min(1, value / scale));
        }),
    );
}

/**
 * VaR et CVaR historiques à `VAR_CONFIDENCE`, un jour : avec `k = ceil((1 − confiance) × n)`, la VaR est le `k`-ième plus petit
 * rendement et la CVaR la moyenne des `k` plus petits. Ratios (une perte est négative). `returns` non vide.
 */
export function historicalVar(returns: number[]): { var95: number; cvar95: number } {
    const sorted = [...returns].sort((a, b) => a - b);
    // Le décalage évite qu'un 0,05 × n flottant (ex. 5,000000000000001) fasse passer k au rang suivant
    const k = Math.ceil((1 - VAR_CONFIDENCE) * sorted.length - 1e-9);
    return { var95: sorted[k - 1]!, cvar95: mean(sorted.slice(0, k)) };
}

/**
 * Part de la variance du portefeuille portée par chaque actif : `wᵢ (Σw)ᵢ / σ²`, somme = 1.
 * Variance nulle : la part de chaque actif est son poids.
 */
export function riskContributions(weights: number[], cov: number[][]): number[] {
    const marginal = cov.map((row) => row.reduce((sum, value, j) => sum + value * weights[j]!, 0));
    const variance = weights.reduce((sum, weight, i) => sum + weight * marginal[i]!, 0);
    return weights.map((weight, i) => (variance === 0 ? weight : (weight * marginal[i]!) / variance));
}

/**
 * Rendement du portefeuille chaque jour : somme des rendements des actifs pondérés par `weights` (poids constants).
 * `returns[i][t]` = rendement de l'actif `i` le jour `t` ; retourne autant de valeurs que de jours.
 */
export function portfolioReturns(weights: number[], returns: number[][]): number[] {
    return (returns[0] ?? []).map((_, t) => returns.reduce((sum, asset, i) => sum + weights[i]! * asset[t]!, 0));
}
