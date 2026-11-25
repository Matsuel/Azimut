import type { OptionInputs, RateCurve } from "@azimut/contracts"
import { toDay, toPercent } from "../pricing/utils"
import { DEFAULT_COUPON_RATE, DEFAULT_STRUCTURED, STRUCTURED_RATE_SYMBOL } from "./constants"
import type { StructuredFormValues } from "./schema"
import type {
    PricingView,
    StructuredBrickType,
    StructuredInput,
    StructuredPayoffPoint,
    StructuredProduct,
    StructuredResult,
} from "./types"

/** Saisie initiale d'un produit : les valeurs de la maquette, avec le coupon propre au produit (aucun coupon pour un capital garanti). */
export function structuredDefaults(product: StructuredProduct): StructuredFormValues {
    const coupon = product === "CAPITAL_GUARANTEED" ? undefined : DEFAULT_COUPON_RATE[product]
    return { ...DEFAULT_STRUCTURED, product, couponRate: coupon }
}

/**
 * Saisie du formulaire → corps de `POST /api/pricing` : pourcentages en ratios, date de départ = aujourd'hui, seuls les champs du produit
 * choisi sont envoyés. Le prix client n'est pas saisi : le moteur le fixe au nominal (D5).
 */
export function toStructuredPricingInput(
    values: StructuredFormValues,
    today: Date = new Date(),
): { kind: "STRUCTURED"; structured: StructuredInput } {
    const ratio = (percent: number | undefined) => (percent ?? 0) / 100
    const common = {
        underlying: values.underlying,
        nominal: values.nominal,
        maturityYears: values.maturityYears,
        rate: ratio(values.rate),
        volatility: ratio(values.volatility),
        dividendYield: ratio(values.dividendYield),
        valueDate: toDay(today),
    }
    if (values.product === "CAPITAL_GUARANTEED") {
        return {
            kind: "STRUCTURED",
            structured: {
                product: values.product,
                ...common,
                guarantee: ratio(values.guarantee),
                callStrike: ratio(values.callStrike),
            },
        }
    }
    if (values.product === "REVERSE_CONVERTIBLE") {
        return {
            kind: "STRUCTURED",
            structured: {
                product: values.product,
                ...common,
                couponRate: ratio(values.couponRate),
                putStrike: ratio(values.putStrike),
            },
        }
    }
    return {
        kind: "STRUCTURED",
        structured: {
            product: values.product,
            ...common,
            couponRate: ratio(values.couponRate),
            recallLevel: ratio(values.recallLevel),
            protectionBarrier: ratio(values.protectionBarrier),
        },
    }
}

/** Demande `STRUCTURED` d'une vue : son entrée, et son résultat une fois `COMPLETED` ; `null` pour une vue d'un autre kind. */
export function structuredOf(
    view: PricingView | undefined,
): { input: StructuredInput; result: StructuredResult | null } | null {
    if (view?.input.kind !== "STRUCTURED") return null
    const result = view.status === "COMPLETED" && view.result?.kind === "STRUCTURED" ? view.result.structured : null
    return { input: view.input.structured, result }
}

// Point du graphique de payoff : le produit, et le sous-jacent détenu en direct pour le même nominal (droite de référence, affichage seul)
export type PayoffRow = StructuredPayoffPoint & { underlying: number }

/** Lignes du graphique : la diagonale du sous-jacent est `nominal × (1 + variation)`, tracée pour situer le produit, jamais affichée comme valeur de l'API. */
export function payoffRows(payoff: StructuredPayoffPoint[], nominal: number): PayoffRow[] {
    return payoff.map((point) => ({ ...point, underlying: nominal * (1 + point.underlyingChange) }))
}

// Segment de la barre de décomposition : une part du prix client, `key` choisit sa couleur (`SEGMENT_COLORS`) et son libellé de légende
export type BarSegment = { key: StructuredBrickType | "FAIR_VALUE" | "MARGIN"; ratio: number }

/**
 * Segments de la barre, lus dans le résultat : les briques positives, la marge si elle est positive. Une brique négative (put vendu) ne se
 * dessine pas dans une barre : le produit se montre alors en un seul bloc, sa juste valeur.
 */
export function barSegments(result: StructuredResult): BarSegment[] {
    const base: BarSegment[] = result.bricks.some((brick) => brick.value < 0)
        ? [{ key: "FAIR_VALUE", ratio: result.fairValueRatio }]
        : result.bricks.map((brick) => ({ key: brick.type, ratio: brick.ratio }))
    return result.marginRatio > 0 ? [...base, { key: "MARGIN", ratio: result.marginRatio }] : base
}

/**
 * Paramètres de marché du sous-jacent choisi, en pourcentages saisis : volatilité 1 an et dividende des 12 derniers mois
 * (`GET /api/market/option-inputs`), taux à 5 ans de la courbe US ; une valeur absente est omise et laisse la saisie en l'état.
 */
export function marketDefaults(
    inputs: OptionInputs | undefined,
    curve: RateCurve | undefined,
): Partial<Pick<StructuredFormValues, "volatility" | "dividendYield" | "rate">> {
    const rate = curve?.points.find((point) => point.symbol === STRUCTURED_RATE_SYMBOL)?.rate
    return {
        ...(inputs?.volatility != null && { volatility: toPercent(inputs.volatility) }),
        ...(inputs && { dividendYield: toPercent(inputs.dividendYield) }),
        ...(rate != null && { rate: toPercent(rate) }),
    }
}
