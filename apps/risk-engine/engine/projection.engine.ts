import type { Allocation, DailyCloses, Projection, ProjectionPoint, ProjectionYear } from "@azimut/contracts";
import { PROJECTION_PARAMS } from "@azimut/contracts";
import { mulberry32, round, TRADING_DAYS_PER_YEAR } from "@azimut/utils";
import { MIN_PROJECTION_DAYS } from "../constants/risk.constants";
import { percentile } from "./projection.utils";
import { commonDates, dailyReturns, portfolioReturns } from "./risk.utils";

/**
 * Projection Monte Carlo d'un portefeuille aux poids cibles constants, par bootstrap de blocs de jours tirés dans
 * l'historique commun des cours `prices` (en euros). Fonction pure : mêmes entrées et même `seed`, mêmes sorties
 * (ordre de tirage fixe : jour puis trajectoire, un tirage par trajectoire au début de chaque bloc).
 *
 * Retourne `null` sous 2 jours communs (aucun rendement) ou si un actif n'a aucun cours (D12). Un historique court donne
 * une projection peu précise : les blocs font `min(PROJECTION_PARAMS.blockDays, rendements disponibles)` jours, longueur
 * reprise dans `blockDays`. Un point tous les `PROJECTION_PARAMS.blockDays` jours, une année tous les 252 jours.
 * Valeurs en EUR arrondies à 2 décimales, `lossProbability` (ratio 0..1, part des chemins strictement sous `capital`)
 * à 6, à la construction du résultat seulement.
 */
export default function computeProjection(allocations: Allocation[], prices: DailyCloses, capital: number, seed: number): Projection | null {
    const series = allocations.map(({ symbol }) => prices[symbol] ?? []);
    const dates = commonDates(series);
    if (dates.length < MIN_PROJECTION_DAYS) return null;

    const weights = allocations.map(({ weight }) => weight);
    const returns = Float64Array.from(portfolioReturns(weights, series.map((points) => dailyReturns(points, dates))));
    const { paths, horizonYears } = PROJECTION_PARAMS;
    const blockDays = Math.min(PROJECTION_PARAMS.blockDays, returns.length);
    const starts = new Int32Array(paths);
    const startRange = returns.length - blockDays + 1;
    const values = new Float64Array(paths).fill(capital);
    const rng = mulberry32(seed);

    const toPoint = (day: number): ProjectionPoint => {
        const sorted = values.slice().sort();
        const at = (p: number) => round(percentile(sorted, p), 2);
        return { day, p5: at(0.05), p10: at(0.1), p25: at(0.25), p50: at(0.5), p75: at(0.75), p90: at(0.9), p95: at(0.95) };
    };

    const points: ProjectionPoint[] = [toPoint(0)];
    const years: ProjectionYear[] = [];
    for (let day = 1; day <= horizonYears * TRADING_DAYS_PER_YEAR; day++) {
        const offset = (day - 1) % blockDays;
        for (let path = 0; path < paths; path++) {
            if (offset === 0) starts[path] = Math.floor(rng() * startRange);
            values[path] = values[path]! * (1 + returns[starts[path]! + offset]!);
        }
        if (day % PROJECTION_PARAMS.blockDays !== 0) continue;
        const point = toPoint(day);
        points.push(point);
        if (day % TRADING_DAYS_PER_YEAR === 0) {
            let losses = 0;
            for (let path = 0; path < paths; path++) if (values[path]! < capital) losses++;
            years.push({ ...point, years: day / TRADING_DAYS_PER_YEAR, lossProbability: round(losses / paths, 6) });
        }
    }

    return { seed, paths, blockDays, capital, historyStart: dates[0]!, historyEnd: dates[dates.length - 1]!, historyDays: dates.length, points, years };
}
