import { expect, test } from "bun:test"
import type { AutocallableInput, CapitalGuaranteedInput, ReverseConvertibleInput } from "@azimut/contracts"
import { MONTE_CARLO_SEED, STRUCTURING_MARGIN } from "../constants/pricing.constants"
import { blackScholes } from "../engine/options"
import { priceCapitalGuaranteed, priceReverseConvertible } from "../engine/structured"
import { priceAutocallable } from "../engine/structured-mc"

const common = { underlying: "^STOXX50E", nominal: 1000, maturityYears: 5, rate: 0.03, volatility: 0.18, dividendYield: 0.02, valueDate: "2026-10-28" }
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
    const call = blackScholes({ spot: 1000, strike: 1000, maturityYears: 5, rate: Math.log(1.03), dividendYield: 0.02, volatility: 0.18 }).call

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

test("dividende du sous-jacent : il abaisse le call, donc la participation du capital garanti", () => {
    expect(priceCapitalGuaranteed({ ...guaranteed, dividendYield: 0.04 }).participation).toBeGreaterThan(priceCapitalGuaranteed({ ...guaranteed, dividendYield: 0 }).participation)
    expect(priceReverseConvertible({ ...convertible, dividendYield: 0.04 }).putPrice).toBeGreaterThan(priceReverseConvertible({ ...convertible, dividendYield: 0 }).putPrice)
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
    expect(first.maturityDate).toBe("2031-10-28")
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

const pair = (mode: "WORST_OF" | "BEST_OF" | "AVERAGE", correlation: number) => ({
    mode,
    underlyings: [
        { symbol: "A", spot: 100, volatility: 0.18, dividendYield: 0.02 },
        { symbol: "B", spot: 50, volatility: 0.18, dividendYield: 0.02 },
    ],
    correlations: [
        [1, correlation],
        [correlation, 1],
    ],
})

test("niveaux en prix : un strike en prix redonne le ratio correspondant", () => {
    expect(priceCapitalGuaranteed({ ...guaranteed, callStrike: 1, spot: 4000, callStrikePrice: 4400 })).toEqual(priceCapitalGuaranteed({ ...guaranteed, callStrike: 1.1 }))
    expect(priceReverseConvertible({ ...convertible, putStrike: 1, spot: 80, putStrikePrice: 72 })).toEqual(priceReverseConvertible({ ...convertible, putStrike: 0.9 }))
    const priced = priceAutocallable({ ...autocall, recallLevel: 1, protectionBarrier: 1, spot: 200, recallPrice: 200, protectionBarrierPrice: 120 }, MONTE_CARLO_SEED, 5_000)
    expect(priced).toEqual(priceAutocallable(autocall, MONTE_CARLO_SEED, 5_000))
})

test("spread de financement : le zéro-coupon est escompté plus bas, le budget d'option et la participation baissent", () => {
    const base = priceCapitalGuaranteed(guaranteed)
    const spread = priceCapitalGuaranteed({ ...guaranteed, fundingSpreadBps: 100 })
    const zeroCoupon = (result: typeof base) => result.bricks.find((brick) => brick.type === "ZERO_COUPON")!.value

    expect(priceCapitalGuaranteed({ ...guaranteed, fundingSpreadBps: 0 })).toEqual(base)
    expect(zeroCoupon(spread)).toBeCloseTo(1000 / 1.04 ** 5, 2)
    expect(spread.optionBudget).toBeGreaterThan(base.optionBudget)
    expect(spread.participation).toBeGreaterThan(base.participation)
    expect(priceReverseConvertible({ ...convertible, fundingSpreadBps: 100 }).fairValue).toBeLessThan(priceReverseConvertible(convertible).fairValue)
    expect(priceAutocallable({ ...autocall, fundingSpreadBps: 100 }, MONTE_CARLO_SEED, 5_000).fairValue).toBeLessThan(priceAutocallable(autocall, MONTE_CARLO_SEED, 5_000).fairValue)
})

test("marge cible, capital garanti : le budget d'option suit la marge, la participation baisse quand elle monte", () => {
    const base = priceCapitalGuaranteed(guaranteed)
    const wider = priceCapitalGuaranteed({ ...guaranteed, targetMargin: 0.06 })

    expect(priceCapitalGuaranteed({ ...guaranteed, targetMargin: STRUCTURING_MARGIN })).toEqual(base)
    expect(wider.margin).toBeCloseTo(60, 2)
    expect(wider.participation).toBeLessThan(base.participation)
    expect(() => priceCapitalGuaranteed({ ...guaranteed, maturityYears: 1, targetMargin: 0.05 })).toThrow("Option budget")
})

test("marge cible, reverse convertible : le coupon donne la marge visée, rejouer ce coupon redonne la même marge", () => {
    const result = priceReverseConvertible({ ...convertible, targetMargin: 0.03 })

    expect(result.margin).toBeCloseTo(30, 1)
    expect(result.couponRate).toBeGreaterThan(0)
    expect(priceReverseConvertible({ ...convertible, couponRate: result.couponRate! }).margin).toBeCloseTo(result.margin, 1)
    expect(priceReverseConvertible({ ...convertible, targetMargin: 0.06 }).couponRate!).toBeLessThan(result.couponRate!)
    expect(priceReverseConvertible({ ...convertible, couponRate: 0.04 }).couponRate).toBe(0.04)
    expect(() => priceReverseConvertible({ ...convertible, targetMargin: 0.5 })).toThrow("Target margin unreachable")
})

test("marge cible, autocallable : même tirages, le coupon donne la marge ; marge inatteignable refusée", () => {
    const result = priceAutocallable({ ...autocall, targetMargin: 0.03 }, MONTE_CARLO_SEED, 20_000)

    expect(result.margin).toBeCloseTo(30, 1)
    expect(priceAutocallable({ ...autocall, couponRate: result.couponRate! }, MONTE_CARLO_SEED, 20_000).fairValue).toBe(result.fairValue)
    expect(priceAutocallable({ ...autocall, targetMargin: 0.03 }, MONTE_CARLO_SEED, 20_000)).toEqual(result)
    expect(result.observations[0]!.cumulativeCoupon).toBe(Math.round(result.couponRate! * 1e4) / 1e4)
    expect(() => priceAutocallable({ ...autocall, targetMargin: 0.5 }, MONTE_CARLO_SEED, 5_000)).toThrow("Target margin unreachable")
})

test("autocallable : observation trimestrielle ou semestrielle, dates et coupon mémoire par période", () => {
    const quarterly = priceAutocallable({ ...autocall, observationFrequency: "QUARTERLY" }, MONTE_CARLO_SEED, 5_000)
    expect(quarterly.observations).toHaveLength(19)
    expect(quarterly.observations.slice(0, 5).map(({ date }) => date)).toEqual(["2027-01-28", "2027-04-28", "2027-07-28", "2027-10-28", "2028-01-28"])
    expect(quarterly.observations.slice(0, 5).map(({ year }) => year)).toEqual([1, 1, 1, 1, 2])
    expect(quarterly.observations.slice(0, 3).map(({ cumulativeCoupon }) => cumulativeCoupon)).toEqual([0.015, 0.03, 0.045])
    expect(quarterly.maturityDate).toBe("2031-10-28")
    expect(quarterly.maturityCumulativeCoupon).toBe(0.3)
    expect(quarterly.observations.reduce((total, { recallProbability }) => total + recallProbability, 0) + quarterly.maturityProbability).toBeCloseTo(1, 3)

    const semiAnnual = priceAutocallable({ ...autocall, observationFrequency: "SEMI_ANNUAL", valueDate: "2026-08-31" }, MONTE_CARLO_SEED, 5_000)
    expect(semiAnnual.observations).toHaveLength(9)
    expect(semiAnnual.observations.slice(0, 3).map(({ date }) => date)).toEqual(["2027-02-28", "2027-08-31", "2028-02-29"])
})

test("autocallable : sans coupon mémoire, seul le coupon de la période est versé, la juste valeur baisse", () => {
    const memory = priceAutocallable(autocall, MONTE_CARLO_SEED, 20_000)
    const noMemory = priceAutocallable({ ...autocall, memoryCoupon: false }, MONTE_CARLO_SEED, 20_000)

    expect(priceAutocallable({ ...autocall, memoryCoupon: true }, MONTE_CARLO_SEED, 20_000)).toEqual(memory)
    expect(noMemory.observations.map(({ cumulativeCoupon }) => cumulativeCoupon)).toEqual([0.06, 0.06, 0.06, 0.06])
    expect(noMemory.maturityCumulativeCoupon).toBe(0.06)
    expect(noMemory.fairValue).toBeLessThan(memory.fairValue)
})

test("autocallable : pas de rappel pendant la période de non-rappel", () => {
    const result = priceAutocallable({ ...autocall, recallLevel: 0.0001, nonCallObservations: 2 }, MONTE_CARLO_SEED, 5_000)

    expect(result.observations.map(({ recallProbability }) => recallProbability)).toEqual([0, 0, 1, 0])
    expect(result.fairValue).toBeCloseTo((1000 * (1 + 0.06 * 3)) / 1.03 ** 3, 1)
    expect(priceAutocallable({ ...autocall, nonCallObservations: 2 }, MONTE_CARLO_SEED, 20_000).fairValue).toBeLessThan(priceAutocallable(autocall, MONTE_CARLO_SEED, 20_000).fairValue)
})

test("panier, capital garanti : le call sur le pire titre est moins cher qu'un seul titre, la corrélation le rapproche", () => {
    const single = priceCapitalGuaranteed(guaranteed)
    const lowCorrelation = priceCapitalGuaranteed({ ...guaranteed, basket: pair("WORST_OF", 0.1) })
    const highCorrelation = priceCapitalGuaranteed({ ...guaranteed, basket: pair("WORST_OF", 0.95) })

    expect(lowCorrelation.callPrice).toBeLessThan(highCorrelation.callPrice)
    expect(highCorrelation.callPrice).toBeLessThan(single.callPrice)
    // Deux sous-jacents identiques corrélés à 1 : le pire est le sous-jacent lui-même
    expect(priceCapitalGuaranteed({ ...guaranteed, basket: pair("WORST_OF", 1) }).callPrice).toBeCloseTo(single.callPrice, -1)
    expect(lowCorrelation.participation).toBeGreaterThan(highCorrelation.participation)
    expect(lowCorrelation.correlations).toEqual([[1, 0.1], [0.1, 1]])
    expect(single.correlations).toBeUndefined()
    expect(priceCapitalGuaranteed({ ...guaranteed, basket: pair("WORST_OF", 0.1) })).toEqual(lowCorrelation)
})

test("panier, reverse convertible : le put sur le pire titre est plus cher, donc le coupon visé plus élevé", () => {
    const single = priceReverseConvertible({ ...convertible, targetMargin: 0.03 })
    const worstOf = priceReverseConvertible({ ...convertible, targetMargin: 0.03, basket: pair("WORST_OF", 0.3) })
    const average = priceReverseConvertible({ ...convertible, targetMargin: 0.03, basket: pair("AVERAGE", 0.3) })

    expect(worstOf.putPrice).toBeGreaterThan(single.putPrice)
    expect(worstOf.couponRate!).toBeGreaterThan(single.couponRate!)
    expect(average.putPrice).toBeLessThan(single.putPrice)
})

test("panier, autocallable : worst-of moins cher que le titre seul, la corrélation relève la valeur, même graine même résultat", () => {
    const single = priceAutocallable(autocall, MONTE_CARLO_SEED, 20_000)
    const low = priceAutocallable({ ...autocall, basket: pair("WORST_OF", 0.1) }, MONTE_CARLO_SEED, 20_000)
    const high = priceAutocallable({ ...autocall, basket: pair("WORST_OF", 0.9) }, MONTE_CARLO_SEED, 20_000)

    expect(low.fairValue).toBeLessThan(single.fairValue)
    expect(low.fairValue).toBeLessThan(high.fairValue)
    expect(low.correlations).toEqual([[1, 0.1], [0.1, 1]])
    expect(priceAutocallable({ ...autocall, basket: pair("WORST_OF", 0.1) }, MONTE_CARLO_SEED, 20_000)).toEqual(low)
    expect(() => priceAutocallable({ ...autocall, basket: { ...pair("WORST_OF", 0.9), correlations: [[1, 0.9, 0], [0.9, 1, 0], [0, 0, 1]] } }, MONTE_CARLO_SEED, 1_000)).not.toThrow()
    expect(() => priceAutocallable({ ...autocall, basket: pair("WORST_OF", 1.2) }, MONTE_CARLO_SEED, 1_000)).toThrow("positive semi-definite")
})

