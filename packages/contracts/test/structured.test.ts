import { expect, test } from "bun:test"
import { structuredInputSchema, structuredResultSchema } from "../src/structured"

const common = { underlying: "^STOXX50E", nominal: 1000, maturityYears: 5, rate: 0.03, volatility: 0.18, dividendYield: 0.02, valueDate: "2026-10-28" }
const guaranteed = { product: "CAPITAL_GUARANTEED" as const, ...common, guarantee: 1, callStrike: 1 }
const autocall = { product: "AUTOCALLABLE" as const, ...common, couponRate: 0.06, recallLevel: 1, protectionBarrier: 0.6 }
const asset = (symbol: string) => ({ symbol, spot: 100, volatility: 0.2, dividendYield: 0.02 })
const basket = {
    mode: "WORST_OF" as const,
    underlyings: [asset("A"), asset("B")],
    correlations: [
        [1, 0.5],
        [0.5, 1],
    ],
}
const parses = (input: unknown) => structuredInputSchema.safeParse(input).success

test("les champs de l'évolution sont optionnels : une saisie livrée reste valide", () => {
    expect(parses(guaranteed)).toBe(true)
    expect(parses(autocall)).toBe(true)
    expect(structuredInputSchema.parse(autocall)).toEqual(autocall)
})

test("panier : 2 à 5 sous-jacents, matrice carrée symétrique de diagonale 1", () => {
    expect(parses({ ...guaranteed, basket })).toBe(true)
    expect(parses({ ...guaranteed, basket: { ...basket, underlyings: [asset("A")], correlations: [[1]] } })).toBe(false)
    expect(parses({ ...guaranteed, basket: { ...basket, correlations: [[1, 0.5]] } })).toBe(false)
    expect(parses({ ...guaranteed, basket: { ...basket, correlations: [[1, 0.5], [0.4, 1]] } })).toBe(false)
    expect(parses({ ...guaranteed, basket: { ...basket, correlations: [[0.9, 0.5], [0.5, 1]] } })).toBe(false)
    expect(parses({ ...guaranteed, basket: { ...basket, correlations: [[1, 1.5], [1.5, 1]] } })).toBe(false)
    const six = Array.from({ length: 6 }, (_, i) => asset(`S${i}`))
    const identity = six.map((_, i) => six.map((__, j) => (i === j ? 1 : 0)))
    expect(parses({ ...guaranteed, basket: { mode: "AVERAGE", underlyings: six, correlations: identity } })).toBe(false)
})

test("niveaux en prix (D27) : exigent le cours et un seul sous-jacent", () => {
    expect(parses({ ...guaranteed, spot: 4500, callStrikePrice: 4600 })).toBe(true)
    expect(parses({ ...guaranteed, callStrikePrice: 4600 })).toBe(false)
    expect(parses({ ...guaranteed, spot: 4500, callStrikePrice: 4600, basket })).toBe(false)
    expect(parses({ ...autocall, spot: 4500, recallPrice: 4500, protectionBarrierPrice: 2700 })).toBe(true)
    expect(parses({ ...autocall, protectionBarrierPrice: 2700 })).toBe(false)
})

test("autocallable : fréquence, coupon mémoire, période de non-rappel qui laisse au moins une observation", () => {
    expect(parses({ ...autocall, observationFrequency: "QUARTERLY", memoryCoupon: false, nonCallObservations: 4 })).toBe(true)
    expect(parses({ ...autocall, observationFrequency: "MONTHLY" })).toBe(false)
    expect(parses({ ...autocall, nonCallObservations: 5 })).toBe(false)
    expect(parses({ ...autocall, observationFrequency: "SEMI_ANNUAL", nonCallObservations: 9 })).toBe(true)
    expect(parses({ ...autocall, observationFrequency: "SEMI_ANNUAL", nonCallObservations: 10 })).toBe(false)
})

test("marge cible, spread et coût de couverture bornés", () => {
    expect(parses({ ...guaranteed, targetMargin: 0.04, fundingSpreadBps: 150, hedgingCost: 0.005 })).toBe(true)
    expect(parses({ ...guaranteed, targetMargin: -0.01 })).toBe(false)
    expect(parses({ ...guaranteed, fundingSpreadBps: -1 })).toBe(false)
    expect(parses({ ...guaranteed, hedgingCost: 2 })).toBe(false)
})

test("résultat : risque, corrélations et coupon effectif sont optionnels", () => {
    const result = {
        product: "REVERSE_CONVERTIBLE" as const,
        fairValue: 960,
        fairValueRatio: 0.96,
        clientPrice: 1000,
        margin: 40,
        marginRatio: 0.04,
        bricks: [{ type: "BOND" as const, value: 960, ratio: 0.96 }],
        payoff: [
            { underlyingChange: -0.5, payoff: 600 },
            { underlyingChange: 0, payoff: 1040 },
        ],
        putPrice: 80,
    }
    expect(structuredResultSchema.safeParse(result).success).toBe(true)
    const risk = { underlyings: [{ symbol: "A", delta: -3.2, vega: 1.1 }], correlationSensitivity: null, hedgingCost: 5, netMargin: 35, netMarginRatio: 0.035 }
    expect(structuredResultSchema.safeParse({ ...result, couponRate: 0.05, correlations: [[1]], risk }).success).toBe(true)
    expect(structuredResultSchema.safeParse({ ...result, risk: { ...risk, underlyings: [] } }).success).toBe(false)
})
