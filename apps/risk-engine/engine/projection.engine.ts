import type { Allocation, DailyCloses, Projection, ProjectionPoint, ProjectionYear } from "@azimut/contracts";
import { PROJECTION_PARAMS } from "@azimut/contracts";
import { round, TRADING_DAYS_PER_YEAR } from "@azimut/utils";
import { MIN_COMMON_DAYS } from "../constants/risk.constants";
import { mulberry32, percentile } from "./projection.utils";
import { commonDates, dailyReturns, portfolioReturns } from "./risk.utils";

/**
 * Projection Monte Carlo d'un portefeuille aux poids cibles constants, par bootstrap de blocs de `PROJECTION_PARAMS.blockDays`
 * jours tirés dans l'historique commun des cours `prices` (en euros). Fonction pure : mêmes entrées et même `seed`,
 * mêmes sorties (les blocs sont tirés dans l'ordre fixe trajectoire puis bloc).
 *
 * Retourne `null` sous `MIN_COMMON_DAYS` jours communs (ou si un actif n'a aucun cours). Valeurs en EUR arrondies à 2 décimales,
 * `lossProbability` (ratio 0..1, part des chemins strictement sous `capital`) à 6, à la construction du résultat seulement.
 */
export default function computeProjection(allocations: Allocation[], prices: DailyCloses, capital: number, seed: number): Projection | null {
    const series = allocations.map(({ symbol }) => prices[symbol] ?? []);
    const dates = commonDates(series);
    if (dates.length < MIN_COMMON_DAYS) return null;

    const weights = allocations.map(({ weight }) => weight);
    const returns = Float64Array.from(portfolioReturns(weights, series.map((points) => dailyReturns(points, dates))));
    const { paths, blockDays, horizonYears } = PROJECTION_PARAMS;
    const starts = returns.length - blockDays + 1;
    const values = new Float64Array(paths).fill(capital);
    const rng = mulberry32(seed);

    const toPoint = (day: number): ProjectionPoint => {
        const sorted = values.slice().sort();
        const at = (p: number) => round(percentile(sorted, p), 2);
        return { day, p5: at(0.05), p10: at(0.1), p25: at(0.25), p50: at(0.5), p75: at(0.75), p90: at(0.9), p95: at(0.95) };
    };

    const points: ProjectionPoint[] = [toPoint(0)];
    const years: ProjectionYear[] = [];
    for (let block = 0; block < (horizonYears * TRADING_DAYS_PER_YEAR) / blockDays; block++) {
        for (let path = 0; path < paths; path++) {
            const start = Math.floor(rng() * starts);
            let value = values[path]!;
            for (let d = 0; d < blockDays; d++) value *= 1 + returns[start + d]!;
            values[path] = value;
        }
        const day = (block + 1) * blockDays;
        const point = toPoint(day);
        points.push(point);
        if (day % TRADING_DAYS_PER_YEAR === 0) {
            const losses = values.reduce((count, value) => count + (value < capital ? 1 : 0), 0);
            years.push({ ...point, years: day / TRADING_DAYS_PER_YEAR, lossProbability: round(losses / paths, 6) });
        }
    }

    return { seed, paths, blockDays, capital, historyStart: dates[0]!, historyEnd: dates[dates.length - 1]!, historyDays: dates.length, points, years };
}
