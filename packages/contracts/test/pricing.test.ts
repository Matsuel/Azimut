import { expect, test } from "bun:test"
import { bondInputSchema, optionInputSchema, optionResultSchema, pricingInputSchema, pricingResultSchema, pricingRequestedEventSchema, rateCurveSchema } from "../src"

const bond = { nominal: 100, couponRate: 0, maturityYears: 5, discount: { source: "FLAT", rate: 0.03 }, valueDate: "2026-10-28" }

const option = { spot: 100, strike: 100, maturityYears: 1, rate: 0.05, dividendYield: 0, volatility: 0.2 }

test("optionInputSchema : spot, strike, maturité et volatilité strictement positifs", () => {
    expect(optionInputSchema.safeParse(option).success).toBe(true)
    expect(pricingInputSchema.safeParse({ kind: "OPTION", option }).success).toBe(true)
    for (const field of ["spot", "strike", "maturityYears", "volatility"] as const) {
        expect(optionInputSchema.safeParse({ ...option, [field]: 0 }).success).toBe(false)
        expect(optionInputSchema.safeParse({ ...option, [field]: -1 }).success).toBe(false)
    }
    expect(optionInputSchema.safeParse({ ...option, maturityYears: 31 }).success).toBe(false)
    expect(optionInputSchema.safeParse({ ...option, dividendYield: -0.01 }).success).toBe(false)
})

test("pricing.requested : demande d'option avec requestId", () => {
    const event = { eventId: "e1", eventType: "pricing.requested", occurredAt: "2026-11-20T10:00:00.000Z", version: 1, payload: { requestId: "p1", kind: "OPTION", option } }

    expect(pricingRequestedEventSchema.safeParse(event).success).toBe(true)
})

test("bondInputSchema : maturité entière de 1 à 30 ans, taux plat de 0 à 1", () => {
    expect(bondInputSchema.safeParse(bond).success).toBe(true)
    expect(bondInputSchema.safeParse({ ...bond, discount: { source: "CURVE" } }).success).toBe(true)
    expect(bondInputSchema.safeParse({ ...bond, maturityYears: 0 }).success).toBe(false)
    expect(bondInputSchema.safeParse({ ...bond, maturityYears: 31 }).success).toBe(false)
    expect(bondInputSchema.safeParse({ ...bond, maturityYears: 1.5 }).success).toBe(false)
    expect(bondInputSchema.safeParse({ ...bond, discount: { source: "FLAT", rate: 3 } }).success).toBe(false)
    expect(bondInputSchema.safeParse({ ...bond, discount: { source: "FLAT" } }).success).toBe(false)
})

test("bondInputSchema : nominal positif, coupon en ratio, date de valeur ISO", () => {
    expect(bondInputSchema.safeParse({ ...bond, nominal: 0 }).success).toBe(false)
    expect(bondInputSchema.safeParse({ ...bond, couponRate: 5 }).success).toBe(false)
    expect(bondInputSchema.safeParse({ ...bond, valueDate: "28/10/2026" }).success).toBe(false)
})

test("pricing.requested : enveloppe avec requestId, type de produit et obligation", () => {
    const event = { eventId: "e1", eventType: "pricing.requested", occurredAt: "2026-11-20T10:00:00.000Z", version: 1, payload: { requestId: "p1", kind: "BOND", bond } }

    expect(pricingRequestedEventSchema.safeParse(event).success).toBe(true)
    expect(pricingRequestedEventSchema.safeParse({ ...event, payload: { kind: "BOND", bond } }).success).toBe(false)
    expect(pricingInputSchema.safeParse({ kind: "OPTION", bond }).success).toBe(false)
    expect(pricingInputSchema.safeParse({ kind: "BOND", option }).success).toBe(false)
})

test("rateCurveSchema : au moins un point, jour de cotation ISO", () => {
    const point = { symbol: "^TNX", maturityYears: 10, rate: 0.0421, date: "2026-10-28" }

    expect(rateCurveSchema.safeParse({ currency: "USD", points: [point] }).success).toBe(true)
    expect(rateCurveSchema.safeParse({ currency: "USD", points: [] }).success).toBe(false)
    expect(rateCurveSchema.safeParse({ currency: "USD", points: [{ ...point, maturityYears: 0 }] }).success).toBe(false)
})

test("pricingResultSchema : un résultat OPTION porte option, pas bond", () => {
    expect(pricingResultSchema.safeParse({ kind: "OPTION", bond: {} }).success).toBe(false)
})

test("optionResultSchema : grille de payoff d'au moins 2 points", () => {
    const side = { price: 1, intrinsicValue: 0, timeValue: 1, breakEven: 101 }
    const point = { spot: 90, callPayoff: 0, putPayoff: 10, callNet: -1, putNet: 9 }
    const result = { call: side, put: side, callMinusPut: 0, parityRight: 0, parityGap: 0, parityVerified: true, payoffGrid: [point, point] }

    expect(optionResultSchema.safeParse(result).success).toBe(true)
    expect(optionResultSchema.safeParse({ ...result, payoffGrid: [point] }).success).toBe(false)
})

test("pricingInputSchema : OPTION_CHAIN porte un symbole non vide, pas d'option", () => {
    expect(pricingInputSchema.safeParse({ kind: "OPTION_CHAIN", chain: { symbol: " SPY " } }).success).toBe(true)
    expect(pricingInputSchema.safeParse({ kind: "OPTION_CHAIN", chain: { symbol: "  " } }).success).toBe(false)
    expect(pricingInputSchema.safeParse({ kind: "OPTION_CHAIN", option }).success).toBe(false)
})

test("pricingResultSchema : une chaîne écartée n'a ni IV ni grecques", () => {
    const row = { strike: 590, side: "CALL", bid: 0, ask: 0, mid: null, impliedVolatility: null, yahooVolatility: 0.125, status: "NO_BID_ASK", greeks: null }
    const chain = {
        symbol: "SPY", asOf: "2026-10-28", spot: 582, rate: 0.04, dividendYield: 0.012, contractsTotal: 1, contractsKept: 0,
        discarded: { noBidAsk: 1, noPrice: 0, ivOutOfBounds: 0 }, atmVolatility: null, historicalVolatility: null, volatilityPremium: null,
        smile: [{ expiration: "2026-12-19", points: [] }], chainExpiration: "2026-12-19", chain: [row],
    }

    expect(pricingResultSchema.safeParse({ kind: "OPTION_CHAIN", chain }).success).toBe(true)
    expect(pricingResultSchema.safeParse({ kind: "OPTION_CHAIN", chain: { ...chain, chain: [{ ...row, status: "BAD" }] } }).success).toBe(false)
})

test("OPTION_MC : trajectoires bornées de 10 000 à 1 000 000, 100 000 par défaut, maturité d'au plus 1 an", () => {
    const monteCarlo = { ...option, barrier: 90 }
    const parsed = pricingInputSchema.parse({ kind: "OPTION_MC", monteCarlo })
    expect(parsed.kind === "OPTION_MC" && parsed.monteCarlo.paths).toBe(100_000)
    for (const paths of [9_999, 1_000_001, 20_000.5]) {
        expect(pricingInputSchema.safeParse({ kind: "OPTION_MC", monteCarlo: { ...monteCarlo, paths } }).success).toBe(false)
    }
    expect(pricingInputSchema.safeParse({ kind: "OPTION_MC", monteCarlo: { ...monteCarlo, maturityYears: 1.5 } }).success).toBe(false)
    expect(pricingInputSchema.safeParse({ kind: "OPTION_MC", monteCarlo: { ...monteCarlo, barrier: 0 } }).success).toBe(false)
    // La graine n'est pas saisissable
    expect(pricingInputSchema.parse({ kind: "OPTION_MC", monteCarlo: { ...monteCarlo, seed: 1 } })).toEqual({ kind: "OPTION_MC", monteCarlo: { ...monteCarlo, paths: 100_000 } })
})
