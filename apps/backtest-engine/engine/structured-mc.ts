import { STRUCTURED_OBSERVATIONS_PER_YEAR, type AutocallableInput, type AutocallableResult, type AutocallObservation } from "@azimut/contracts";
import { addYears, mulberry32, round, standardNormal } from "@azimut/utils";
import { AUTOCALL_PATHS } from "../constants/pricing.constants";
import { aggregate, cholesky, correlatedDraws, resolveUnderlyings } from "./basket";
import { PayoffStats } from "./options.mc";
import { assemble, basketCorrelations, brick, continuousRate, discountFactor, fundingRate, levelOf, payoffGrid } from "./structured";

const yearDate = (valueDate: string, years: number): string => addYears(new Date(`${valueDate}T00:00:00Z`), years).toISOString().slice(0, 10);

/** Date de la `index`-ième observation : `valueDate` + `index × 12 / perYear` mois, ramenée au dernier jour d'un mois plus court (31 août + 6 mois = 28 février). Annuelle : `addYears`, comme le produit livré. */
function observationDate(valueDate: string, index: number, perYear: number): string {
    const months = (index * 12) / perYear;
    if (months % 12 === 0) return yearDate(valueDate, months / 12);
    const start = new Date(`${valueDate}T00:00:00Z`);
    const lastDay = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + months + 1, 0)).getUTCDate();
    return new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + months, Math.min(start.getUTCDate(), lastDay))).toISOString().slice(0, 10);
}

/**
 * Autocallable par simulation (D3, D6, D18) : un pas par observation (annuelle, semestrielle ou trimestrielle), chaque sous-jacent en
 * GBM neutre au risque (dérive r − q − σ²/2), tirages corrélés par Cholesky sur un panier (D13) dont l'agrégat porte le rappel et la
 * barrière. Après la période de non-rappel, un niveau ≥ seuil de rappel rembourse le nominal + coupon et arrête la trajectoire ; avec le
 * coupon mémoire (défaut), le coupon est celui de toutes les périodes écoulées, sinon celui de la période du rappel seule (D28). À
 * l'échéance : ≥ seuil : nominal + coupon ; entre barrière et seuil : nominal ; sous la barrière : nominal × niveau. Les flux sont
 * escomptés à taux + spread (D17). Le prix est la moyenne des flux, avec son erreur standard. Briques : le zéro-coupon (capital à
 * l'échéance) et le reste, « coupons nets » de la barrière et de l'effet du rappel, par différence.
 *
 * Le flux d'une trajectoire est linéaire en le coupon : `a + coupon × b`. La simulation cumule les sommes de `a` et `b` une fois ; avec une
 * marge cible (D12) le coupon est résolu exactement sur ces mêmes tirages (graine fixe : reproductible), sans itération.
 * Fonction pure : mêmes paramètres et même `seed`, mêmes sorties. Lève si la volatilité sort de la plage numérique ou si la marge cible
 * est inatteignable (coupon négatif).
 */
export function priceAutocallable(input: AutocallableInput, seed: number, paths = AUTOCALL_PATHS): AutocallableResult {
    const { nominal, maturityYears, rate, valueDate } = input;
    const recallLevel = levelOf(input.recallLevel, input.recallPrice, input.spot);
    const protectionBarrier = levelOf(input.protectionBarrier, input.protectionBarrierPrice, input.spot);
    const perYear = STRUCTURED_OBSERVATIONS_PER_YEAR[input.observationFrequency ?? "ANNUAL"];
    const memory = input.memoryCoupon ?? true;
    const nonCall = input.nonCallObservations ?? 0;
    const funding = fundingRate(input);
    const total = maturityYears * perYear;
    const step = 1 / perYear;
    // Années de coupon versées à la période `index` : toutes les périodes écoulées avec mémoire, la seule période courante sans
    const couponYears = (index: number) => (memory ? index * step : step);

    const { assets, correlations, mode } = resolveUnderlyings(input);
    const draw = correlatedDraws(standardNormal(mulberry32(seed)), cholesky(correlations));
    const drifts = assets.map(({ volatility, dividendYield }) => (continuousRate(rate) - dividendYield - (volatility * volatility) / 2) * step);
    const diffusions = assets.map(({ volatility }) => volatility * Math.sqrt(step));

    // Flux d'une trajectoire = a + coupon × b ; sommes pour la moyenne et la variance à n'importe quel coupon
    let sumA = 0;
    let sumB = 0;
    let sumAA = 0;
    let sumAB = 0;
    let sumBB = 0;
    const alive = new Array<number>(total).fill(0);
    const logs = new Array<number>(assets.length);
    const levels = new Array<number>(assets.length);
    for (let path = 0; path < paths; path++) {
        logs.fill(0);
        for (let index = 1; index <= total; index++) {
            const z = draw();
            for (let i = 0; i < assets.length; i++) {
                logs[i]! += drifts[i]! + diffusions[i]! * z[i]!;
                levels[i] = Math.exp(logs[i]!);
            }
            const level = aggregate(mode, levels);
            const discount = discountFactor(funding, index * step);
            let a: number;
            let b = 0;
            if (index > nonCall && level >= recallLevel) {
                a = nominal * discount;
                b = nominal * couponYears(index) * discount;
            } else if (index === total) {
                a = nominal * (level >= protectionBarrier ? 1 : level) * discount;
            } else {
                continue;
            }
            sumA += a;
            sumB += b;
            sumAA += a * a;
            sumAB += a * b;
            sumBB += b * b;
            alive[index - 1]!++;
            break;
        }
    }

    let couponRate = input.couponRate;
    if (input.targetMargin !== undefined) {
        couponRate = (nominal * (1 - input.targetMargin) - sumA / paths) / (sumB / paths);
        if (!(couponRate > 0)) throw new Error("Target margin unreachable: the coupon would not be positive");
    }
    const stats = new PayoffStats();
    stats.sum = sumA + couponRate * sumB;
    stats.squares = sumAA + 2 * couponRate * sumAB + couponRate * couponRate * sumBB;
    const { price, standardError } = stats.estimate(paths, 1);
    if (!Number.isFinite(price)) throw new Error("Autocallable parameters out of numeric range");

    const zeroCoupon = nominal * discountFactor(funding, maturityYears);
    const reachedMaturity = alive[total - 1]! / paths;
    const observations: AutocallObservation[] = alive.slice(0, -1).map((count, offset) => {
        const index = offset + 1;
        return {
            year: Math.ceil(index * step),
            index,
            date: observationDate(valueDate, index, perYear),
            recallLevel,
            cumulativeCoupon: round(couponRate * couponYears(index), 4),
            recallProbability: round(count / paths, 4),
        };
    });
    const maturityCoupon = couponRate * couponYears(total);

    const zeroCouponBrick = brick("ZERO_COUPON", zeroCoupon, nominal);
    return {
        product: "AUTOCALLABLE",
        // Le reste est la différence arrondie : fairValue (somme des briques) retombe sur le prix simulé à 0,01 près
        ...assemble(nominal, [zeroCouponBrick, brick("AUTOCALL_NET_COUPONS", round(price, 2) - zeroCouponBrick.value, nominal)]),
        couponRate: round(couponRate, 6),
        standardError: round(standardError, 2),
        paths,
        seed,
        observations,
        maturityProbability: round(reachedMaturity, 4),
        recallProbability: round(1 - reachedMaturity, 4),
        maturityDate: yearDate(valueDate, maturityYears),
        maturityCumulativeCoupon: round(maturityCoupon, 4),
        payoff: payoffGrid((level) => nominal * (level >= recallLevel ? 1 + maturityCoupon : level >= protectionBarrier ? 1 : level)),
        ...basketCorrelations(input),
    };
}
