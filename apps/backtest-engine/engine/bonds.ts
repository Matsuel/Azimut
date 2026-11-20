import type { BondFlow, BondInput, BondResult, RateCurvePoint } from "@azimut/contracts";
import { addYears, round } from "@azimut/utils";

// Variation de taux du choc publié (priceChangeOnRatePlusOnePoint) : +1 point = 0.01 en ratio
const RATE_SHOCK = 0.01;

/**
 * Taux annuel (ratio) à `maturityYears`, interpolé linéairement entre les deux points de courbe qui l'encadrent (D2).
 * Un point exactement à cette maturité est rendu tel quel. Lève une erreur hors de la courbe : jamais d'extrapolation silencieuse.
 */
export function interpolateRate(points: Pick<RateCurvePoint, "maturityYears" | "rate">[], maturityYears: number): number {
    const sorted = [...points].sort((a, b) => a.maturityYears - b.maturityYears);
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    if (!first || !last || maturityYears < first.maturityYears || maturityYears > last.maturityYears) {
        throw new Error(
            `Maturity of ${maturityYears} years is outside the rate curve` +
                (first && last ? ` (${first.maturityYears} to ${last.maturityYears} years)` : " (empty curve)"),
        );
    }

    const upperIndex = sorted.findIndex((point) => point.maturityYears >= maturityYears);
    const upper = sorted[upperIndex]!;
    const lower = sorted[upperIndex - 1];
    if (!lower || upper.maturityYears === maturityYears) return upper.rate;

    const share = (maturityYears - lower.maturityYears) / (upper.maturityYears - lower.maturityYears);
    return lower.rate + share * (upper.rate - lower.rate);
}

/**
 * Prix d'une obligation (D3, D7, D8) : un coupon par an, nominal remboursé à la dernière échéance, tous les flux
 * actualisés au même taux composé annuel (base 365 : un an = une période). `curve` n'est lue que pour un taux de courbe ;
 * lève une erreur si elle manque ou si la maturité est hors de la courbe.
 * Les cumuls (prix, durations) se font sur les valeurs non arrondies ; seules les valeurs publiées sont arrondies.
 */
export function priceBond(bond: BondInput, curve: RateCurvePoint[] | null): BondResult {
    const { nominal, couponRate, maturityYears, discount, valueDate } = bond;

    if (discount.source === "CURVE" && !curve?.length) throw new Error("Rate curve is required to discount at the curve rate");
    const rate = discount.source === "CURVE" ? interpolateRate(curve!, maturityYears) : discount.rate;
    const curveDate = discount.source === "CURVE" ? curve!.map((point) => point.date).sort().at(-1)! : null;

    let price = 0;
    let weightedYears = 0;
    const flows: BondFlow[] = [];
    for (let year = 1; year <= maturityYears; year++) {
        const cashFlow = nominal * couponRate + (year === maturityYears ? nominal : 0);
        const discountFactor = 1 / (1 + rate) ** year;
        const presentValue = cashFlow * discountFactor;
        price += presentValue;
        weightedYears += year * presentValue;
        flows.push({
            year,
            date: addYears(new Date(`${valueDate}T00:00:00Z`), year).toISOString().slice(0, 10),
            cashFlow: round(cashFlow, 2),
            discountFactor: round(discountFactor, 6),
            presentValue: round(presentValue, 2),
        });
    }

    const macaulayDuration = weightedYears / price;
    const modifiedDuration = macaulayDuration / (1 + rate);

    return {
        rate: round(rate, 6),
        discountSource: discount.source,
        curveDate,
        price: round(price, 2),
        macaulayDuration: round(macaulayDuration, 4),
        modifiedDuration: round(modifiedDuration, 4),
        priceChangeOnRatePlusOnePoint: round(-modifiedDuration * RATE_SHOCK, 6),
        flows,
    };
}
