import type { Allocation, DailyCloses, Risk } from "@azimut/contracts";
import { round, TRADING_DAYS_PER_YEAR } from "@azimut/utils";
import { MIN_COMMON_DAYS } from "../constants/risk.constants";
import { commonDates, correlationMatrix, covarianceMatrix, dailyReturns, historicalVar, riskContributions } from "./risk.utils";

const annualize = (variance: number) => Math.sqrt(Math.max(variance, 0) * TRADING_DAYS_PER_YEAR);

/**
 * Risque d'un portefeuille aux poids cibles constants (D4), sur les rendements journaliers des cours `prices` (en euros),
 * restreints aux jours de cotation communs à tous les actifs. Fonction pure : mêmes entrées, mêmes sorties.
 *
 * Retourne `null` sous `MIN_COMMON_DAYS` jours communs (ou si un actif n'a aucun cours) : aucun résultat partiel (D6, D16).
 * Ratios arrondis à 6 décimales à la publication seulement.
 */
export default function computeRisk(allocations: Allocation[], prices: DailyCloses): Risk | null {
    const series = allocations.map(({ symbol }) => prices[symbol] ?? []);
    const dates = commonDates(series);
    if (dates.length < MIN_COMMON_DAYS) return null;

    const weights = allocations.map(({ weight }) => weight);
    const returns = series.map((points) => dailyReturns(points, dates));
    const cov = covarianceMatrix(returns);
    const portfolioReturns = dates.slice(1).map((_, t) => returns.reduce((sum, asset, i) => sum + weights[i]! * asset[t]!, 0));
    const contributions = riskContributions(weights, cov);
    const portfolioVariance = weights.reduce((sum, weight, i) => sum + weight * weights.reduce((acc, other, j) => acc + other * cov[i]![j]!, 0), 0);
    const { var95, cvar95 } = historicalVar(portfolioReturns);
    const hhi = weights.reduce((sum, weight) => sum + weight * weight, 0);

    return {
        commonDays: dates.length,
        volatility: round(annualize(portfolioVariance), 6),
        var95: round(var95, 6),
        cvar95: round(cvar95, 6),
        assets: allocations.map(({ symbol, weight }, i) => ({
            symbol,
            weight,
            volatility: round(annualize(cov[i]![i]!), 6),
            riskContribution: round(contributions[i]!, 6),
        })),
        correlations: correlationMatrix(cov).map((row) => row.map((value) => round(value, 6))),
        hhi: round(hhi, 6),
        effectiveAssets: round(1 / hhi, 6),
        maxWeight: Math.max(...weights),
    };
}
