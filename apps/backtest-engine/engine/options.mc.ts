import type { MonteCarloEstimate, OptionMonteCarloInput, OptionMonteCarloResult } from "@azimut/contracts";
import { mulberry32, round, standardNormal } from "@azimut/utils";
import {
    MONTE_CARLO_CONVERGENCE_FRACTIONS,
    MONTE_CARLO_SAMPLE_PATHS,
    MONTE_CARLO_VALIDATION_STD_ERRORS,
    MONTE_CARLO_ZERO_ERROR_TOLERANCE,
} from "../constants/pricing.constants";
import { blackScholes, DAYS_PER_YEAR, payoff } from "./options";

/** Somme et somme des carrés de payoffs, de quoi donner la moyenne et l'erreur standard sans stocker les trajectoires. */
export class PayoffStats {
    sum = 0;
    squares = 0;

    add(value: number) {
        this.sum += value;
        this.squares += value * value;
    }

    /** Prix actualisé et erreur standard (écart-type échantillon / √n) de `count` payoffs ; `discount` = e^(−rT). */
    estimate(count: number, discount: number): MonteCarloEstimate {
        const mean = this.sum / count;
        // Max 0 : l'arrondi flottant peut rendre une variance nulle légèrement négative
        const variance = Math.max(0, ((this.squares / count - mean * mean) * count) / (count - 1));
        return { price: discount * mean, standardError: (discount * Math.sqrt(variance)) / Math.sqrt(count) };
    }
}

const publish = ({ price, standardError }: MonteCarloEstimate): MonteCarloEstimate => ({ price: round(price, 4), standardError: round(standardError, 4) });

/**
 * Price par simulation un call vanille et ses deux versions à barrière (knock-out et knock-in) sur les **mêmes** trajectoires (20) :
 * GBM sous la mesure neutre au risque (dérive r − q, D1), un pas par jour calendaire, barrière surveillée à chaque clôture (D2).
 * Un knock-out et un knock-in sur la même trajectoire se complètent : knock-out + knock-in = vanille, exactement.
 * Fonction pure : mêmes paramètres et même `seed`, mêmes sorties. Lève si la barrière est égale au spot (touchée dès le jour 0) ou si
 * les paramètres sortent de la plage numérique de Black-Scholes (référence de la validation).
 */
export function priceOptionMonteCarlo(input: OptionMonteCarloInput, seed: number): OptionMonteCarloResult {
    const { spot, strike, maturityYears, rate, dividendYield, volatility, barrier, paths } = input;
    if (barrier === spot) throw new Error("Barrier must differ from the spot");
    const direction = barrier < spot ? "DOWN" : "UP";
    const reference = blackScholes(input).call;
    if (!Number.isFinite(reference)) throw new Error("Option parameters out of numeric range");

    const steps = Math.max(1, Math.round(maturityYears * DAYS_PER_YEAR));
    const dt = maturityYears / steps;
    const drift = (rate - dividendYield - (volatility * volatility) / 2) * dt;
    const diffusion = volatility * Math.sqrt(dt);
    const discount = Math.exp(-rate * maturityYears);
    const draw = standardNormal(mulberry32(seed));

    const vanilla = new PayoffStats();
    const knockOut = new PayoffStats();
    const knockIn = new PayoffStats();
    const checkpoints = new Map(MONTE_CARLO_CONVERGENCE_FRACTIONS.map((fraction) => [Math.round(paths * fraction), null as MonteCarloEstimate | null]));
    const sample: OptionMonteCarloResult["sample"] = [];

    for (let path = 0; path < paths; path++) {
        const illustrated = path < MONTE_CARLO_SAMPLE_PATHS ? [round(spot, 2)] : null;
        let price = spot;
        let touched = false;
        for (let step = 0; step < steps; step++) {
            price *= Math.exp(drift + diffusion * draw());
            if (direction === "DOWN" ? price <= barrier : price >= barrier) touched = true;
            illustrated?.push(round(price, 2));
        }
        const value = payoff("CALL", price, strike);
        vanilla.add(value);
        knockOut.add(touched ? 0 : value);
        knockIn.add(touched ? value : 0);
        if (illustrated) sample.push({ touched, prices: illustrated });
        if (checkpoints.has(path + 1)) checkpoints.set(path + 1, vanilla.estimate(path + 1, discount));
    }

    const vanillaEstimate = vanilla.estimate(paths, discount);
    const knockOutEstimate = knockOut.estimate(paths, discount);
    const knockInEstimate = knockIn.estimate(paths, discount);
    const gap = Math.abs(vanillaEstimate.price - reference);
    const gapInStdErrors = vanillaEstimate.standardError > 0 ? gap / vanillaEstimate.standardError : 0;

    return {
        seed,
        paths,
        steps,
        barrier,
        barrierDirection: direction,
        vanilla: publish(vanillaEstimate),
        blackScholesPrice: round(reference, 6),
        blackScholesGap: round(gapInStdErrors, 4),
        validated: vanillaEstimate.standardError > 0 ? gapInStdErrors < MONTE_CARLO_VALIDATION_STD_ERRORS : gap <= MONTE_CARLO_ZERO_ERROR_TOLERANCE,
        knockOut: publish(knockOutEstimate),
        knockIn: publish(knockInEstimate),
        // + 0 : un écart nul arrondi ne doit pas sortir en -0
        parityGap: round(knockOutEstimate.price + knockInEstimate.price - vanillaEstimate.price, 6) + 0,
        convergence: [...checkpoints].map(([count, estimate]) => ({ paths: count, ...publish(estimate!) })),
        sample,
        sampleTouched: sample.filter(({ touched }) => touched).length,
    };
}
