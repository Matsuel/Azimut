import type { BondFormValues } from "./schema"
import type { BondFlow, PricingInput } from "./types"

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
