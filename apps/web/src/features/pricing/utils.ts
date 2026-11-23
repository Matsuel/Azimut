import { DAYS_PER_YEAR, DEFAULT_OPTION_MATURITY_DAYS, RISK_FREE_SYMBOL } from "./constants"
import type { BondFormValues, OptionFormValues } from "./schema"
import type { BondFlow, OptionInputs, PricingInput, RateCurve } from "./types"

// Jour local `YYYY-MM-DD` (pas `toISOString`, qui décalerait d'un jour après minuit hors UTC)
const toDay = (date: Date) =>
    [date.getFullYear(), date.getMonth() + 1, date.getDate()]
        .map((n, i) => String(n).padStart(i ? 2 : 4, "0"))
        .join("-")

/** Saisie du formulaire → corps de `POST /api/pricing` : pourcentages en ratios, coupon à 0 pour un zéro-coupon. */
export function toPricingInput(values: BondFormValues): PricingInput {
    return {
        kind: "BOND",
        bond: {
            nominal: values.nominal,
            couponRate: values.type === "ZERO" ? 0 : values.couponRate / 100,
            maturityYears: values.maturityYears,
            discount:
                values.discountSource === "FLAT"
                    ? { source: "FLAT", rate: (values.flatRate ?? 0) / 100 }
                    : { source: "CURVE" },
            valueDate: toDay(values.valueDate),
        },
    }
}

// Ligne du tableau des flux : une échéance, ou plusieurs échéances consécutives sans flux (`to` > `from`)
export type FlowRow = { from: number; to: number; flow: BondFlow }

/** Regroupe les échéances consécutives sans flux (zéro-coupon : « 1 à 4 ») ; les autres gardent leur ligne. */
export function groupFlows(flows: BondFlow[]): FlowRow[] {
    return flows.reduce<FlowRow[]>((rows, flow) => {
        const last = rows.at(-1)
        if (flow.cashFlow === 0 && last && last.flow.cashFlow === 0) last.to = flow.year
        else rows.push({ from: flow.year, to: flow.year, flow })
        return rows
    }, [])
}

/** Saisie du calculateur d'option → corps de `POST /api/pricing` : pourcentages en ratios, jours en années de 365 jours. */
export function toOptionPricingInput(values: OptionFormValues): PricingInput {
    return {
        kind: "OPTION",
        option: {
            spot: values.spot,
            strike: values.strike,
            maturityYears: values.maturityDays / DAYS_PER_YEAR,
            rate: values.rate / 100,
            dividendYield: values.dividendYield / 100,
            volatility: values.volatility / 100,
        },
    }
}

// Ratio → pourcentage saisissable, sans bruit de virgule flottante (0,243 → 24,3)
const toPercent = (ratio: number) => Math.round(ratio * 100 * 1e4) / 1e4

/** Maturité en jours entiers d'une demande (`maturityYears` × 365), pour l'afficher telle qu'elle a été saisie. */
export const toMaturityDays = (maturityYears: number) => Math.round(maturityYears * DAYS_PER_YEAR)

/**
 * Valeurs de départ du formulaire d'option (D2, D4) : spot, dividende et volatilité du symbole, taux 13 semaines de la
 * courbe (`^IRX`). Un champ sans source reste absent (saisie manuelle) ; le strike démarre au spot arrondi.
 */
export function optionDefaults(
    inputs: OptionInputs | undefined,
    curve: RateCurve | undefined,
): Partial<OptionFormValues> {
    const rate = curve?.points.find((point) => point.symbol === RISK_FREE_SYMBOL)?.rate
    return {
        spot: inputs?.spot,
        strike: inputs ? Math.round(inputs.spot) || inputs.spot : undefined,
        maturityDays: DEFAULT_OPTION_MATURITY_DAYS,
        rate: rate == null ? undefined : toPercent(rate),
        dividendYield: inputs ? toPercent(inputs.dividendYield) : undefined,
        volatility: inputs?.volatility == null ? undefined : toPercent(inputs.volatility),
    }
}
