import type { AutocallableInput, AutocallableResult, AutocallObservation } from "@azimut/contracts";
import { addYears, mulberry32, round, standardNormal } from "@azimut/utils";
import { AUTOCALL_PATHS } from "../constants/pricing.constants";
import { PayoffStats } from "./options.mc";
import { assemble, brick, continuousRate, discountFactor, payoffGrid } from "./structured";

const yearDate = (valueDate: string, years: number): string => addYears(new Date(`${valueDate}T00:00:00Z`), years).toISOString().slice(0, 10);

/**
 * Autocallable par simulation (D3, D6) : un tirage log-normal par année (GBM neutre au risque, dérive r − σ²/2, sans dividende).
 * Chaque année avant l'échéance, un niveau ≥ seuil de rappel rembourse le nominal + coupon cumulé et arrête la trajectoire. À l'échéance :
 * ≥ seuil : nominal + coupon cumulé ; entre barrière et seuil : nominal ; sous la barrière : nominal × niveau. Le prix est la moyenne
 * des flux actualisés, avec son erreur standard. Briques : le zéro-coupon (capital à l'échéance) et le reste, « coupons nets » de la
 * barrière et de l'effet du rappel, par différence : un autocallable n'a pas de décomposition fermée.
 * Fonction pure : mêmes paramètres et même `seed`, mêmes sorties. Lève si la volatilité sort de la plage numérique.
 */
export function priceAutocallable(input: AutocallableInput, seed: number, paths = AUTOCALL_PATHS): AutocallableResult {
    const { nominal, maturityYears, rate, volatility, couponRate, recallLevel, protectionBarrier, valueDate } = input;
    const drift = continuousRate(rate) - (volatility * volatility) / 2;
    const draw = standardNormal(mulberry32(seed));

    const prices = new PayoffStats();
    const recalls = new Array<number>(maturityYears).fill(0);
    for (let path = 0; path < paths; path++) {
        let logLevel = 0;
        for (let year = 1; year <= maturityYears; year++) {
            logLevel += drift + volatility * draw();
            const level = Math.exp(logLevel);
            const atMaturity = year === maturityYears;
            if (level >= recallLevel) {
                prices.add(nominal * (1 + couponRate * year) * discountFactor(rate, year));
                recalls[year - 1]!++;
                break;
            }
            if (atMaturity) {
                prices.add(nominal * (level >= protectionBarrier ? 1 : level) * discountFactor(rate, year));
                recalls[year - 1]!++;
            }
        }
    }
    const { price, standardError } = prices.estimate(paths, 1);
    if (!Number.isFinite(price)) throw new Error("Autocallable parameters out of numeric range");

    const zeroCoupon = nominal * discountFactor(rate, maturityYears);
    const reachedMaturity = recalls[maturityYears - 1]! / paths;
    const observations: AutocallObservation[] = recalls.slice(0, -1).map((count, index) => ({
        year: index + 1,
        date: yearDate(valueDate, index + 1),
        recallLevel,
        cumulativeCoupon: round(couponRate * (index + 1), 4),
        recallProbability: round(count / paths, 4),
    }));

    const zeroCouponBrick = brick("ZERO_COUPON", zeroCoupon, nominal);
    return {
        product: "AUTOCALLABLE",
        // Le reste est la différence arrondie : fairValue (somme des briques) retombe sur le prix simulé à 0,01 près
        ...assemble(nominal, [zeroCouponBrick, brick("AUTOCALL_NET_COUPONS", round(price, 2) - zeroCouponBrick.value, nominal)]),
        standardError: round(standardError, 2),
        paths,
        seed,
        observations,
        maturityProbability: round(reachedMaturity, 4),
        recallProbability: round(1 - reachedMaturity, 4),
        maturityDate: yearDate(valueDate, maturityYears),
        maturityCumulativeCoupon: round(couponRate * maturityYears, 4),
        payoff: payoffGrid((level) => nominal * (level >= recallLevel ? 1 + couponRate * maturityYears : level >= protectionBarrier ? 1 : level)),
    };
}
