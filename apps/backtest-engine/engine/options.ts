import type { OptionInput, OptionPrice, OptionResult, PayoffPoint } from "@azimut/contracts";
import { round } from "@azimut/utils";

// Nombre de points de la grille de payoff, bornes comprises
const PAYOFF_GRID_POINTS = 21;
// Étendue de la grille autour du spot et du strike : de 0,7 × le plus petit à 1,3 × le plus grand
const PAYOFF_GRID_LOW = 0.7;
const PAYOFF_GRID_HIGH = 1.3;

/**
 * Fonction de répartition de la loi normale centrée réduite, précise à ~1e-15 (algorithme de Hart, G. West 2005).
 * Symétrique par construction : `normalCdf(-x) = 1 - normalCdf(x)`, ce qui fait tenir la parité call-put algébriquement.
 */
export function normalCdf(x: number): number {
    const abs = Math.abs(x);
    let tail: number;
    if (abs > 37) {
        tail = 0;
    } else {
        const gauss = Math.exp((-abs * abs) / 2);
        if (abs < 7.07106781186547) {
            let numerator = 3.52624965998911e-2 * abs + 0.700383064443688;
            numerator = numerator * abs + 6.37396220353165;
            numerator = numerator * abs + 33.912866078383;
            numerator = numerator * abs + 112.079291497871;
            numerator = numerator * abs + 221.213596169931;
            numerator = numerator * abs + 220.206867912376;
            let denominator = 8.83883476483184e-2 * abs + 1.75566716318264;
            denominator = denominator * abs + 16.064177579207;
            denominator = denominator * abs + 86.7807322029461;
            denominator = denominator * abs + 296.564248779674;
            denominator = denominator * abs + 637.333633378831;
            denominator = denominator * abs + 793.826512519948;
            denominator = denominator * abs + 440.413735824752;
            tail = (gauss * numerator) / denominator;
        } else {
            let fraction = abs + 0.65;
            fraction = abs + 4 / fraction;
            fraction = abs + 3 / fraction;
            fraction = abs + 2 / fraction;
            fraction = abs + 1 / fraction;
            tail = gauss / fraction / 2.506628274631;
        }
    }
    return x > 0 ? 1 - tail : tail;
}

/** Prix non arrondis du call et du put européens de Black-Scholes avec dividende continu q (D1). */
function blackScholes({ spot, strike, maturityYears, rate, dividendYield, volatility }: OptionInput) {
    const spread = volatility * Math.sqrt(maturityYears);
    const d1 = (Math.log(spot / strike) + (rate - dividendYield + (volatility * volatility) / 2) * maturityYears) / spread;
    const d2 = d1 - spread;
    if (![spread, d1, d2].every(Number.isFinite) || spread <= 0) throw new Error("Option parameters out of numeric range");
    const forward = spot * Math.exp(-dividendYield * maturityYears);
    const discountedStrike = strike * Math.exp(-rate * maturityYears);

    return {
        call: forward * normalCdf(d1) - discountedStrike * normalCdf(d2),
        put: discountedStrike * normalCdf(-d2) - forward * normalCdf(-d1),
        parityRight: forward - discountedStrike,
    };
}

/** Payoff à l'échéance, par action et hors prime : max(S − K, 0) pour un call, max(K − S, 0) pour un put. */
export function payoff(side: "CALL" | "PUT", finalSpot: number, strike: number): number {
    return side === "CALL" ? Math.max(finalSpot - strike, 0) : Math.max(strike - finalSpot, 0);
}

function side(side: "CALL" | "PUT", price: number, spot: number, strike: number): OptionPrice {
    const intrinsicValue = payoff(side, spot, strike);
    return {
        price: round(price, 2),
        intrinsicValue: round(intrinsicValue, 2),
        timeValue: round(price - intrinsicValue, 2),
        breakEven: round(side === "CALL" ? strike + price : strike - price, 2),
    };
}

/**
 * Prix d'une option européenne (D1) : call et put, parité call-put et grille de payoff nets de prime (achat d'une option).
 * Les calculs (prix, parité, primes de la grille) se font sur les valeurs non arrondies ; seules les valeurs publiées sont arrondies.
 */
export function priceOption(option: OptionInput): OptionResult {
    const { spot, strike } = option;
    const { call, put, parityRight } = blackScholes(option);
    if (![call, put, parityRight].every(Number.isFinite)) throw new Error("Option parameters out of numeric range");

    const low = PAYOFF_GRID_LOW * Math.min(spot, strike);
    const step = (PAYOFF_GRID_HIGH * Math.max(spot, strike) - low) / (PAYOFF_GRID_POINTS - 1);
    const payoffGrid: PayoffPoint[] = Array.from({ length: PAYOFF_GRID_POINTS }, (_, index) => {
        const finalSpot = low + index * step;
        const callPayoff = payoff("CALL", finalSpot, strike);
        const putPayoff = payoff("PUT", finalSpot, strike);
        return {
            spot: round(finalSpot, 2),
            callPayoff: round(callPayoff, 2),
            putPayoff: round(putPayoff, 2),
            callNet: round(callPayoff - call, 2),
            putNet: round(putPayoff - put, 2),
        };
    });

    return {
        call: side("CALL", call, spot, strike),
        put: side("PUT", put, spot, strike),
        callMinusPut: round(call - put, 6),
        parityRight: round(parityRight, 6),
        // + 0 : un écart nul arrondi ne doit pas sortir en -0
        parityGap: round(call - put - parityRight, 6) + 0,
        payoffGrid,
    };
}
