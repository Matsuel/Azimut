import { expect, test } from "bun:test"
import type { AutocallableInput, CapitalGuaranteedInput, ReverseConvertibleInput } from "@azimut/contracts"
import { MONTE_CARLO_SEED, STRUCTURING_MARGIN } from "../constants/pricing.constants"
import { blackScholes } from "../engine/options"
import { priceCapitalGuaranteed, priceReverseConvertible } from "../engine/structured"
import { priceAutocallable } from "../engine/structured-mc"

const common = { underlying: "^STOXX50E", nominal: 1000, maturityYears: 5, rate: 0.03, volatility: 0.18, valueDate: "2026-10-28" }
const guaranteed: CapitalGuaranteedInput = { product: "CAPITAL_GUARANTEED", ...common, guarantee: 1, callStrike: 1 }
const convertible: ReverseConvertibleInput = { product: "REVERSE_CONVERTIBLE", ...common, couponRate: 0.04, putStrike: 1 }
const autocall: AutocallableInput = { product: "AUTOCALLABLE", ...common, couponRate: 0.06, recallLevel: 1, protectionBarrier: 0.6 }

test("capital garanti : zéro-coupon + call, la somme des briques est la juste valeur", () => {
    const result = priceCapitalGuaranteed(guaranteed)
    const zeroCoupon = result.bricks.find((brick) => brick.type === "ZERO_COUPON")!
    const call = result.bricks.find((brick) => brick.type === "CALL")!

    expect(zeroCoupon.value).toBeCloseTo(1000 / 1.03 ** 5, 2)
    expect(zeroCoupon.value + call.value).toBeCloseTo(result.fairValue, 2)
    expect(result.fairValue).toBeCloseTo(1000 * (1 - STRUCTURING_MARGIN), 2)
    expect(result.clientPrice).toBe(1000)
    expect(result.margin).toBeCloseTo(1000 * STRUCTURING_MARGIN, 2)
    expect(result.optionBudget).toBe(call.value)
})

test("capital garanti : participation = budget / prix du call, payoff plat sous le strike puis participation", () => {
    const result = priceCapitalGuaranteed(guaranteed)
    const call = blackScholes({ spot: 1000, strike: 1000, maturityYears: 5, rate: Math.log(1.03), dividendYield: 0, volatility: 0.18 }).call

    expect(result.callPrice).toBeCloseTo(call, 2)
    expect(result.participation).toBeCloseTo(result.optionBudget / call, 3)
    const at = (change: number) => result.payoff.find((point) => point.underlyingChange === change)!.payoff
    expect(at(-0.5)).toBe(1000)
    expect(at(0)).toBe(1000)
    expect(at(0.6)).toBeCloseTo(1000 + result.participation * 600, 1)
})

test("capital garanti : garantie 100 % avec un taux nul, budget négatif : refusé", () => {
    expect(() => priceCapitalGuaranteed({ ...guaranteed, rate: 0, maturityYears: 1 })).toThrow("Option budget")
})

test("capital garanti : garantie plus basse, participation plus forte", () => {
    expect(priceCapitalGuaranteed({ ...guaranteed, guarantee: 0.9 }).participation).toBeGreaterThan(priceCapitalGuaranteed(guaranteed).participation)
})

test("reverse convertible : obligation moins put, marge = prix client − juste valeur", () => {
    const result = priceReverseConvertible(convertible)
    const bond = result.bricks.find((brick) => brick.type === "BOND")!
    const put = result.bricks.find((brick) => brick.type === "PUT")!

    let expected = 1000 / 1.03 ** 5
    for (let year = 1; year <= 5; year++) expected += 40 / 1.03 ** year
    expect(bond.value).toBeCloseTo(expected, 2)
    expect(put.value).toBeLessThan(0)
    expect(-put.value).toBe(result.putPrice)
    expect(result.fairValue).toBeCloseTo(bond.value + put.value, 2)
    expect(result.margin).toBeCloseTo(1000 - result.fairValue, 2)
})

test("reverse convertible : coupon trop généreux, marge négative ; payoff = capital + coupons moins la baisse", () => {
    expect(priceReverseConvertible({ ...convertible, couponRate: 0.12 }).margin).toBeLessThan(0)
    const at = (change: number) => priceReverseConvertible(convertible).payoff.find((point) => point.underlyingChange === change)!.payoff
    expect(at(0.6)).toBe(1200)
    expect(at(-0.5)).toBe(700)
})

test("autocallable : même graine, même résultat ; briques = juste valeur ; probabilités qui totalisent 1", () => {
    const first = priceAutocallable(autocall, MONTE_CARLO_SEED, 20_000)

    expect(priceAutocallable(autocall, MONTE_CARLO_SEED, 20_000)).toEqual(first)
    expect(first.bricks.reduce((total, { value }) => total + value, 0)).toBeCloseTo(first.fairValue, 2)
    expect(first.standardError).toBeGreaterThan(0)
    expect(first.observations).toHaveLength(4)
    expect(first.observations.map(({ date }) => date)).toEqual(["2027-10-28", "2028-10-28", "2029-10-28", "2030-10-28"])
    expect(first.observations.map(({ cumulativeCoupon }) => cumulativeCoupon)).toEqual([0.06, 0.12, 0.18, 0.24])
    expect(first.observations.reduce((total, { recallProbability }) => total + recallProbability, 0) + first.maturityProbability).toBeCloseTo(1, 3)
    expect(first.recallProbability).toBeCloseTo(1 - first.maturityProbability, 3)
    expect(first.maturityCumulativeCoupon).toBe(0.3)
})

test("autocallable : rappel certain dès l'année 1 (seuil quasi nul) : nominal + 1 coupon actualisé, aucune probabilité à l'échéance", () => {
    const result = priceAutocallable({ ...autocall, recallLevel: 0.0001 }, MONTE_CARLO_SEED, 10_000)

    expect(result.observations[0]!.recallProbability).toBe(1)
    expect(result.maturityProbability).toBe(0)
    expect(result.fairValue).toBeCloseTo((1000 * 1.06) / 1.03, 1)
    expect(result.standardError).toBe(0)
})

test("autocallable : une barrière plus basse protège plus de capital, la juste valeur monte", () => {
    const lowBarrier = priceAutocallable({ ...autocall, protectionBarrier: 0.4 }, MONTE_CARLO_SEED, 20_000)
    const highBarrier = priceAutocallable({ ...autocall, protectionBarrier: 0.8 }, MONTE_CARLO_SEED, 20_000)

    expect(lowBarrier.fairValue).toBeGreaterThan(highBarrier.fairValue)
})

test("autocallable : payoff sans rappel, perte sous la barrière, capital entre barrière et seuil, coupons au-dessus", () => {
    const at = (change: number) => priceAutocallable(autocall, MONTE_CARLO_SEED, 10_000).payoff.find((point) => point.underlyingChange === change)!.payoff

    expect(at(-0.5)).toBe(500)
    expect(at(-0.3)).toBe(1000)
    expect(at(0)).toBe(1300)
})
