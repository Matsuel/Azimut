import type { StructuredBasketMode, StructuredInput } from "@azimut/contracts";
import { mulberry32, standardNormal } from "@azimut/utils";
import { PayoffStats } from "./options.mc";

/** Valeurs de marché d'un sous-jacent : volatilité annuelle et rendement du dividende continu, en ratios. */
export interface Asset {
    volatility: number;
    dividendYield: number;
}

/** Sous-jacents d'un produit, qu'il soit sur un titre ou sur un panier (D13) : la forme que lit tout le calcul. */
export interface Underlyings {
    assets: Asset[];
    /** Matrice carrée symétrique de diagonale 1 ; `[[1]]` pour un sous-jacent unique. */
    correlations: number[][];
    /** Agrégat du panier ; `null` pour un sous-jacent unique, dont le niveau est celui de l'agrégat. */
    mode: StructuredBasketMode | null;
}

/** Sous-jacents du produit : le panier s'il y en a un, sinon le sous-jacent unique des champs communs. */
export function resolveUnderlyings({ basket, volatility, dividendYield }: StructuredInput): Underlyings {
    if (!basket) return { assets: [{ volatility, dividendYield }], correlations: [[1]], mode: null };
    return { assets: basket.underlyings.map(({ volatility, dividendYield }) => ({ volatility, dividendYield })), correlations: basket.correlations, mode: basket.mode };
}

/**
 * Facteur de Cholesky `L` (triangulaire inférieure, `L·Lᵗ = matrice`) : il corrèle des tirages indépendants. Une matrice semi-définie
 * (deux sous-jacents corrélés à 1) est acceptée, le pivot nul donne une colonne nulle. Lève si la matrice n'est pas semi-définie positive.
 */
export function cholesky(matrix: number[][]): number[][] {
    const size = matrix.length;
    const lower = Array.from({ length: size }, () => new Array<number>(size).fill(0));
    for (let i = 0; i < size; i++) {
        for (let j = 0; j <= i; j++) {
            let sum = matrix[i]![j]!;
            for (let k = 0; k < j; k++) sum -= lower[i]![k]! * lower[j]![k]!;
            if (i === j) {
                if (sum < -1e-9) throw new Error("Correlation matrix is not positive semi-definite");
                lower[i]![j] = Math.sqrt(Math.max(sum, 0));
            } else {
                lower[i]![j] = lower[j]![j]! > 1e-12 ? sum / lower[j]![j]! : 0;
            }
        }
    }
    return lower;
}

/** Niveau de l'agrégat du panier, en ratio du niveau initial de chaque sous-jacent : pire, meilleur ou moyenne. */
export function aggregate(mode: StructuredBasketMode | null, levels: number[]): number {
    if (mode === "WORST_OF") return Math.min(...levels);
    if (mode === "BEST_OF") return Math.max(...levels);
    if (mode === "AVERAGE") return levels.reduce((total, level) => total + level, 0) / levels.length;
    return levels[0]!;
}

/**
 * Tirages normaux corrélés : à chaque appel, un vecteur `L·z` où `z` vient de `draw` dans l'ordre des sous-jacents. Le vecteur retourné est
 * réutilisé d'un appel à l'autre. Avec un seul sous-jacent, `L = [[1]]` : la suite de tirages est celle de `draw`, à l'identique.
 */
export function correlatedDraws(draw: () => number, lower: number[][]): () => number[] {
    const size = lower.length;
    const independent = new Array<number>(size).fill(0);
    const correlated = new Array<number>(size).fill(0);
    return () => {
        for (let i = 0; i < size; i++) independent[i] = draw();
        for (let i = 0; i < size; i++) {
            let sum = 0;
            for (let j = 0; j <= i; j++) sum += lower[i]![j]! * independent[j]!;
            correlated[i] = sum;
        }
        return correlated;
    };
}

/**
 * Call et put sur l'agrégat d'un panier, au même strike (ratio du niveau initial), par simulation du niveau final (D13) : GBM neutre au
 * risque, dérive `r − qᵢ − σᵢ²/2`, tirages corrélés par Cholesky. Valeurs actualisées en ratio du nominal ; `rate` est le taux continu.
 * Mêmes paramètres et même `seed`, mêmes sorties.
 */
export function basketOptions(
    { assets, correlations, mode }: Underlyings,
    { rate, years, strike, seed, paths }: { rate: number; years: number; strike: number; seed: number; paths: number },
): { call: number; put: number } {
    const draw = correlatedDraws(standardNormal(mulberry32(seed)), cholesky(correlations));
    const drifts = assets.map(({ volatility, dividendYield }) => (rate - dividendYield - (volatility * volatility) / 2) * years);
    const diffusions = assets.map(({ volatility }) => volatility * Math.sqrt(years));

    const calls = new PayoffStats();
    const puts = new PayoffStats();
    const levels = new Array<number>(assets.length).fill(0);
    for (let path = 0; path < paths; path++) {
        const z = draw();
        for (let i = 0; i < assets.length; i++) levels[i] = Math.exp(drifts[i]! + diffusions[i]! * z[i]!);
        const level = aggregate(mode, levels);
        calls.add(Math.max(level - strike, 0));
        puts.add(Math.max(strike - level, 0));
    }
    const discount = Math.exp(-rate * years);
    return { call: calls.estimate(paths, discount).price, put: puts.estimate(paths, discount).price };
}
